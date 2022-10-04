const router = require('express').Router();
const fs = require('fs-extra');
const models = require('../models/');
const multer = require('multer');
const Jimp = require('jimp');
const dayjs = require('dayjs');

// Config
const globalConf = require('../config/global.js');

// Services
const process_manager = require('../services/process_manager.js');
const {process_server_per_app} = process_manager;
const session_manager = require('../helpers/preview_session.js');

const parser = require('../services/bot.js');
const studio_manager = require('../services/studio_manager');

// Helpers
const app_helper = require('../helpers/application');

// Utils
const middlewares = require('../helpers/middlewares');
const bot = require('../helpers/bot');
const helpers = require('../utils/helpers');
const dataHelper = require('../utils/data_helper');
const gitHelper = require('../utils/git_helper');

const metadata = require('../database/metadata')();
const appProcessing = {};

// No git commit for these instructions
const noGitFunctions = ['restart', 'gitPush', 'gitPull', 'installNodePackage'];

router.get('/preview/:app_name', middlewares.hasAccessApplication, (req, res) => {

	const appName = req.params.app_name;

	// Application starting timeout
	let timeoutServer = 30000;
	if(typeof req.query.timeout !== "undefined")
		timeoutServer = req.query.timeout;

	const currentUserID = req.session.passport.user.id;

	req.session.app_name = appName;
	req.session.module_name = 'm_home';
	req.session.entity_name = null;

	let data = {
		application: metadata.getApplication(appName),
		currentUser: req.session.passport.user,
		code_platform: req.session.code_platform,
		no_footer: true // No footer for preview page
	};

	if ((!appName || appName == '') && typeof process_server_per_app[appName] === 'undefined') {
		req.session.toastr.push({level: "warning", message: "application.not_started"});
		return res.redirect('/module/home');
	}

	app_helper.setChat(req, appName, currentUserID, "Nodea", "chat.welcome", []);

	models.Application.findOne({where: {name: appName}}).then(db_app => {

		const port = 9000 + parseInt(db_app.id);

		if (process_server_per_app[appName] == null || typeof process_server_per_app[appName] === "undefined")
			process_server_per_app[appName] = process_manager.launchChildProcess(req.sessionID, appName, port);

		data.session = session_manager.getSession(req);

		if(globalConf.demo_mode)
			data.session.app_expire = dayjs(db_app.createdAt).diff(dayjs(), 'day') + 7;

		const initialTimestamp = new Date().getTime();
		let iframe_url = globalConf.protocol + '://';

		if (globalConf.env == 'studio'){
			iframe_url = 'https://' + globalConf.sub_domain + '-' + data.application.name.substring(2) + "." + globalConf.dns + '/app/status';
			// Checking .toml file existence, creating it if necessary
			studio_manager.createApplicationDns(appName.substring(2), db_app.id)
		}
		else
			iframe_url += globalConf.host + ":" + port + "/app/status";

		data = app_helper.initPreviewData(appName, data);
		data.chat = req.session.nodea_chats[appName][currentUserID];

		// Check server has started every 50 ms
		console.log('Starting server...');
		process_manager.checkServer(iframe_url, initialTimestamp, timeoutServer).then(_ => {
			data.iframe_url = iframe_url.split("/app/status")[0] + "/module/home";
			// Let's do git init or commit if needed
			gitHelper.doGit(data).then(_ => {
				res.render('front/preview/main', data);
			}).catch(err => {
				console.error(err);
				res.render('front/preview/main', data);
			});
		}).catch(err => {
			console.error(err);

			if(!err)
				err = new Error('An error occured');

			let chatKey = err.message;
			let chatParams = err.messageParams;
			let lastError = helpers.getLastLoggedError(appName);
			// If missing module error
			if(typeof lastError === "string" && lastError.indexOf("Cannot find module") != -1){
				chatKey = "structure.global.restart.missing_module";
				lastError = lastError.split("Cannot find module")[1].replace(/'/g, "").trim();
				chatParams = [lastError, lastError];
			}
			app_helper.setChat(req, appName, currentUserID, "Nodea", chatKey, chatParams, true);
			data.iframe_url = -1;
			res.render('front/preview/main', data);
		});
	}).catch(err => {
		data = app_helper.initPreviewData(appName, data);
		data.code = 500;
		console.error(err);
		res.render('common/error', data);
	});
});

router.post('/preview', middlewares.hasAccessApplication, (req, res) => {

	const appName = req.session.app_name;
	/* Lower the first word for the basic parser json */
	const instruction = dataHelper.prepareInstruction(req.body.instruction);
	const currentUserID = req.session.passport.user.id;
	let data = {
		currentUser: req.session.passport.user,
		code_platform: req.session.code_platform
	};

	(async () => {

		// Update nb_instruction count of the user
		const user = await models.User.findByPk(currentUserID);
		data.nb_instruction = user.nb_instruction ? ++user.nb_instruction : 1
		user.update({
			nb_instruction: data.nb_instruction
		});

		const db_app = await models.Application.findOne({where: {name: appName}});
		const port = 9000 + parseInt(db_app.id);

		const {protocol} = globalConf;
		const {host} = globalConf;
		const timeoutServer = 30000; // 30 sec

		// Current application url
		data.iframe_url = process_manager.childUrl(req, db_app.id);

		/* Add instruction in chat */
		app_helper.setChat(req, appName, currentUserID, req.session.passport.user.login, instruction, []);

		if(appProcessing[appName])
			throw new Error('structure.global.error.alreadyInProcess');
		appProcessing[appName] = true;

		if(parser.parse(instruction).function == 'createNewApplication')
			throw new Error('preview.no_create_app');

		// Executing instruction
		data = await bot.execute(req, instruction, data);

		let appBaseUrl = protocol + '://' + host + ":" + port;
		if(globalConf.env == 'studio')
			appBaseUrl = 'https://' + globalConf.sub_domain + '-' + appName.substring(2) + "." + globalConf.dns;

		// On entity delete, reset child_url to avoid 404
		if (data.function == 'deleteEntity') {
			data.iframe_url = appBaseUrl + "/module/home";
			process_manager.setChildUrl(req.sessionID, appName, "/module/home");
		}

		/* Save an instruction history in the history script in workspace folder */
		if (data.function != 'restart' && data.function != 'deleteApplication') {
			const historyScriptPath = __dirname + '/../workspace/' + appName + '/history_script.nps';
			let historyScript = fs.readFileSync(historyScriptPath, 'utf8');
			historyScript += "\n" + instruction;
			fs.writeFileSync(historyScriptPath, historyScript);
		}

		if (data.function == "deleteApplication") {
			// Kill server
			if(process_server_per_app[appName])
				await process_manager.killChildProcess(process_server_per_app[appName]);
			process_server_per_app[appName] = null;
			data.toRedirect = true;
			data.url = "/"; // Generator home
			req.session.nodea_chats[appName][currentUserID] = {items: []};
			return data;
		}

		// Generator answer
		app_helper.setChat(req, appName, currentUserID, "Nodea", data.message, data.messageParams);

		// If we stop the server manually we loose some stored data, so we just need to redirect.
		if(typeof process_server_per_app[appName] === "undefined"){
			data.toRedirect = true;
			data.url = "/application/preview/" + appName;
			return data;
		}

		if(data.restartServer) {
			// Kill server first
			await process_manager.killChildProcess(process_server_per_app[appName]);
			// Launch a new server instance to reload resources
			process_server_per_app[appName] = process_manager.launchChildProcess(req.sessionID, appName, port);
			console.log('Starting server...');
			await process_manager.checkServer(appBaseUrl + '/app/status', new Date().getTime(), timeoutServer);
		}

		data.session = session_manager.getSession(req);
		data = app_helper.initPreviewData(appName, data);
		data.chat = req.session.nodea_chats[appName][currentUserID];

		// Let's do git init or commit depending the situation
		if (!noGitFunctions.includes(data.function))
			await gitHelper.doGit(data);

		return data;
	})().then(data => {
		appProcessing[appName] = false;
		res.send(data);
	}).catch(err => {

		// Error handling code goes here
		console.error(err);

		// const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line
		// err = __(err.message ? err.message : err, err.messageParams || []);

		// Server timed out handling
		if(err.message == 'preview.server_timeout') {

			// Get last error from app logs
			let lastError = helpers.getLastLoggedError(appName);
			let chatKey = "structure.global.restart.error";
			let chatParams = [lastError];

			// If missing module error
			if(typeof lastError === "string" && lastError.indexOf("Cannot find module") != -1){
				chatKey = "structure.global.restart.missing_module";
				lastError = lastError.split("Cannot find module")[1].replace(/'/g, "").trim();
				chatParams = [lastError, lastError];
			}
			data.iframe_url = -1;
			app_helper.setChat(req, appName, currentUserID, "Nodea", chatKey, chatParams, true);
		} else
			app_helper.setChat(req, appName, currentUserID, "Nodea", err.message ? err.message : err, err.messageParams, true);

		/* Save ERROR an instruction history in the history script in workspace folder */
		if (data.function != 'restart') {
			const historyScriptPath = __dirname + '/../workspace/' + appName + '/history_script.nps';
			let historyScript = fs.readFileSync(historyScriptPath, 'utf8');
			historyScript += "\n//ERROR: " + instruction + " (" + err.message + ")";
			fs.writeFileSync(historyScriptPath, historyScript);
		}

		// Load session values
		data = app_helper.initPreviewData(appName, data);
		data.session = session_manager.getSession(req);
		data.chat = req.session.nodea_chats[appName][currentUserID];

		if(typeof data.iframe_url === 'undefined')
			data.iframe_url = -1;

		appProcessing[appName] = false;
		res.send(data);
	});
});

router.post('/set_logo', middlewares.hasAccessApplication, (req, res) => {
	multer().single('file')(req, res, err => {
		if (err) {
			console.error(err);
			return res.status(500).send(err);
		}

		const configLogo = {
			original: {
				width: 250,
				quality: 100
			},
			thumbnail: {
				width: 30,
				height: 30,
				quality: 60
			}
		};

		const basePath = global.__workspacePath + "/" + req.body.appName + "/app/public/img/logo/";
		fs.mkdirs(basePath, err => {
			if (err) {
				console.error(err);
				return res.status(500).send(err);
			}

			const uploadPath = basePath + req.file.originalname;
			fs.writeFileSync(uploadPath, req.file.buffer);

			// Thumbnail creation
			const thumbnailFolder = basePath + "/thumbnail/";
			fs.mkdirs(basePath, err => {
				if (err) {
					console.error(err);
					return res.status(500).send(err);
				}

				Jimp.read(uploadPath, (err, imgThumb) => {
					if (err) {
						console.error(err);
						return res.status(500).send(err);
					}
					// Resize default image
					imgThumb.resize(configLogo.original.width, Jimp.AUTO).quality(configLogo.original.quality).write(basePath + req.file.originalname);
					// Resize thumbnail image
					imgThumb.resize(configLogo.thumbnail.width, configLogo.thumbnail.height).quality(configLogo.thumbnail.quality).write(thumbnailFolder + req.file.originalname);
					res.json({
						success: true
					});
				});
			});
		});
	});
});

router.post('/delete', middlewares.hasAccessApplication, (req, res) => {
	bot.execute(req, "delete application " + req.body.app_display_name).then(_ => {
		res.status(200).send(true)
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	});
});

module.exports = router;
