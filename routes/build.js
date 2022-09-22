const express = require('express');
const router = express.Router();
const fs = require("fs-extra");
const unzip = require('unzip-stream');
const JSZip = require('jszip');
const multer = require('multer');
const dayjs = require('dayjs');
const jschardet = require('jschardet');
const path = require('path');

const models = require('../models/');
const globalConf = require('../config/global.js');
const code_platform = require('../services/code_platform');
const helpers = require('../utils/helpers');
const middlewares = require('../helpers/middlewares');
const bot = require('../helpers/bot');
const build_helper = require('../helpers/build');
const metadata = require('../database/metadata')();

const structure_application = require('../structure/structure_application');
const mandatoryInstructions = require('../structure/mandatory_instructions');

const app_queue = [];
const pourcent_generation = {};
const script_infos = {};
const script_processing = {
	timeout: dayjs(),
	state: false
};

router.get('/', middlewares.isLoggedIn, function(req, res) {
	(async () => {
		const data = {
			user: req.session.passport.user,
			code_platform_user: null
		};

		// Set ReturnTo URL in cas of unauthenticated users trying to reach a page
		req.session.returnTo = req.protocol + '://' + req.get('host') + req.originalUrl;

		const applications = await models.Application.findAll({
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

		const host = globalConf.host;

		// Get user project for clone url generation
		if(req.session.code_platform && req.session.code_platform.user)
			data.code_platform_user = req.session.code_platform.user;

		const promises = [];
		for (let i = 0; i < applications.length; i++) {
			promises.push((async () => {
				const port = 9000 + parseInt(applications[i].id);
				let app_url = globalConf.protocol + '://' + host + ":" + port + "/";

				const appName = applications[i].name.substring(2);
				if (globalConf.env == 'studio')
					app_url = 'https://' + globalConf.sub_domain + '-' + appName + "." + globalConf.dns + '/';

				applications[i].url = app_url;

				let metadataApp;
				try {
					metadataApp = metadata.getApplication(applications[i].name);
				} catch(err) {
					return;
				}
				applications[i].createdBy = metadataApp.createdBy;

				if (code_platform.config.enabled && data.code_platform_user) {
					let codePlatformProject = null;

					// Missing metadata code plateform info
					if(!metadataApp.repoID) {
						codePlatformProject = await code_platform.getProjectByName(globalConf.host + "-" + applications[i].name.substring(2));
						metadataApp.repoID = codePlatformProject.id;
						metadataApp.codePlatformRepoHTTP = codePlatformProject.http_url_to_repo;
						metadataApp.codePlatformRepoSSH = codePlatformProject.ssh_url_to_repo;
						metadataApp.save();
					} else if(!metadataApp.codePlatformRepoHTTP) {
						try {
							codePlatformProject = await code_platform.getProjectByID(metadataApp.repoID);
							metadataApp.codePlatformRepoHTTP = codePlatformProject.http_url_to_repo;
							metadataApp.codePlatformRepoSSH = codePlatformProject.ssh_url_to_repo;
							metadataApp.save();
						} catch(err){
							console.log("ERROR while retrieving: " + applications[i].name + "(" + metadataApp.repoID + ")");
						}
					} else {
						codePlatformProject = {
							http_url_to_repo: metadataApp.codePlatformRepoHTTP,
							ssh_url_to_repo: metadataApp.codePlatformRepoSSH
						};
					}

					if (codePlatformProject){
						applications[i].repo_url = codePlatformProject.http_url_to_repo;
						applications[i].repo_ssh_url = codePlatformProject.ssh_url_to_repo;
					}
					else
						console.warn("Cannot find code platform project: " + metadataApp.name);
				}
			})())
		}

		await Promise.all(promises);

		data.applications = applications
		data.nb_application = data.applications.length;
		data.version = '';

		if (fs.existsSync(__dirname + "/../public/version.txt"))
			data.version = fs.readFileSync(__dirname + "/../public/version.txt", "utf-8").split("\n")[0];

		return data;
	})().then(data => {
		res.render('front/build/main', data);
	}).catch(err => {
		console.error(err);
		res.render('common/error', {code: 500});
	});
});

// Application
router.post('/application', middlewares.isLoggedIn, (req, res) => {

	if (!req.body.application || req.body.application == "") {
		req.session.toastr = [{
			message: "Missing application name.",
			level: "error"
		}];
		return res.redirect('/module/home');
	}

	if (app_queue.indexOf(req.body.application) == -1) {
		console.log('NOT IN QUEUE');
		req.session.toastr = [{
			message: "You are not in the queue",
			level: "error"
		}];
		return res.redirect('/build#_generate');
	} else if(app_queue.filter(x => x == req.body.application).length > 1) {
		console.log('ALREADY IN QUEUE');
		req.session.toastr = [{
			message: "Someone as already taken your app name or you are already generating it",
			level: "error"
		}];
		return res.redirect('/build#_generate');
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
		instructions.push("set theme " + req.session.defaultTheme);

	// Set home module selected
	instructions.push("select module home");

	(async () => {
		for (let i = 0; i < instructions.length; i++) {
			await bot.execute(req, instructions[i], {}, false); // eslint-disable-line
			pourcent_generation[req.session.passport.user.id] = i == 0 ? 1 : Math.floor(i * 100 / instructions.length);
		}
		metadata.getApplication(req.session.app_name).save();
		await structure_application.initializeApplication(metadata.getApplication(req.session.app_name));

		// Perf indicator
		console.timeEnd(perf_indicator);

		if(app_queue.indexOf(req.body.application) != -1)
			app_queue.splice(app_queue.indexOf(req.body.application), 1);

		res.redirect('/application/preview/' + req.session.app_name);
	})().catch(err => {
		console.error(err);

		// Needed for translation purpose
		const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line

		if(app_queue.indexOf(req.body.application) != -1)
			app_queue.splice(app_queue.indexOf(req.body.application), 1);

		if(err.doNotDeleteApp) {
			req.session.toastr = [{
				message: __(err.message ? err.message : err, err.messageParams || []),
				level: "error"
			}];
			return res.redirect('/build#_generate');
		}

		// Delete application to avoid zombie
		bot.execute(req, `delete application ${req.body.application}`, {}, false).finally(_ => {
			req.session.toastr = [{
				message: __(err.message ? err.message : err, err.messageParams || []),
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

router.get('/get_generation_queue', (req, res) => {
	let app_queue_place;
	if(app_queue.indexOf(req.query.app) == -1)
		app_queue.push(req.query.app);
	else if(req.query.first == 'true')
		app_queue_place = -1;

	// -1 Mean that the application is already in generation with the same or with an other user
	if(app_queue_place != -1)
		app_queue_place = app_queue.indexOf(req.query.app) + 1;

	res.send({
		cpt: app_queue_place
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

			// Generate standard app
			const data = await bot.execute(req, "add application " + req.body.appName);
			const workspacePath = __dirname + '/../workspace/' + data.options.value;
			const oldMetadataObj = JSON.parse(fs.readFileSync(workspacePath + '/config/metadata.json', 'utf8'));
			const newDBConf = fs.readFileSync(workspacePath + '/config/database.js', 'utf8');

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

			// Replace DB config with the generated one
			fs.writeFileSync(workspacePath + '/config/database.js', newDBConf);

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
			const {__} = require("../services/language")(req.session.lang_user); // eslint-disable-line
			infoText += '- An error occured during the process:<br>';
			infoText += __(err.message ? err.message : err, err.messageParams || []);
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

// Script
router.post('/execute_script', middlewares.isLoggedIn, multer({
	dest: './upload/'
}).single('instructions'), (req, res) => {

	const user_id = req.session.passport.user.id;
	const __ = require("../services/language")(req.session.lang_user).__; // eslint-disable-line

	if (app_queue.indexOf('script_user_' + user_id) == -1) {
		console.log('NOT IN QUEUE');
		req.session.toastr = [{
			message: "You are not in the queue",
			level: "error"
		}];
		return res.redirect('/build#_script');
	} else if(app_queue.filter(x => x == 'script_user_' + user_id).length > 1) {
		console.log('ALREADY IN QUEUE');
		req.session.toastr = [{
			message: "Someone as already taken your app name or you are already generating it",
			level: "error"
		}];
		return res.redirect('/build#_script');
	}

	// Init script_infos object for user. (session simulation)
	script_infos[user_id] = {
		over: false,
		answers: [],
		doneInstruction: 0,
		totalInstruction: 0,
		isNewApp: false
	};

	script_processing.state = true;
	script_processing.timeout = dayjs();

	// Get file extension
	let extensionFile = req.file.originalname.split(".");
	extensionFile = extensionFile[extensionFile.length - 1];
	// Read file to determine encoding
	const encoding = jschardet.detect(fs.readFileSync(req.file.path));
	const acceptedEncoding = ['utf-8', 'windows-1252', 'ascii'];
	// If extension or encoding is not supported, send error
	if (extensionFile != 'txt' && extensionFile != 'nps' || acceptedEncoding.indexOf(encoding.encoding.toLowerCase()) == -1) {
		script_infos[user_id].answers.push({
			message: "File need to have .nps or .txt extension and utf8 or ascii encoding.<br>Your file have '"+extensionFile+"' extension and '"+encoding.encoding+"' encoding"
		});
		build_helper.scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing);
		return res.end();
	}

	// Answer to client, next steps will be handle in ajax
	res.end();

	try {
		build_helper.executeFile(req, user_id, __, script_infos, script_processing).then(_ => {
			if(app_queue.indexOf('script_user_' + user_id) != -1)
				app_queue.splice(app_queue.indexOf('script_user_' + user_id), 1);
		});
	} catch (err) {
		if(app_queue.indexOf('script_user_' + user_id) != -1)
			app_queue.splice(app_queue.indexOf('script_user_' + user_id), 1);
		console.error(err);
		return build_helper.scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing);
	}
});

router.post('/execute_script_alt', middlewares.isLoggedIn, function(req, res) {

	const user_id = req.session.passport.user.id;
	const __ = require("../services/language")(req.session.lang_user).__; // eslint-disable-line

	if (app_queue.indexOf('script_user_' + user_id) == -1) {
		console.log('NOT IN QUEUE');
		req.session.toastr = [{
			message: "You are not in the queue",
			level: "error"
		}];
		return res.redirect('/build#_script');
	} else if(app_queue.filter(x => x == 'script_user_' + user_id).length > 1) {
		console.log('ALREADY IN QUEUE');
		req.session.toastr = [{
			message: "Someone as already taken your app name or you are already generating it",
			level: "error"
		}];
		return res.redirect('/build#_script');
	}

	// Init script_infos object for user. (session simulation)
	script_infos[user_id] = {
		over: false,
		answers: [],
		doneInstruction: 0,
		totalInstruction: 0,
		isNewApp: false
	};

	script_processing.state = true;
	script_processing.timeout = dayjs();

	const tmpFilename = dayjs().format('YY-MM-DD-HH_mm_ss') + "_custom_script.nps";
	const tmpPath = __dirname + '/../upload/' + tmpFilename;

	// Load template script and unzip master file if application is created using template
	const templateEntry = req.body.template_entry;
	fs.openSync(tmpPath, 'w');

	if(templateEntry){
		let templateLang;
		switch(req.session.lang_user.toLowerCase()) {
			case "fr-fr":
				templateLang = "fr";
				break;
			case "en-en":
				templateLang = "en";
				break;
			default:
				templateLang = "fr";
				break;
		}

		const files = fs.readdirSync(__dirname + "/../templates/" + templateEntry);
		let filename = false;

		for (let i = 0; i < files.length; i++)
			if (files[i].indexOf(".nps") != -1)
				if (!filename)
					filename = path.join(__dirname + "/../templates/" + templateEntry, files[i]);
				else if (files[i].indexOf("_" + templateLang + "_") != -1)
					filename = path.join(__dirname + "/../templates/" + templateEntry, files[i]);

		if(!filename){
			script_infos[user_id].answers = [{
				message: __('template.no_script')
			}];
			build_helper.scriptGeneratingEnd(null, user_id, script_infos, script_processing);
			return res.end();
		}

		// Write template script in the tmpPath
		fs.writeFileSync(tmpPath, fs.readFileSync(filename));
	} else
		fs.writeFileSync(tmpPath, req.body.text);

	// Answer to client, next steps will be handle in ajax
	res.end();

	try {
		req.file = {
			path: tmpPath
		};
		build_helper.executeFile(req, user_id, __, script_infos, script_processing).then(_ => {
			if(app_queue.indexOf('script_user_' + user_id) != -1)
				app_queue.splice(app_queue.indexOf('script_user_' + user_id), 1);
		});
	} catch (err) {
		if(app_queue.indexOf('script_user_' + user_id) != -1)
			app_queue.splice(app_queue.indexOf('script_user_' + user_id), 1);
		console.error(err);
		return build_helper.scriptGeneratingEnd(null, user_id, script_infos, script_processing);
	}
});

router.get('/script_status', (req, res) => {
	try {
		const user_id = req.session.passport.user.id;
		res.send(script_infos[user_id]).end();
		// Clean answers that will be shown in the client
		if(!script_infos[user_id])
			return;
		script_infos[user_id].answers = [];
		if(script_infos[user_id].over)
			delete script_infos[user_id];
	} catch(err) {
		console.error(err);
		res.send({
			skip: true
		}).end();
	}
});

module.exports = router;
