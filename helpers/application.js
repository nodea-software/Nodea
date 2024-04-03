const moment = require('moment');

const helpers = require('../utils/helpers');
const metadata = require('../database/metadata')();

// Exclude from Editor
const excludeFolder = ["node_modules", "sql", "services", "upload", ".git"];
const excludeFile = [".git_keep", "database.js", "global.js", "icon_list.json", "webdav.js", "package-lock.json", "jsdoc.conf.json", ".eslintignore", ".eslintrc.json"];
// Exclude from UI Editor
const excludeUIEditor = ['e_role', 'e_group', 'e_api_credentials', 'e_translation', 'e_media', 'e_action', 'e_robot', 'e_task', 'e_documents_task', 'e_media_mail', 'e_media_notification', 'e_media_sms', 'e_media_task', 'e_execution', 'e_process', 'e_program', 'e_page', 'e_notification', 'e_inline_help', 'e_user_guide', 'e_document_template', 'e_image_ressources'];
// Config
const global_conf = require('../config/global.js');
const studio_manager = require('../services/studio_manager');
const process_manager = require('../services/process_manager.js');
const {process_server_per_app} = process_manager;
const fs = require('fs-extra');

exports.initPreviewData = (appName, data) => {
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

exports.setChat = (req, app_name, user_id, user, content, params, isError) => {
	// Init if necessary
	if(!req.session.nodea_chats)
		req.session.nodea_chats = {};
	if(!req.session.nodea_chats[app_name])
		req.session.nodea_chats[app_name] = {};
	if(!req.session.nodea_chats[app_name][user_id])
		req.session.nodea_chats[app_name][user_id] = {items: []};

	// Add chat
	if(content != "chat.welcome" || req.session.nodea_chats[app_name][user_id].items.length < 1)
		req.session.nodea_chats[app_name][user_id].items.push({
			user: user,
			dateEmission: moment().tz('Europe/Paris').format("DD MMM HH:mm"),
			content: content,
			params: params || [],
			isError: isError || false
		});
}

exports.launchApplication = async (app_name, db_app, sessionID, timeout) => {
	try {
		// Check server has started every 50 ms
		console.log(`Starting server ${app_name}...`);

		const port = 9000 + parseInt(db_app.id);
		if (process_server_per_app[app_name] == null || typeof process_server_per_app[app_name] === "undefined")
			process_server_per_app[app_name] = process_manager.launchChildProcess(sessionID, app_name, port);

		let iframe_url = global_conf.protocol + '://' + global_conf.host + ":" + port;
		if (global_conf.env == 'studio') {
			iframe_url = 'https://' + global_conf.sub_domain + '-' + app_name.substring(2) + "." + global_conf.dns;
			// Checking .toml file existence, creating it if necessary
			studio_manager.createApplicationDns(app_name.substring(2), db_app.id)
		}

		const initial_timestamp = new Date().getTime();
		const timeout_server = timeout ?? 30000;
		await process_manager.checkServer(iframe_url + "/app/status", initial_timestamp, timeout_server);
		return iframe_url;
	} catch(err) {
		console.error(err);
		return false;
	}
}

exports.checkJSDOC = (app_name) => {
	const result = {
		jsdoc_app: false,
		jsdoc_core: false
	};

	const app_path = __dirname + '/../workspace/' + app_name;

	try {
		result.jsdoc_app = fs.existsSync(app_path + '/docs_app');
		result.jsdoc_core = fs.existsSync(app_path + '/docs_core');
		return result;
	} catch(err) {
		console.error(err);
		return result;
	}
}