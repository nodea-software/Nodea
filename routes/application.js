const router = require('express').Router();
const fs = require('fs-extra');
const models = require('../models/');
const multer = require('multer');
const Jimp = require('jimp');
const unzip = require('unzip-stream');
const JSZip = require('jszip');
const moment = require('moment');
const dayjs = require('dayjs');

// Config
const globalConf = require('../config/global.js');

// Services
const process_manager = require('../services/process_manager.js');
const {process_server_per_app} = process_manager;
const session_manager = require('../services/session.js');

const parser = require('../services/bot.js');
const studio_manager = require('../services/studio_manager');

// Utils
const middlewares = require('../helpers/middlewares');
const bot = require('../helpers/bot');
const helpers = require('../utils/helpers');
const dataHelper = require('../utils/data_helper');
const gitHelper = require('../utils/git_helper');

const metadata = require('../database/metadata')();
const structure_application = require('../structure/structure_application');
const pourcent_generation = {};
const appProcessing = {};
const app_queue = [];

// Exclude from Editor
const excludeFolder = ["node_modules", "sql", "services", "upload", ".git"];
const excludeFile = [".git_keep", "database.js", "global.js", "icon_list.json", "webdav.js", "package-lock.json", "jsdoc.conf.json", ".eslintignore", ".eslintrc.json"];

// No git commit for these instructions
const noGitFunctions = ['restart', 'gitPush', 'gitPull', 'installNodePackage'];

// Exclude from UI Editor
const excludeUIEditor = ['e_role', 'e_group', 'e_api_credentials', 'e_translation', 'e_media', 'e_action', 'e_robot', 'e_task', 'e_documents_task', 'e_media_mail', 'e_media_notification', 'e_media_sms', 'e_media_task', 'e_execution', 'e_process', 'e_program', 'e_page', 'e_notification', 'e_inline_help', 'e_user_guide', 'e_document_template', 'e_image_ressources'];

const mandatoryInstructions = require('../structure/mandatory_instructions');

function initPreviewData(appName, data){
	// Editor
	const workspacePath = __dirname + "/../workspace/" + appName + "/";
	const folder = helpers.readdirSyncRecursive(workspacePath, excludeFolder, excludeFile);
	/* Sort folder first, file after */
	data.workspaceFolder = helpers.sortEditorFolder(folder);

	const application = metadata.getApplication(appName);
	const {modules} = application;

	// UI designer entity list
	data.entities = [];
	for (let i = 0; i < modules.length; i++)
		for (let j = 0; j < modules[i].entities.length; j++)
			if(!excludeUIEditor.includes(modules[i].entities[j].name) && !modules[i].entities[j].name.includes('_history_'))
				data.entities.push(modules[i].entities[j]);

	function sortEntities(entities, idx) {
		if (entities.length == 0 || !entities[idx+1])
			return entities;
		if (entities[idx].name > entities[idx+1].name) {
			const swap = entities[idx];
			entities[idx] = entities[idx+1];
			entities[idx+1] = swap;
			return sortEntities(entities, idx == 0 ? 0 : idx-1);
		}
		return sortEntities(entities, idx+1);
	}
	data.entities = sortEntities(data.entities, 0);
	return data;
}

function setChat(req, app_name, userID, user, content, params, isError){
	// Init if necessary
	if(!req.session.nodea_chats)
		req.session.nodea_chats = {};
	if(!req.session.nodea_chats[app_name])
		req.session.nodea_chats[app_name] = {};
	if(!req.session.nodea_chats[app_name][userID])
		req.session.nodea_chats[app_name][userID] = {items: []};

	// Add chat
	if(content != "chat.welcome" || req.session.nodea_chats[app_name][userID].items.length < 1)
		req.session.nodea_chats[app_name][userID].items.push({
			user: user,
			dateEmission: moment().tz('Europe/Paris').format("DD MMM HH:mm"),
			content: content,
			params: params || [],
			isError: isError || false
		});
}

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

	setChat(req, appName, currentUserID, "Nodea", "chat.welcome", []);

	models.Application.findOne({where: {name: appName}}).then(db_app => {

		const port = 9000 + parseInt(db_app.id);

		if (process_server_per_app[appName] == null || typeof process_server_per_app[appName] === "undefined")
			process_server_per_app[appName] = process_manager.launchChildProcess(req.sessionID, appName, port);

		data.session = session_manager.getSession(req);

		if(globalConf.demo_mode)
			data.session.app_expire = dayjs(db_app.createAt).diff(dayjs(), 'day') + 7;

		const initialTimestamp = new Date().getTime();
		let iframe_url = globalConf.protocol + '://';

		if (globalConf.env == 'studio'){
			iframe_url = 'https://' + globalConf.sub_domain + '-' + data.application.name.substring(2) + "." + globalConf.dns + '/app/status';
			// Checking .toml file existence, creating it if necessary
			studio_manager.createApplicationDns(appName.substring(2), db_app.id)
		}
		else
			iframe_url += globalConf.host + ":" + port + "/app/status";

		data = initPreviewData(appName, data);
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
			setChat(req, appName, currentUserID, "Nodea", chatKey, chatParams, true);
			data.iframe_url = -1;
			res.render('front/preview/main', data);
		});
	}).catch(err => {
		data = initPreviewData(appName, data);
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
		setChat(req, appName, currentUserID, req.session.passport.user.login, instruction, []);

		if(appProcessing[appName])
			throw new Error('structure.global.error.alreadyInProcess');
		appProcessing[appName] = true;

		if(parser.parse(instruction).function == 'createNewApplication')
			throw new Error('preview.no_create_app');

		const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line

		// Executing instruction
		data = await bot.execute(req, instruction, __, data);

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
		setChat(req, appName, currentUserID, "Nodea", data.message, data.messageParams);

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
		data = initPreviewData(appName, data);
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
			setChat(req, appName, currentUserID, "Nodea", chatKey, chatParams, true);
		} else
			setChat(req, appName, currentUserID, "Nodea", err.message ? err.message : err, err.messageParams, true);

		/* Save ERROR an instruction history in the history script in workspace folder */
		if (data.function != 'restart') {
			const historyScriptPath = __dirname + '/../workspace/' + appName + '/history_script.nps';
			let historyScript = fs.readFileSync(historyScriptPath, 'utf8');
			historyScript += "\n//ERROR: " + instruction + " (" + err.message + ")";
			fs.writeFileSync(historyScriptPath, historyScript);
		}

		// Load session values
		data = initPreviewData(appName, data);
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

		const basePath = __workspacePath + "/" + req.body.appName + "/app/public/img/logo/";
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
	const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line
	bot.execute(req, "delete application " + req.body.app_name, __).then(_ => {
		res.status(200).send(true);
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	});
});

// Simple application creation
router.post('/initiate', middlewares.isLoggedIn, (req, res) => {

	if (req.body.application == "") {
		req.session.toastr = [{
			message: "Missing application name.",
			level: "error"
		}];
		return res.redirect('/module/home');
	}

	if (globalConf.demo_mode && app_queue.indexOf(req.body.application) == -1) {
		console.log('NOT IN QUEUE');
		req.session.toastr = [{
			message: "You are not in the queue",
			level: "error"
		}];
		return res.redirect('/');
	}

	// Performance indicator
	const perf_indicator = 'app_init_' + Date.now();
	console.time(perf_indicator);

	// Increase default timeout to 2min for app generation
	req.setTimeout(60000 * 2);

	pourcent_generation[req.session.passport.user.id] = 1;

	const instructions = [
		"create application " + req.body.application,
		...mandatoryInstructions
	];

	// Set default theme if different than blue-light
	if(typeof req.session.defaultTheme !== "undefined" && req.session.defaultTheme != "blue-light")
		instructions.push("set theme "+req.session.defaultTheme);

	// Set home module selected
	instructions.push("select module home");

	// Needed for translation purpose
	const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line

	(async () => {
		for (let i = 0; i < instructions.length; i++) {
			await bot.execute(req, instructions[i], __, {}, false); // eslint-disable-line
			pourcent_generation[req.session.passport.user.id] = i == 0 ? 1 : Math.floor(i * 100 / instructions.length);
		}
		metadata.getApplication(req.session.app_name).save();
		await structure_application.initializeApplication(metadata.getApplication(req.session.app_name));

		// Perf indicator
		console.timeEnd(perf_indicator);

		if (globalConf.demo_mode)
			app_queue.shift();

		res.redirect('/application/preview/' + req.session.app_name);
	})().catch(err => {
		console.error(err);

		if (globalConf.demo_mode)
			app_queue.shift();

		// Delete application
		bot.execute(req, `delete application ${req.body.application}`, __, {}, false).finally(_ => {
			req.session.toastr = [{
				message: err,
				level: "error"
			}];
			return res.redirect('/build#_generate');
		});
	});
});

router.get('/get_pourcent_generation', (req, res) => {
	res.json({
		pourcent: pourcent_generation[req.session.passport.user.id]
	});
});

router.post('/import', middlewares.disableInDemo, middlewares.isLoggedIn, (req, res) => {
	multer().fields([{
		name: 'zipfile',
		maxCount: 1
	}, {
		name: 'sqlfile',
		maxCount: 1
	}])(req, res, err => {
		if (err)
			console.error(err);

		let infoText = '';

		(async() => {
			const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line

			// Generate standard app
			const data = await bot.execute(req, "add application " + req.body.appName, __);
			const workspacePath = __dirname + '/../workspace/' + data.options.value;
			const oldMetadataObj = JSON.parse(fs.readFileSync(workspacePath + '/config/metadata.json', 'utf8'));

			// Delete generated workspace folder
			helpers.rmdirSyncRecursive(workspacePath);
			fs.mkdirsSync(workspacePath);

			const tmpArchiveFilename = 'import_archive_' + new Date().getTime() + '.zip';

			// Write zip file to system
			fs.writeFileSync(__dirname + '/../workspace/' + tmpArchiveFilename, req.files['zipfile'][0].buffer);
			// Extract zip file content
			await new Promise((resolve, reject) => {
				fs.createReadStream(__dirname + '/../workspace/' + tmpArchiveFilename)
					.pipe(unzip.Extract({path: workspacePath}))
					.on('close', resolve).on('error', reject);
			});
			// Delete temporary zip file
			fs.unlinkSync(__dirname + '/../workspace/' + tmpArchiveFilename);
			// Remove copied .git
			helpers.rmdirSyncRecursive(workspacePath + '/.git');

			let oldAppName = false, oldAppDisplayName = false;
			let metadataContent = fs.readFileSync(workspacePath + '/config/metadata.json', 'utf8');
			let metadataContentObj = JSON.parse(metadataContent);

			oldAppName = Object.keys(metadataContentObj)[0];
			if (!oldAppName) {
				infoText += '- Unable to find metadata.json in .zip.<br>';
				return null;
			}

			oldAppDisplayName = metadataContentObj[oldAppName].displayName;
			const appNameRegex = new RegExp(oldAppName, 'g');
			const appDisplayNameRegex = new RegExp(oldAppDisplayName, 'g');

			// Need to modify so file content to change appName in it
			metadataContent = metadataContent.replace(appNameRegex, data.options.value);
			metadataContent = metadataContent.replace(appDisplayNameRegex, data.options.showValue);

			// Update variable
			metadataContentObj = JSON.parse(metadataContent);

			// Replace repo URL in metadata.json
			metadataContentObj[data.options.value].repoID = oldMetadataObj[data.options.value].repoID;
			metadataContentObj[data.options.value].codePlatformRepoHTTP = oldMetadataObj[data.options.value].codePlatformRepoHTTP;
			metadataContentObj[data.options.value].codePlatformRepoSSH = oldMetadataObj[data.options.value].codePlatformRepoSSH;

			fs.writeFileSync(workspacePath + '/config/metadata.json', JSON.stringify(metadataContentObj, null, 4));

			// Replace ap name in config/database.js
			let databaseConfig = fs.readFileSync(workspacePath + '/config/database.js', 'utf8');
			databaseConfig = databaseConfig.replace(appNameRegex, data.options.value);
			fs.writeFileSync(workspacePath + '/config/database.js', databaseConfig);

			infoText += '- The application is ready to be launched.<br>';

			await helpers.exec('npm install', ['module-alias'], workspacePath);

			// Executing SQL file if exist
			if(typeof req.files['sqlfile'] === 'undefined')
				return data.options.value;

			// Saving tmp sql file
			const sqlFilePath = __dirname + '/../sql/' + req.files['sqlfile'][0].originalname;
			fs.writeFileSync(sqlFilePath, req.files['sqlfile'][0].buffer);

			// Getting workspace DB conf
			const dbConfig = require(workspacePath + '/config/database'); // eslint-disable-line

			try {
				await helpers.exec('mysql', [
					"-u",
					dbConfig.user,
					"-p" + dbConfig.password,
					dbConfig.database,
					"-h" + dbConfig.host,
					"--default-character-set=utf8",
					"<",
					sqlFilePath
				]);
				infoText += '- The SQL file has been successfully executed.<br>';
			} catch(err) {
				console.error('Error while executing SQL file in the application.');
				console.error(err);
				infoText += '- An error while executing SQL file in the application:<br>';
				infoText += err;
			}

			// Delete tmp sql file
			fs.unlinkSync(sqlFilePath);

			return data.options.value;
		})().then(appName => {
			res.status(200).send({
				infoText: infoText,
				appName: appName
			});
		}).catch(err => {
			console.error(err);
			infoText += '- An error occured during the process:<br>';
			infoText += err;
			res.status(500).send({
				infoText: infoText
			});
		});
	});
});

router.get('/export/:app_name', middlewares.disableInDemo, middlewares.hasAccessApplication, (req, res) => {
	// We know what directory we want
	const workspacePath = __dirname + '/../workspace/' + req.params.app_name;

	const zip = new JSZip();
	const excludedFiles = ['/config/access.json', '/node_modules/'];
	helpers.buildZipFromDirectory(workspacePath, zip, workspacePath, excludedFiles);

	// Generate zip file content
	zip.generateAsync({
		type: 'nodebuffer',
		comment: 'ser-web-manangement',
		compression: "DEFLATE",
		compressionOptions: {
			level: 9
		}
	}).then(zipContent => {

		// Create zip file
		fs.writeFileSync(workspacePath + '.zip', zipContent);
		res.download(workspacePath + '.zip', req.params.app_name + '.zip', err => {
			if(err)
				console.error(err);
			fs.unlinkSync(workspacePath + '.zip')
		});
	});
});

router.get('/generate_demo', middlewares.onlyInDemo, async (req, res) => {

	// Check if user has already an application, if yes redirect to it
	const application = await models.Application.findOne({
		order: [['id', 'DESC']],
		include: [{
			model: models.User,
			as: "users",
			where: {
				id: req.session.passport.user.id
			},
			required: true
		}]
	});

	if(application)
		return res.redirect('/application/preview/' + application.name);

	// Generate his first application
	res.render('front/waiting_demo', {
		app_name: 'demo_' + req.session.passport.user.id + '_' + Date.now()
	});
});

router.get('/get_generation_queue', (req, res) => {
	console.log(req.query.app, app_queue.length, app_queue);
	if(app_queue.indexOf(req.query.app) == -1)
		app_queue.push(req.query.app);
	const app_queue_place = app_queue.indexOf(req.query.app) + 1;
	res.send({
		cpt: app_queue_place
	});
});

module.exports = router;
