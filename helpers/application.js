const moment = require('moment');

const helpers = require('../utils/helpers');
const metadata = require('../database/metadata')();

// Exclude from Editor
const excludeFolder = ["node_modules", "sql", "services", "upload", ".git"];
const excludeFile = [".git_keep", "database.js", "global.js", "icon_list.json", "webdav.js", "package-lock.json", "jsdoc.conf.json", ".eslintignore", ".eslintrc.json"];
// Exclude from UI Editor
const excludeUIEditor = ['e_role', 'e_group', 'e_api_credentials', 'e_translation', 'e_media', 'e_action', 'e_robot', 'e_task', 'e_documents_task', 'e_media_mail', 'e_media_notification', 'e_media_sms', 'e_media_task', 'e_execution', 'e_process', 'e_program', 'e_page', 'e_notification', 'e_inline_help', 'e_user_guide', 'e_document_template', 'e_image_ressources'];

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

exports.setChat = (req, app_name, userID, user, content, params, isError) => {
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