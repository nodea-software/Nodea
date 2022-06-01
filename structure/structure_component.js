const fs = require("fs-extra");
const domHelper = require('../helpers/js_dom');
const translateHelper = require("../utils/translate");
const helpers = require("../utils/helpers");
const fieldHelper = require("../helpers/field");
const dust_helper = require("../helpers/dust");
const js_writer = require("../helpers/js_writer");

async function addTab(entity, file, newLi, newTabContent) {
	const $ = await domHelper.read(file);

	// Tabs structure doesn't exist, create it
	let tabs = '';
	let context;
	if ($("#tabs").length == 0) {
		tabs = '\
		<div class="nav-tabs-custom" id="tabs">\n\
			<!--{^hideTab}-->\n\
				<ul class="nav nav-tabs" role="tablist">\n\
					<li class="nav-item">\n\
						<a class="nav-link active" data-toggle="pill" href="#home" role="tab" aria-controls="home" aria-selected="true">\n\
							<!--{#__ key="entity.' + entity + '.label_entity" /}-->\n\
						</a>\n\
					</li>\n\
				</ul>\n\
			<!--{/hideTab}-->\n\
			<div class="tab-content" style="min-height:275px;">\n\
				<div class="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">\n\
				</div>\n\
			</div>\n\
		</div>\n';
		context = $(tabs);
		$("#home", context).append($("#fields"));
	}
	else
		context = $("#tabs");

	// Append created elements to `context` to handle presence of tab or not
	$(".nav-tabs", context).append(newLi);
	$(".tab-content", context).append('<!--{^hideTab}-->');
	$(".tab-content", context).append(newTabContent);
	$(".tab-content", context).append('<!--{/hideTab}-->');
	$('body').empty().append(context);

	return domHelper.write(file, $);
}

function addAccessManagment(appName, urlComponent, urlModule) {
	// Write new data entity to access.json file, within module's context
	const accessPath = __workspacePath + '/' + appName + '/config/access.json';
	const accessLockPath = __workspacePath + '/' + appName + '/config/access.lock.json';
	const accessObject = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
	accessObject[urlModule.toLowerCase()].entities.push({
		name: urlComponent,
		groups: ["admin"],
		actions: {
			create: ["admin"],
			update: ["admin"],
			read: ["admin"],
			delete: ["admin"]
		}
	});
	fs.writeFileSync(accessPath, JSON.stringify(accessObject, null, 4), "utf8");
	fs.writeFileSync(accessLockPath, JSON.stringify(accessObject, null, 4), "utf8");
}

exports.newFileStorage = (data) => {
	const appPath = __workspacePath + '/' + data.application.name + '/app';

	// Add flag in option for loadtab
	const optionFile = JSON.parse(fs.readFileSync(appPath + '/models/options/' + data.entity.name + '.json'));
	for (let i = 0; i < optionFile.length; i++) {
		if(optionFile[i].target != data.options.value)
			continue;

		optionFile[i].isFileStorage = true;
		break;
	}
	fs.writeFileSync(appPath + '/models/options/' + data.entity.name + '.json', JSON.stringify(optionFile, null, 4), 'utf8');

	// Create tab.dust file
	const tabContent = '{>"tabs/file_storage" /}\n';
	fs.writeFileSync(appPath + '/views/' + data.entity.name + '/r_' + data.options.value.substring(2) + '/tab.dust', tabContent);

	// Update default display name in FR
	if(data.options.showValue == "File storage") {
		translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", data.entity.name, 'r_' + data.options.value.substring(2)], "Stockage de documents");
		translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", data.options.value, "label_entity"], "Stockage de documents");
	} else {
		translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", data.entity.name, 'r_' + data.options.value.substring(2)], data.options.showValue);
		translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", data.options.value, "label_entity"], data.options.showValue);
	}

	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", data.options.value, "f_filename"], "Fichier");
	translateHelper.updateLocales(data.application.name, "en-EN", ["entity", data.options.value, "f_filename"], "File");
	return;
}

exports.newAgenda = async (data) => {

	const corePath = __workspacePath + '/' + data.application.name + '/_core';
	const appPath = __workspacePath + '/' + data.application.name + '/app';
	const piecesPath = __dirname + '/pieces/component/agenda';

	const valueComponent = data.options.value;
	const showComponentName = data.options.showValue;
	const urlComponent = data.options.urlValue;

	const valueEvent = "e_" + urlComponent + "_event";
	const valueCategory = "e_" + urlComponent + "_category";

	const urlEvent = valueEvent.substring(2);
	const urlCategory = valueCategory.substring(2);

	// Agenda Route
	{
		const valueEventModel = valueEvent.charAt(0).toUpperCase() + valueEvent.slice(1);
		const valueCategoryModel = valueCategory.charAt(0).toUpperCase() + valueCategory.slice(1);

		const urlRouteAgenda = valueComponent.substring(2);

		// CREATE ROUTE FILE
		let routeTemplate = fs.readFileSync(piecesPath + '/routes/route_agenda.js', 'utf8');

		routeTemplate = routeTemplate.replace(/CODE_NAME_LOWER/g, valueComponent);
		routeTemplate = routeTemplate.replace(/URL_ROUTE/g, urlRouteAgenda);

		routeTemplate = routeTemplate.replace(/CODE_NAME_EVENT_MODEL/g, valueEventModel);
		routeTemplate = routeTemplate.replace(/CODE_NAME_EVENT_URL/g, valueEvent.substring(2));

		routeTemplate = routeTemplate.replace(/CODE_NAME_CATEGORY_MODEL/g, valueCategoryModel);
		routeTemplate = routeTemplate.replace(/CODE_NAME_CATEGORY_URL/g, valueCategory.substring(2));

		fs.writeFileSync(appPath + '/routes/' + valueComponent + '.js', routeTemplate);
	}

	// Agenda view
	{
		// Calendar View
		const componentViewFolder = piecesPath + '/views';
		const viewsFolder = appPath + '/views/' + valueComponent;
		fs.copySync(componentViewFolder, viewsFolder);

		const viewFile = appPath + '/views/' + valueComponent + '/view_agenda.dust';
		const urlEvent = valueEvent.substring(2);

		let viewTemplate = fs.readFileSync(viewFile, 'utf8');
		viewTemplate = viewTemplate.replace(/CODE_NAME_LOWER/g, valueComponent);
		viewTemplate = viewTemplate.replace(/CODE_NAME_EVENT_LOWER/g, valueEvent);
		viewTemplate = viewTemplate.replace(/MODULE_NAME_SHORT/g, data.np_module.name.substring(2));
		viewTemplate = viewTemplate.replace(/MODULE_NAME/g, data.np_module.name);
		viewTemplate = viewTemplate.replace(/URL_ROUTE/g, valueComponent.substring(2));
		viewTemplate = viewTemplate.replace(/URL_EVENT/g, urlEvent);

		fs.writeFileSync(viewFile, viewTemplate);

		// Copy the event view folder
		fs.copySync(piecesPath + '/views_event', appPath + '/views/' + valueEvent);

		// Replace variable in each files
		const fileToReplace = ["show_fields", "create_fields", "update_fields", "create", "update"];

		for (let i = 0; i < fileToReplace.length; i++) {
			const eventFile = appPath + '/views/' + valueEvent + '/' + fileToReplace[i] + '.dust';
			let eventTemplate = fs.readFileSync(eventFile, 'utf8');

			eventTemplate = eventTemplate.replace(/URL_CATEGORY/g, urlCategory);
			eventTemplate = eventTemplate.replace(/CODE_NAME_EVENT_LOWER/g, valueEvent);
			eventTemplate = eventTemplate.replace(/URL_EVENT/g, urlEvent);
			eventTemplate = eventTemplate.replace(/MODULE_NAME/g, data.np_module.name);

			fs.writeFileSync(eventFile, eventTemplate, 'utf8');
		}
	}

	// Agenda js
	{
		const componentjsFile = piecesPath + '/public/js/agenda.js';
		const coreJsFile = corePath + '/public/js/component/agenda.js';
		fs.copySync(componentjsFile, coreJsFile);

		let jsFileContent = fs.readFileSync(coreJsFile, 'utf8');
		jsFileContent = jsFileContent.replace(/URL_ROUTE/g, valueComponent.substring(2));
		fs.writeFileSync(coreJsFile, jsFileContent);
	}

	// Add access managment to Agenda
	addAccessManagment(data.application.name, urlComponent, data.np_module.name.substring(2))
	// Add Event translation
	await translateHelper.writeLocales(data.application.name, "component", valueComponent, showComponentName, data.googleTranslate);

	// FR translation of the component
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "label_entity"], "Événement");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "f_title"], "Titre");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "f_place"], "Lieu");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "f_start_date"], "Date de début");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "f_end_date"], "Date de fin");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "f_all_day"], "Toute la journée");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "r_category"], "Catégorie");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "r_category"], "Catégorie");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueEvent, "r_users"], "Utilisateurs");

	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueCategory, "label_entity"], "Catégorie");
	translateHelper.updateLocales(data.application.name, "fr-FR", ["entity", valueCategory, "f_color"], "Couleur");

	const layoutFileName = appPath + '/views/layout_' + data.np_module.name + '.dust';

	const $ = await domHelper.read(layoutFileName);

	$(`li.nav-item[data-menu='${urlEvent}']`).remove();
	$(`li.nav-item[data-menu='${urlCategory}']`).remove();

	const li = "\
	<li class='nav-item' data-menu='" + valueComponent + "'>\n\
		<a href='#' class='nav-link'>\n\
			<i class='fas fa-calendar-alt nav-icon'></i>\n\
			<p>\n\
				<!--{#__ key=\"component." + valueComponent + ".label_component\" /}-->\n\
				<i class='right fas fa-angle-left'></i>\n\
			</p>\n\
		</a>\n\
		<ul class='nav nav-treeview'>\n\
			<li class='nav-item'>\n\
				<a href='/" + urlComponent + "' class='nav-link'>\n\
					<i class='fa fa-calendar nav-icon'></i>\n\
					<p>\n\
						<!--{#__ key=\"global_component.agenda.menu\" /}-->\n\
					</p>\n\
				</a>\n\
			</li>\n\
			<li class='nav-item'>\n\
				<a href='#' class='nav-link'>\n\
					<i class='fas fa-calendar-day nav-icon'></i>\n\
					<p>\n\
						<!--{#__ key=\"entity." + valueEvent + ".label_entity\" /}-->\n\
						<i class='right fas fa-angle-left'></i>\n\
					</p>\n\
				</a>\n\
				<ul class='nav nav-treeview'>\n\
					<li class='nav-item'>\n\
						<a href='/" + urlEvent + "/create_form' class='nav-link'>\n\
							<i class='fa fa-plus nav-icon'></i>\n\
							<p>\n\
								<!--{#__ key=\"operation.create\" /}-->\n\
								&nbsp;<!--{#__ key=\"entity." + valueEvent + ".label_entity\" /}-->\n\
							</p>\n\
						</a>\n\
					</li>\n\
					<li class='nav-item'>\n\
						<a href='/" + urlEvent + "/list' class='nav-link'>\n\
							<i class='fa fa-list nav-icon'></i>\n\
							<p>\n\
								<!--{#__ key=\"operation.list\" /}-->&nbsp;<!--{#__ key=\"entity." + valueEvent + ".label_entity\" /}-->\n\
							</p>\n\
						</a>\n\
					</li>\n\
				</ul>\n\
			</li>\n\
			<li class='nav-item'>\n\
				<a href='#' class='nav-link'>\n\
					<i class='fa fa-bookmark nav-icon'></i>\n\
					<p>\n\
						<!--{#__ key=\"entity." + valueCategory + ".label_entity\" /}-->\n\
						<i class='right fas fa-angle-left'></i>\n\
					</p>\n\
				</a>\n\
				<ul class='nav nav-treeview'>\n\
					<li class='nav-item'>\n\
						<a href='/" + urlCategory + "/create_form' class='nav-link'>\n\
							<i class='fa fa-plus nav-icon'></i>\n\
							<p>\n\
								<!--{#__ key=\"operation.create\" /}-->&nbsp;<!--{#__ key=\"entity." + valueCategory + ".label_entity\" /}-->\n\
							</p>\n\
						</a>\n\
					</li>\n\
					<li class='nav-item'>\n\
						<a href='/" + urlCategory + "/list' class='nav-link'>\n\
							<i class='fa fa-list nav-icon'></i>\n\
							<p>\n\
								<!--{#__ key=\"operation.list\" /}-->&nbsp;\n\
								<!--{#__ key=\"entity." + valueCategory + ".label_entity\" /}-->\n\
							</p>\n\
						</a>\n\
					</li>\n\
				</ul>\n\
			</li>\n\
		</ul>\n\
	</li>\n";

	// Add new html to document
	$('.nav-sidebar').append(li);

	// Write back to file
	domHelper.write(layoutFileName, $);

	// Clean empty and useless dust helper created by removing <li>
	let layoutContent = fs.readFileSync(layoutFileName, 'utf8');

	// Remove empty dust helper
	layoutContent = layoutContent.replace(/{#entityAccess entity=".+"}\W*{\/entityAccess}/g, "");

	fs.writeFileSync(layoutFileName, layoutContent);
	return true;
}

exports.deleteAgenda = async (data) => {

	const appPath = __workspacePath + '/' + data.application.name + '/app';
	const layoutFileName = appPath + '/views/layout_' + data.np_module.name + '.dust';

	// Remove agenda route
	fs.unlinkSync(appPath + '/routes/' + data.options.value + '.js');

	// Delete views folder
	helpers.rmdirSyncRecursive(appPath + '/views/' + data.options.value);

	const $ = await domHelper.read(layoutFileName);

	$(".nav-item[data-menu='" + data.options.value + "']").remove();
	// Write back to file
	domHelper.write(layoutFileName, $)

	// Clean empty and useless dust helper created by removing <li>
	let layoutContent = fs.readFileSync(layoutFileName, 'utf8');

	// Remove empty dust helper
	layoutContent = layoutContent.replace(/{#entityAccess entity=".+"}\W*{\/entityAccess}/g, "");

	fs.writeFileSync(layoutFileName, layoutContent);
	return true;
}

exports.newStatus = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name;
	const appPath = workspacePath + '/app';
	const source = data.entity.name;

	// Rename history model, options, attributes files and view folder
	fs.renameSync(appPath + '/models/e_' + data.history_table_db_name + '.js', appPath + '/models/e_' + data.history_table + '.js');
	fs.renameSync(appPath + '/models/attributes/e_' + data.history_table_db_name + '.json', appPath + '/models/attributes/e_' + data.history_table + '.json');
	fs.renameSync(appPath + '/models/options/e_' + data.history_table_db_name + '.json', appPath + '/models/options/e_' + data.history_table + '.json');
	fs.renameSync(appPath + '/views/e_' + data.history_table_db_name, appPath + '/views/e_' + data.history_table);
	// Delete useless route, api, test history controllers
	fs.unlinkSync(appPath + '/routes/e_' + data.history_table_db_name + '.js');
	fs.unlinkSync(appPath + '/api/e_' + data.history_table_db_name + '.js');
	fs.unlinkSync(appPath + '/tests/e_' + data.history_table_db_name + '.test.js');

	// Change model name of history table
	let historyModel = fs.readFileSync(appPath + '/models/e_' + data.history_table + '.js', 'utf8');
	historyModel = historyModel.replace(/e_[0-9]+_history_[^.]+\.json/g, 'e_' + data.history_table + '.json');
	// Transform E_6_history_s_alias to E_history_entity_alias
	const historyRegex = new RegExp("E_"+data.history_table_db_name, 'g');
	historyModel = historyModel.replace(historyRegex, "E_"+data.history_table);
	fs.writeFileSync(appPath + '/models/e_' + data.history_table + '.js', historyModel, 'utf8');

	// Add virtual status field to source entity (s_statusName)
	const attributesObj = JSON.parse(fs.readFileSync(appPath + '/models/attributes/' + source + '.json'));
	attributesObj[data.options.value] = {
		type: "VIRTUAL",
		history_table: 'e_' + data.history_table_db_name,
		history_model: 'e_' + data.history_table
	};
	fs.writeFileSync(appPath + '/models/attributes/' + source + '.json', JSON.stringify(attributesObj, null, 4), 'utf8');

	// Replace history table name with history model name in access file
	const access = JSON.parse(fs.readFileSync(workspacePath + '/config/access.json', 'utf8'));
	for (const npsModule in access)
		for (let i = 0; i < access[npsModule].entities.length; i++)
			if (access[npsModule].entities[i].name == data.history_table_db_name)
				access[npsModule].entities[i].name = data.history_table;

	fs.writeFileSync(workspacePath + '/config/access.json', JSON.stringify(access, null, 4), 'utf8');
	fs.writeFileSync(workspacePath + '/config/access.lock.json', JSON.stringify(access, null, 4), 'utf8');

	// Change target of source entity to match history MODEL name (instead of TABLE name)
	const optionsObj = JSON.parse(fs.readFileSync(appPath + '/models/options/' + source + '.json'));
	for (const opt in optionsObj)
		if (optionsObj[opt].target == 'e_' + data.history_table_db_name)
		{optionsObj[opt].target = 'e_' + data.history_table;break;}
	fs.writeFileSync(appPath + '/models/options/' + source + '.json', JSON.stringify(optionsObj, null, 4), 'utf8');

	// Remove useless options on e_status
	const statusModel = JSON.parse(fs.readFileSync(appPath + '/models/options/e_status.json'));
	for (let i = 0; i < statusModel.length; i++)
		if (statusModel[i].target == 'e_' + data.history_table_db_name)
		{statusModel.splice(i, 1);break;}
	fs.writeFileSync(appPath + '/models/options/e_status.json', JSON.stringify(statusModel, null, 4), 'utf8');

	// Remove useless options on e_user (association hasMany with history table needs to be removed)
	const userModel = JSON.parse(fs.readFileSync(appPath + '/models/options/e_user.json'));
	for (let i = 0; i < userModel.length; i++)
		if (userModel[i].target == 'e_' + data.history_table_db_name)
		{userModel.splice(i, 1);break;}
	fs.writeFileSync(appPath + '/models/options/e_user.json', JSON.stringify(userModel, null, 4), 'utf8');

	// Remove useless options in toSync
	const toSync = JSON.parse(fs.readFileSync(appPath + '/models/toSync.json', 'utf8'));
	for (const prop in toSync) {
		if (prop.indexOf('e_status') != -1)
			for (let i = 0; i < toSync[prop].options.length; i++)
				if (toSync[prop].options[i].target.indexOf("_history_") != -1)
					toSync[prop].options.splice(i, 1);

		if (prop.indexOf('_history_') > 0)
			toSync[prop].options = undefined;
	}
	fs.writeFileSync(appPath + '/models/toSync.json', JSON.stringify(toSync, null, 4), 'utf8');

	// Remove useless history tab from Status views
	let $ = await domHelper.read(appPath + "/views/e_status/show_fields.dust")
	const historyId = 'r_' + data.history_table;
	$("#" + historyId + "-click").parent().remove();
	$("#" + historyId).remove();
	domHelper.write(appPath + "/views/e_status/show_fields.dust", $);

	// Replace traduction keys in show_fields
	let show_fieldsFILE = fs.readFileSync(appPath + "/views/" + source + "/show_fields.dust", 'utf8');
	let reg = new RegExp(data.history_table_db_name, 'g');
	show_fieldsFILE = show_fieldsFILE.replace(reg, data.history_table);
	fs.writeFileSync(appPath + "/views/" + source + "/show_fields.dust", show_fieldsFILE, 'utf8');
	const statusAlias = 'r_' + data.options.value.substring(2);
	const statusAliasHTML = 'f_' + data.options.value.substring(2);
	const statusAliasSubstring = statusAlias.substring(2);
	// Customize history tab list
	$ = await domHelper.read(appPath + '/views/e_' + data.history_table + '/list_fields.dust');

	// History list
	{
		// Hide buttons
		$(".main").find("th[data-type=show], th[data-type=update], th[data-type=delete]").attr("data-hidden", "true");

		// Render status column as colored badge
		$("[data-col='"+statusAlias+".f_name']").each(function() {
			$(this).attr('data-type', 'status');
		});

		// Remove id column
		$("[data-field=id]").remove();
		// Add createdAt column in thead/tbody
		const newTh = `<th data-field="createdAt" data-col="createdAt" data-type="datetime"><!--{#__ key="defaults.createdAt"/}--></th>`;

		$(".fields").each(function () {
			$(this).find("th:eq(0)").before(newTh);
		});
	}

	// Change tab.dust of history tab on source entity
	const tabDust = '<br>\n{>"{e_subentity}/list_fields" /}\n<script class="tab-script" type="text/javascript" src="/core/js/tabs/has_many.js"></script>';
	fs.writeFileSync(`${appPath}/views/${source}/r_history_${data.options.urlValue}/tab.dust`, tabDust, 'utf8');

	// LOCALS
	{
		// Change history tab locales
		const localesFR = JSON.parse(fs.readFileSync(appPath + '/locales/fr-FR.json', 'utf8'));
		localesFR.entity['e_' + data.history_table_db_name]['as_r_history_' + data.options.urlValue] = "Historique " + data.options.showValue;
		localesFR.entity['e_' + data.history_table_db_name]['f_comment'] = "Commentaire";
		localesFR.entity['e_' + data.history_table_db_name]['r_modified_by'] = "Modifié par";
		localesFR.entity['e_' + data.history_table_db_name]['as_r_' + data.history_table] = "Historique " + statusAliasSubstring + " " + source.substring(2);
		localesFR.entity['e_' + data.history_table_db_name].label_entity = "Historique " + statusAliasSubstring + " " + source.substring(2);
		// Rename traduction key to use history MODEL value, delete old traduction key
		localesFR.entity['e_' + data.history_table] = localesFR.entity['e_' + data.history_table_db_name];
		localesFR.entity['e_' + data.history_table_db_name] = undefined;
		// Change entity's status tab name for FR (Historique instead of History)
		localesFR.entity[source]['r_history_'+data.options.urlValue] = "Historique "+data.options.showValue;
		fs.writeFileSync(appPath + '/locales/fr-FR.json', JSON.stringify(localesFR, null, 4), 'utf8');

		const localesEN = JSON.parse(fs.readFileSync(appPath + '/locales/en-EN.json', 'utf8'));
		localesEN.entity['e_' + data.history_table_db_name]['as_r_' + data.history_table] = "History " + source.substring(2) + " " + statusAliasSubstring;
		localesEN.entity['e_' + data.history_table_db_name].label_entity = "History " + source.substring(2) + " " + statusAliasSubstring;
		// Rename traduction key to use history MODEL value, delete old traduction key
		localesEN.entity['e_' + data.history_table] = localesEN.entity['e_' + data.history_table_db_name];
		localesEN.entity['e_' + data.history_table_db_name] = undefined;
		fs.writeFileSync(appPath + '/locales/en-EN.json', JSON.stringify(localesEN, null, 4), 'utf8');
	}

	domHelper.write(appPath + '/views/e_' + data.history_table + '/list_fields.dust', $);

	// Replace history traductions with history_table key
	let listFields = fs.readFileSync(appPath + '/views/e_' + data.history_table + '/list_fields.dust', 'utf8');
	reg = new RegExp(data.history_table_db_name, 'g');
	listFields = listFields.replace(reg, data.history_table);
	fs.writeFileSync(appPath + '/views/e_' + data.history_table + '/list_fields.dust', listFields, 'utf8');

	// Display status as a badge instead of an input
	// Also add next status buttons after status field
	$ = await domHelper.read(appPath + '/views/' + source + '/show_fields.dust');
	const statusBadgeHtml = '<br>\n<span class="badge" style="background: {' + statusAlias + '.f_color};">{' + statusAlias + '.f_name}</span>';
	const nextStatusHtml = '\
	<div class="form-group">\n\
		<!--{#' + statusAlias + '.r_children ' + source.substring(2) + 'id=id}-->\n\
			<!--{#checkStatusPermission status=.}-->\n\
				<a data-href="/' + source.substring(2) + '/set_status/{' + source.substring(2) + 'id}/{f_field}/{id}" data-comment="{f_comment}" class="status btn btn-info" style="margin-right: 5px;">\n\
					<!--{^f_button_label}{f_name}{:else}{f_button_label}{/f_button_label}-->\n\
				</a>\n\
			<!--{/checkStatusPermission}-->\n\
		<!--{/' + statusAlias + '.r_children}-->\n\
	</div>\n';

	$("div[data-field='" + statusAliasHTML + "']").find('input').replaceWith(statusBadgeHtml);
	$("div[data-field='" + statusAliasHTML + "']").append(nextStatusHtml);

	// Remove create button
	const historyTabId = "#r_history_" + data.options.urlValue;
	$(historyTabId).find('a.btn-success').remove();
	domHelper.write(appPath + '/views/' + source + '/show_fields.dust', $);

	// Remove status field from update_fields and create_fields
	$ = await domHelper.read(appPath + '/views/' + source + '/create_fields.dust');
	$("div[data-field='" + statusAliasHTML + "']").remove();
	domHelper.write(appPath + '/views/' + source + '/create_fields.dust', $);

	$ = await domHelper.read(appPath + '/views/' + source + '/update_fields.dust');
	$("div[data-field='" + statusAliasHTML + "']").remove();
	domHelper.write(appPath + '/views/' + source + '/update_fields.dust', $);

	// Update list field to show status color in datalist
	$ = await domHelper.read(appPath + '/views/' + source + '/list_fields.dust');
	$("th[data-field='" + statusAlias + "']").each(function () {
		$(this).attr("data-type", "status");
	});
	$("td[data-field='" + statusAlias + "']").attr("data-type", "status");
	$("td[data-field='" + statusAlias + "']").attr("data-color", "{" + statusAlias + ".f_color}");
	domHelper.write(appPath + '/views/' + source + '/list_fields.dust', $)

	return await translateHelper.writeLocales(data.application.name, 'field', source, [data.options.value, data.options.showValue], false)
}

exports.deleteStatus = async (data) => {

	const appPath = __workspacePath + '/' + data.application.name + '/app';

	// Delete history views
	helpers.rmdirSyncRecursive(appPath + '/views/' + data.historyName);
	// Delete history model
	fs.unlinkSync(appPath + '/models/' + data.historyName + '.js');
	fs.unlinkSync(appPath + '/models/attributes/' + data.historyName + '.json');
	fs.unlinkSync(appPath + '/models/options/' + data.historyName + '.json');

	// Add DROP TABLE query in toSync.json
	const toSyncObject = JSON.parse(fs.readFileSync(appPath + '/models/toSync.json', 'utf8'));
	if (typeof toSyncObject.queries !== "object")
		toSyncObject.queries = [];

	toSyncObject.queries.push("DROP TABLE " + data.historyTableName);
	fs.writeFileSync(appPath + '/models/toSync.json', JSON.stringify(toSyncObject, null, 4), 'utf8');

	// Clean attribute status field
	const attributesPath = appPath + '/models/attributes/' + data.entity + '.json';
	const attributes = JSON.parse(fs.readFileSync(attributesPath), 'utf8');
	for(const attribute in attributes)
		if(attribute == data.status_field)
			delete attributes[attribute];
	fs.writeFileSync(attributesPath, JSON.stringify(attributes, null, 4), 'utf8');

	// Clean options
	let options, idxToRemove;
	fs.readdirSync(appPath + '/models/options/').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json').forEach(file => {
		options = JSON.parse(fs.readFileSync(appPath + '/models/options/' + file));
		idxToRemove = [];

		// Looking for option link with history table
		for (let i = 0; i < options.length; i++){
			if(data.fk_status == options[i].foreignKey){
				// Status field relation
				idxToRemove.push(i);
			} else if (options[i].target == data.historyName){
				// History table relation
				idxToRemove.push(i);
			}
		}

		options = options.filter((val, idx) => idxToRemove.indexOf(idx) == -1);

		fs.writeFileSync(appPath + '/models/options/' + file, JSON.stringify(options, null, 4), 'utf8')
	});

	const statusName = data.status_field.substring(2);

	// Remove status from views
	let $ = await domHelper.read(appPath + '/views/' + data.entity + '/show_fields.dust');
	$("div[data-field='f_" + statusName + "']").remove();
	$("a#r_history_" + statusName + "-click").parent().remove();
	$("div#r_history_" + statusName).remove();
	domHelper.write(appPath + '/views/' + data.entity + '/show_fields.dust', $);

	$ = await domHelper.read(appPath + '/views/' + data.entity + '/list_fields.dust');
	$("th[data-field='r_" + statusName + "']").remove();
	domHelper.write(appPath + '/views/' + data.entity + '/list_fields.dust', $);

	// Clean locales
	translateHelper.removeLocales(data.application.name, 'entity', data.historyName);
	translateHelper.removeLocales(data.application.name, 'field', [data.entity, "r_history_" + statusName]);
	translateHelper.removeLocales(data.application.name, 'field', [data.entity, "r_" + statusName]);
	translateHelper.removeLocales(data.application.name, 'field', [data.entity, "s_" + statusName]);

	// Clean access
	const access = JSON.parse(fs.readFileSync(appPath + '/../config/access.lock.json', 'utf8'));
	let idToRemove;
	for (const npsModule in access){
		idToRemove = false;
		for (let i = 0; i < access[npsModule].entities.length; i++)
			if (access[npsModule].entities[i].name == data.historyName.substring(2))
				idToRemove = i;

		if(idToRemove)
			access[npsModule].entities = access[npsModule].entities.filter((x, idx) => idx != idToRemove);
	}
	fs.writeFileSync(appPath + '/../config/access.lock.json', JSON.stringify(access, null, 4), 'utf8');

	return true;
}

exports.setupChat = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name;
	const piecesPath = __piecesPath + '/component/socket';

	// Copy chat files
	fs.copySync(piecesPath + '/chat/js/chat.js', workspacePath + '/core/public/js/component/chat.js');
	fs.copySync(piecesPath + '/chat/helpers/chat.js', workspacePath + '/_core/helpers/chat.js');
	fs.copySync(piecesPath + '/chat/routes/chat.js', workspacePath + '/app/routes/chat.js');

	// Copy chat models
	const chatModels = ['e_channel', 'e_channelmessage', 'e_chatmessage', 'e_user_channel', 'e_user_chat', 'e_chat'];
	for (let i = 0; i < chatModels.length; i++) {
		fs.copySync(piecesPath + '/chat/models/' + chatModels[i] + '.js', workspacePath + '/app/models/' + chatModels[i] + '.js');
	}
	// Copy attributes
	fs.copySync(piecesPath + '/chat/models/attributes/', workspacePath + '/app/models/attributes/');
	// Copy options
	fs.copySync(piecesPath + '/chat/models/options/', workspacePath + '/app/models/options/');

	// Add belongsToMany with e_channel to e_user, belongsToMany with e_user to e_chat
	const userOptions = JSON.parse(fs.readFileSync(workspacePath + '/app/models/options/e_user.json'));
	userOptions.push({
		target: 'e_chat',
		relation: 'belongsToMany',
		foreignKey: 'id_user',
		otherKey: 'id_chat',
		through: 'chat_user_chat',
		as: 'r_chat'
	});
	userOptions.push({
		target: "e_channel",
		relation: "belongsToMany",
		foreignKey: "id_user",
		otherKey: "id_channel",
		through: "chat_user_channel",
		as: "r_user_channel"
	});
	fs.writeFileSync(workspacePath + '/app/models/options/e_user.json', JSON.stringify(userOptions, null, 4), 'utf8')

	// Set socket and chat config to enabled/true
	const appConf = JSON.parse(fs.readFileSync(workspacePath + '/config/application.json'));
	appConf.socket.enabled = true;
	appConf.socket.chat = true;
	fs.writeFileSync(workspacePath + '/config/application.json', JSON.stringify(appConf, null, 4), 'utf8');

	// Add custom user_channel/user_chat columns to toSync file
	// Id will not be used but is required by sequelize to be able to query on the junction table
	const toSync = JSON.parse(fs.readFileSync(workspacePath + '/app/models/toSync.json'));
	toSync['chat_user_channel'] = {
		attributes: {
			id_last_seen_message: {type: 'INTEGER', default: 0},
			id: {
				type: "INTEGER",
				autoIncrement: true,
				primaryKey: true
			}
		},
		force: true
	};
	toSync['chat_user_chat'] = {
		attributes: {
			id_last_seen_message: {type: 'INTEGER', default: 0},
			id: {
				type: "INTEGER",
				autoIncrement: true,
				primaryKey: true
			}
		},
		force: true
	};
	fs.writeFileSync(workspacePath + '/app/models/toSync.json', JSON.stringify(toSync, null, 4), 'utf8');

	// Add chat locales
	const newLocalesEN = JSON.parse(fs.readFileSync(piecesPath + '/chat/locales/en-EN.json'));
	translateHelper.writeTree(data.application.name, newLocalesEN, 'en-EN');
	const newLocalesFR = JSON.parse(fs.readFileSync(piecesPath + '/chat/locales/fr-FR.json'));
	translateHelper.writeTree(data.application.name, newLocalesFR, 'fr-FR');

	// Add chat dust template to main_layout
	const $layout = await domHelper.read(workspacePath + '/app/views/main_layout.dust', true);
	const $chat = await domHelper.read(piecesPath + '/chat/views/chat.dust');

	$layout("#chat-placeholder").html($chat("body")[0].innerHTML);

	domHelper.writeMainLayout(workspacePath + '/app/views/main_layout.dust', $layout);

	return true;
};

exports.newAddress = (data) => {
	// eslint-disable-next-line no-undef
	const workspacePath = __workspacePath + '/' + data.application.name;
	// eslint-disable-next-line no-undef
	const pieces_path = __piecesPath + '/component/address';
	const entity_path = workspacePath + '/app/views/' + data.entity.name;
	const address_path = workspacePath + '/app/views/' + data.options.value;
	// Save default generated as for dust manipulation
	data.options.generated_as = data.options.as;

	// Update options to add address flag
	const relations = JSON.parse(fs.readFileSync(workspacePath + '/app/models/options/' + data.entity.name + '.json', 'utf8'));
	for (const relation of relations) {
		if(relation.as == data.options.as){
			delete relation.structureType;
			relation.component = 'address';
			// Replace alias for default address name, r_address instead of r_address_entity
			if(data.is_default_name) {
				relation.as = 'r_address';
				data.options.as = 'r_address';
			}
		}
	}
	fs.writeFileSync(workspacePath + '/app/models/options/' + data.entity.name + '.json', JSON.stringify(relations, null, 4), 'utf8')

	const search_input = domHelper.read(`${pieces_path}/views/input_label.dust`);
	for(const file of ['create_fields', 'update_fields', 'show_fields']) {
		const $address = domHelper.read(`${address_path}/${file}.dust`);
		let content = search_input.html();
		content = content.replace(/E_ENTITY/g, data.options.value);
		// Optimize bootstrap class display
		$address('div[data-field="f_number"]').removeClass('col-12').addClass('col-xs-12 col-sm-2');
		$address('[data-field]').filter('[data-field="f_street_1"],[data-field="f_street_2"]').removeClass('col-12').addClass('col-xs-12 col-sm-5');
		$address('[data-field]').filter('[data-field="f_postal_code"],[data-field="f_city"],[data-field="f_country"]').removeClass('col-12').addClass('col-xs-12 col-sm-4');
		// Hide Lat and Lon field
		$address('div[data-field="f_lat"]').hide();
		$address('div[data-field="f_lon"]').hide();

		if(file != 'show_fields') {
			// Set readonly label in forms
			$address('input[name="f_label"]').attr('readonly', true);
			// Update name to add alias, needed to differenciate multiple component address on same form
			$address('input').each(function() {
				$address(this).attr('name', data.options.as + '.' + $address(this).attr('name'));
			});
			// Add dynamic search input in component address forms
			$address('#fields').prepend(content);
		}

		domHelper.write(`${address_path}/${file}.dust`, $address);

		// Add component to entity create and update form
		const $entity = domHelper.read(`${entity_path}/${file}.dust`);
		if(file == 'create_fields')
			$entity('#fields').append(`
			<div class="address_component" data-as="${data.options.as}">
				{>"${data.options.value}/${file}"/}
			</div>`);
		else if(file == 'update_fields')
			$entity('#fields').append(`
			<div class="address_component" data-as="${data.options.as}">
				{#${data.options.as}}
					{>"${data.options.value}/${file}"/}
				{/${data.options.as}}
			</div>`);
		domHelper.write(`${entity_path}/${file}.dust`, $entity);
	}

	// Remove default has one tabs in show
	dust_helper.removeDustScopeFromFile(`{#entityAccess entity="${data.options.generated_as.substring(2)}"}`, '{/entityAccess}', `${entity_path}/show_fields.dust`);
	dust_helper.removeDustScopeFromFile('{^hideTab}', '{/hideTab}', `${entity_path}/show_fields.dust`, true);

	// Adding address & map in show
	const $show = domHelper.read(`${entity_path}/show_fields.dust`);
	$show('#fields').append(`
	<div class="col-12 address_component" data-as="${data.options.as}">
		<div class="row">
			<div class="col-xs-12 col-sm-6">
				<label for="f_label">
					<i class="fa fa-map-marked-alt">&nbsp;</i>
					{#__ key="entity.${data.options.value}.label_entity"/}&nbsp;
				</label>
				{#${data.options.as}}
					{>"${data.options.value}/show_fields"/}
				{/${data.options.as}}
			</div>
			<div class="col-xs-12 col-sm-6">
				<div class="address_component_map" id="${data.options.as}_map"></div>
			</div>
		</div>
	</div>`);
	domHelper.write(`${entity_path}/show_fields.dust`, $show);

	// Add address label in entity list
	const newHead = `
		<th data-field="${data.options.as}" data-col="${data.options.as}.f_label" data-type="string">
			<!--{#__ key="entity.${data.options.value}.label_entity"/}-->
		</th>`;
	fieldHelper.updateListFile(entity_path, "list_fields", newHead);

	// Disable create / update form
	const js_to_write = `
		data.res.error(_ => data.res.redirect('/'));
		return false;
	`;
	js_writer.writeInHook(`${workspacePath}/app/routes/${data.options.value}.js`, 'create', 'start', js_to_write);
	js_writer.writeInHook(`${workspacePath}/app/routes/${data.options.value}.js`, 'create_form', 'start', js_to_write);
	js_writer.writeInHook(`${workspacePath}/app/routes/${data.options.value}.js`, 'update', 'start', js_to_write);
	js_writer.writeInHook(`${workspacePath}/app/routes/${data.options.value}.js`, 'update_form', 'start', js_to_write);

	// Remove default has_one tab folder in entity views
	fs.rmdirSync(`${entity_path}/${data.options.generated_as}`, {
		recursive: true,
		force: true
	});
};

exports.removeAddress = (data) => {
	// eslint-disable-next-line no-undef
	const entity_path = __workspacePath + '/' + data.application.name + '/app/views/' + data.entity.name;

	// Cleaning create / update / show forms
	for(const file of ['create_fields', 'update_fields', 'show_fields']) {
		const $entity = domHelper.read(`${entity_path}/${file}.dust`);
		$entity(`.address_component[data-as=${data.options.as}]`).remove();
		domHelper.write(`${entity_path}/${file}.dust`, $entity);
	}

	// Cleaning list
	const $entity_list = domHelper.read(`${entity_path}/list_fields.dust`);
	$entity_list(`th[data-field=${data.options.as}]`).remove();
	domHelper.write(`${entity_path}/list_fields.dust`, $entity_list);
};

exports.createComponentDocumentTemplate = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name;
	const piecesPath = __piecesPath + '/component/document_template/';

	// Update locales
	const langFR = JSON.parse(fs.readFileSync(workspacePath + '/app/locales/fr-FR.json', 'utf8'));
	const langEN = JSON.parse(fs.readFileSync(workspacePath + '/app/locales/en-EN.json', 'utf8'));

	langFR.entity.e_document_template["tab_name_" + data.entity.name] = data.options.showValue == 'Document template' ? 'Modèle de document' : data.options.showValue;
	langEN.entity.e_document_template["tab_name_" + data.entity.name] = data.options.showValue;
	fs.writeFileSync(workspacePath + '/app/locales/fr-FR.json', JSON.stringify(langFR, null, 4), 'utf8');
	fs.writeFileSync(workspacePath + '/app/locales/en-EN.json', JSON.stringify(langEN, null, 4), 'utf8');

	// New entry for source relation view
	const newLi = '\
	<li class="nav-item">\n\
		<a id="r_document_template-click" data-toggle="pill" href="#r_document_template" class="nav-link" role="tab" aria-controls="r_document_template" aria-selected="false">\n\
			<!--{#__ key="entity.e_document_template.tab_name_' + data.entity.name + '" /}-->\n\
		</a>\n\
	</li>';
	let newTabContent = fs.readFileSync(piecesPath + 'views/document_template_tab.dust', 'utf8');
	newTabContent = newTabContent.replace(/ENTITY/g, data.entity.name);
	await addTab(data.entity.name, workspacePath + '/app/views' + '/' + data.entity.name + '/show_fields.dust', newLi, newTabContent);

	return true;
};

exports.deleteComponentDocumentTemplate = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name;
	const $ = await domHelper.read(workspacePath + '/app/views/' + data.entity.name + '/show_fields.dust');

	$('#r_' + data.options.urlValue + '-click').parent().remove(); //remove li tab
	$('#r_' + data.options.urlValue).remove(); //remove tab content div

	// If last tab have been deleted, remove tab structure from view
	if ($(".tab-content .tab-pane").length == 1)
		$("#tabs").replaceWith($("#home").html());

	domHelper.write(workspacePath + '/app/views/' + data.entity.name + '/show_fields.dust', $);
	return true;
}