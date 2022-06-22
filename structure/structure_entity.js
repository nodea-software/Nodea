const fs = require("fs-extra");
const domHelper = require('../helpers/js_dom');
const helpers = require('../utils/helpers');
const translateHelper = require("../utils/translate");

async function addTab(data, file, newLi, newTabContent, target, tabRelation) {

	if (!tabRelation)
		throw new Error("No snake cased relation type provided to add tab folder to source entity");

	//
	// HTML tab creation on source entity
	//
	const $ = await domHelper.read(file);

	// If tabs structure doesn't exist, create it
	let context, tabs;
	if ($("#tabs").length == 0) {
		tabs = '\
		<div class="nav-tabs-custom" id="tabs">\n\
			<!--{^hideTab}-->\n\
				<ul class="nav nav-tabs" role="tablist">\n\
					<li class="nav-item">\n\
						<a class="nav-link active" data-toggle="pill" href="#home" role="tab" aria-controls="home" aria-selected="true">\n\
							<!--{#__ key="entity.' + data.options.source + '.label_entity" /}-->\n\
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
	newLi = '<!--{#entityAccess entity="' + target.substring(2) + '"}-->\n' + newLi + '\n<!--{/entityAccess}-->';
	$(".nav-tabs", context).append(newLi);
	$(".tab-content", context).append('\
		<!--{^hideTab}-->\n\
			<!--{#entityAccess entity="' + target.substring(2) + '"}-->\n\
				' + newTabContent + '\n\
			<!--{/entityAccess}-->\n\
		<!--{/hideTab}-->\n');

	$('body').empty().append(context);

	await domHelper.write(file, $);

	//
	// Tab html files creation
	//
	const workspacePath = `${__dirname}/../workspace/${data.application.name}`;
	const aliasViewPath = `${workspacePath}/app/views/${data.options.source}/${data.options.as}`;
	let tabDust = `{>"tabs/${tabRelation}" defaultJS="true" /}\n`;
	tabDust += `<script class="tab-script" type="text/javascript" src="/core/js/tabs/${tabRelation}.js"></script>`;
	if (tabRelation == 'filestorage')
		tabDust += `<script class="tab-script" type="text/javascript" src="/core/js/tabs/has_many.js"></script>`

	if (!fs.existsSync(aliasViewPath))
		fs.mkdirsSync(aliasViewPath);

	fs.writeFileSync(`${aliasViewPath}/tab.dust`, tabDust, 'utf8');
}

// Create entity associations between the models
exports.setupAssociation = (data) => {

	const workspacePath = __dirname + '/../workspace/' + data.application.name;
	const {
		source,
		target,
		foreignKey,
		as,
		showAs,
		relation,
		through,
		toSync,
		type,
		targetType,
		constraints,
	} = data;

	// SETUP MODEL OPTIONS FILE
	const optionsFileName = workspacePath + '/app/models/options/' + source + '.json';
	const optionsObject = JSON.parse(fs.readFileSync(optionsFileName));

	// If we are generating automatically a key and the alias is already used, then cancel
	for (let i = 0; i < optionsObject.length; i++)
		if(type == "auto_generate" && optionsObject[i].as == as)
			return;

	// Check for other auto_generate keys with same alias, if exist, remove it
	for (let i = 0; i < optionsObject.length; i++)
		if(optionsObject[i].as == as && optionsObject[i].type == "auto_generate")
			optionsObject.splice(i, 1);

	const baseOptions = {target: target, relation: relation};
	baseOptions.foreignKey = foreignKey;
	baseOptions.as = as;
	baseOptions.showAs = showAs;

	if (relation == "belongsToMany") {
		baseOptions.through = through;
		baseOptions.foreignKey = "fk_id_" + source;
		baseOptions.otherKey = "fk_id_" + target;
		if(source == target)
			baseOptions.otherKey += "_bis";
	}

	baseOptions.structureType = "";
	if (typeof targetType !== "undefined")
		baseOptions.targetType = targetType;
	if (type != null)
		baseOptions.structureType = type;

	if (constraints != null && !constraints)
		baseOptions.constraints = constraints;

	// Save using field in related to and related to many fields
	if (typeof data.usingField !== "undefined")
		baseOptions.usingField = data.usingField;

	// Load this association directly in standard route data
	if (typeof data.loadOnStart !== "undefined" && data.loadOnStart)
		baseOptions.loadOnStart = true;

	optionsObject.push(baseOptions);

	if (toSync) {
		// SETUP toSync.json
		const toSyncFileName = workspacePath + '/app/models/toSync.json';
		const toSyncObject = JSON.parse(fs.readFileSync(toSyncFileName));

		if (typeof toSyncObject[source] === "undefined") {
			toSyncObject[source] = {};
			toSyncObject[source].options = [];
		}
		else if (typeof toSyncObject[source].options === "undefined")
			toSyncObject[source].options = [];

		toSyncObject[source].options.push(baseOptions);
		fs.writeFileSync(toSyncFileName, JSON.stringify(toSyncObject, null, 4));
	}

	fs.writeFileSync(optionsFileName, JSON.stringify(optionsObject, null, 4));
	return;
};

exports.selectEntity = async (data) => {
	const layout_path = __dirname + '/../workspace/' + data.application.name + '/app/views/layout_' + data.module.name + '.dust';
	const $ = await domHelper.read(layout_path);

	// Check if entity is a subEntity or not to do the redirection if needed
	if (typeof $('#' + data.entity_name + '_menu_item')[0] !== "undefined")
		return true;
	return false;
};

exports.setupEntity = async (data) => {

	const module_name = data.np_module.name;
	let addInSidebar = true;

	const workspacePath = __dirname + '/../workspace/' + data.application.name;

	let entity_name, entity_url, entity_display_name;
	if (data.function === "createNewHasOne" || data.function === 'createNewHasMany') {
		// Sub entity generation
		entity_name = data.options.target;
		entity_display_name = data.options.showTarget;
		entity_url = data.options.urlTarget;
		addInSidebar = false;
	} else {
		// Simple entity generation
		entity_name = data.options.value;
		entity_display_name = data.options.showValue;
		entity_url = data.options.urlValue;
	}

	const entity_model = entity_name.charAt(0).toUpperCase() + entity_name.toLowerCase().slice(1);

	// CREATE MODEL FILE
	let modelTemplate = fs.readFileSync(global.__piecesPath + '/models/model.js', 'utf8');
	modelTemplate = modelTemplate.replace(/MODEL_NAME_LOWER/g, entity_name);
	modelTemplate = modelTemplate.replace(/MODEL_NAME/g, entity_model);
	modelTemplate = modelTemplate.replace(/TABLE_NAME/g, entity_name);
	fs.writeFileSync(workspacePath + '/app/models/' + entity_name + '.js', modelTemplate);

	// CREATE MODEL ATTRIBUTES FILE
	const baseAttributes = {
		"id": {
			"type": "INTEGER",
			"autoIncrement": true,
			"primaryKey": true
		},
		"version": {
			"type": "INTEGER",
			"defaultValue": 1
		},
		"createdBy": {
			"type": "STRING",
			"defaultValue": null,
			"validate": false
		},
		"updatedBy": {
			"type": "STRING",
			"defaultValue": null,
			"validate": false
		}
	};
	fs.writeFileSync(workspacePath + '/app/models/attributes/' + entity_name + '.json', JSON.stringify(baseAttributes, null, 4));

	// CREATE MODEL OPTIONS (ASSOCIATIONS) FILE
	fs.writeFileSync(workspacePath + '/app/models/options/' + entity_name + '.json', JSON.stringify([], null, 4));

	// CREATE TEST FILE
	let testTemplate = fs.readFileSync(global.__piecesPath + '/tests/entity.test.js', 'utf8');
	testTemplate = testTemplate.replace(/MODEL_NAME/g, entity_model);
	testTemplate = testTemplate.replace(/ENTITY_NAME/g, entity_name);
	testTemplate = testTemplate.replace(/URL_NAME/g, entity_url);
	if (!fs.existsSync(workspacePath + '/app/tests/'))
		fs.mkdirsSync(workspacePath + '/app/tests/');
	fs.writeFileSync(workspacePath + '/app/tests/' + entity_name + '.test.js', testTemplate);

	// CREATE ROUTE FILE
	let routeTemplate = '';
	if(data.options.isParamEntity) {
		routeTemplate = fs.readFileSync(global.__piecesPath + '/routes/param_entity.js', 'utf8');
	} else {
		routeTemplate = fs.readFileSync(global.__piecesPath + '/routes/entity.js', 'utf8');
	}
	routeTemplate = routeTemplate.replace(/ENTITY_NAME/g, entity_name);
	routeTemplate = routeTemplate.replace(/ENTITY_URL_NAME/g, entity_url);
	routeTemplate = routeTemplate.replace(/MODEL_NAME/g, entity_model);
	fs.writeFileSync(workspacePath + '/app/routes/' + entity_name + '.js', routeTemplate);

	// CREATE API FILE
	let apiTemplate = fs.readFileSync(global.__piecesPath + '/api/api_entity.js', 'utf8');
	apiTemplate = apiTemplate.replace(/ENTITY_NAME/g, entity_name);
	apiTemplate = apiTemplate.replace(/MODEL_NAME/g, entity_model);
	fs.writeFileSync(workspacePath + '/app/api/' + entity_name + '.js', apiTemplate);

	// Add entity entry in the application module sidebar
	if(addInSidebar) {
		const fileName = workspacePath + '/app/views/layout_' + module_name + '.dust';
		// Read file and get jQuery instance
		const $ = await domHelper.read(fileName);
		let li = '';

		if(data.options.isParamEntity) {
			// Create new html for param entity
			li += `
				<!--{#entityAccess entity="${entity_url}"}-->
					<li class='nav-item' data-menu="${entity_url}">
						<!--{#actionAccess entity="${entity_url}" action="update"}-->
						<a href='/${entity_url}/update_form?id=1' class="nav-link">
							<i class="nav-icon fa fa-cog"></i>
							<p>
								<!--{#__ key="entity.${entity_name}.label_entity" /}-->
								<i class="right fas fa-angle-right"></i>
							</p>
						</a>
						<!--{/actionAccess}-->
					</li>
				<!--{/entityAccess}-->
			`;
		} else {
			// Create new html for standard entity
			li += `
				<!--{#entityAccess entity="${entity_url}"}-->
					<li class="nav-item" data-menu="${entity_url}">
		                <a href="#" class="nav-link">
		                    <i class="nav-icon fas fa-folder"></i>
		                    <p>
		                        <!--{#__ key="entity.${entity_name}.label_entity" /}-->
		                        <i class="right fas fa-angle-left"></i>
		                    </p>
		                </a>
		                <ul class="nav nav-treeview">
		                	<!--{#actionAccess entity="${entity_url}" action="create"}-->
		                    <li class="nav-item">
		                        <a href="/${entity_url}/create_form" class="nav-link">
		                            <i class="fas fa-caret-right ml-3 mr-2"></i>
		                            <p>
		                            	<!--{#__ key="operation.create" /}-->
		                            </p>
		                        </a>
		                    </li>
		                    <!--{/actionAccess}-->
		                    <!--{#actionAccess entity="${entity_url}" action="read"}-->
		                    <li class="nav-item">
		                        <a href="/${entity_url}/list" class="nav-link">
		                            <i class="fas fa-caret-right ml-3 mr-2"></i>
		                            <p>
		                            	<!--{#__ key="operation.list" /}-->
		                            </p>
		                        </a>
		                    </li>
		                    <!--{/actionAccess}-->
		                </ul>
		            </li>
				<!--{/entityAccess}-->
			`;
		}

		// Add new html to document
		$('.nav-sidebar').append(li);

		// Write back to file
		domHelper.write(fileName, $);
	}

	// Copy CRUD view folder and customize them according to data entity properties
	fs.copySync(global.__piecesPath + '/views/entity', workspacePath + '/app/views/' + entity_name);
	const fileBase = workspacePath + '/app/views/' + entity_name;
	let dustFiles = ["create", "create_fields", "show", "show_fields", "update", "update_fields", "list", "list_fields"];
	if(data.options.isParamEntity)
		dustFiles = ["update", "update_fields"];

	for (let i = 0; i < dustFiles.length; i++) {
		const fileToWrite = fileBase + '/' + dustFiles[i] + ".dust";
		let dustContent = fs.readFileSync(fileToWrite, 'utf8');
		dustContent = dustContent.replace(/custom_module/g, module_name);
		dustContent = dustContent.replace(/custom_entity/g, entity_name);
		dustContent = dustContent.replace(/custom_url_entity/g, entity_url);

		if (module_name != "m_home") {
			// Good indent for dust code
			const htmlToAdd = "<li class='breadcrumb-item'>\n\
					<a href='/module/" + module_name.substring(2) + "'>\n\
						{#__ key=\"module." + module_name + "\"/}\n\
					</a>\n\
				</li>";

			dustContent = dustContent.replace(/<!-- SUB MODULE - DO NOT REMOVE -->/g, htmlToAdd);
		}
		fs.writeFileSync(fileToWrite, dustContent, "utf8");
	}

	// Remove useless dust file if it's a param entity
	// TODO - Generator is not ready to handle entity without all default views

	// if(data.options.isParamEntity) {
	// 	const dustToRemove = ["create.dust", "create_fields.dust", "show.dust", "show_fields.dust", "list.dust", "list_fields.dust"];
	// 	for (let i = 0; i < dustToRemove.length; i++)
	// 		fs.unlinkSync(workspacePath + '/app/views/' + entity_name + '/' + dustToRemove[i]);
	// }

	// Write new data entity to access.json file, within module's context
	const accessPath = workspacePath + '/config/access.json';
	const accessObject = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
	accessObject[module_name.substring(2)].entities.push({
		name: entity_url,
		groups: ["admin"],
		actions: {
			read: ["admin"],
			create: ["admin"],
			delete: ["admin"],
			update: ["admin"]
		}
	});
	fs.writeFileSync(accessPath, JSON.stringify(accessObject, null, 4), "utf8");

	// Separate access.lock.json handlingto avoid filling it with access.json content
	const accessLockPath = workspacePath + '/config/access.lock.json';
	const accessLockObject = JSON.parse(fs.readFileSync(accessLockPath, 'utf8'));
	accessLockObject[module_name.substring(2)].entities.push({
		name: entity_url,
		groups: [],
		actions: {
			read: [],
			create: [],
			delete: [],
			update: []
		}
	});
	fs.writeFileSync(accessLockPath, JSON.stringify(accessLockObject, null, 4), "utf8");

	// Add entity locals
	await translateHelper.writeLocales(data.application.name, "entity", entity_name, entity_display_name, data.googleTranslate);

	return;
};

exports.deleteEntity = async (data) => {
	const baseFolder = __dirname + '/../workspace/' + data.application.name;

	// Delete views folder
	helpers.rmdirSyncRecursive(baseFolder + '/app/views/' + data.entity.name);
	// Delete route file
	fs.unlinkSync(baseFolder + '/app/routes/' + data.entity.name + '.js');
	// Delete API file
	fs.unlinkSync(baseFolder + '/app/api/' + data.entity.name + '.js');
	// Delete model file
	fs.unlinkSync(baseFolder + '/app/models/' + data.entity.name + '.js');
	// Delete options
	fs.unlinkSync(baseFolder + '/app/models/options/' + data.entity.name + '.json');
	// Delete attributes
	fs.unlinkSync(baseFolder + '/app/models/attributes/' + data.entity.name + '.json');

	// Remove relationships in options.json files
	const optionFiles = fs.readdirSync(baseFolder + '/app/models/options/').filter(x => x.indexOf('.json') != -1);
	for (const file in optionFiles) {
		const options = JSON.parse(fs.readFileSync(baseFolder + '/app/models/options/' + optionFiles[file]));
		const optionsCpy = [];
		for (let i = 0; i < options.length; i++)
			if (options[i].target != data.entity.name)
				optionsCpy.push(options[i]);
		if (optionsCpy.length != options.length)
			fs.writeFileSync(baseFolder + '/app/models/options/' + optionFiles[file], JSON.stringify(optionsCpy, null, 4));
	}

	// Clean up access config
	const access = JSON.parse(fs.readFileSync(baseFolder + '/config/access.json', 'utf8'));
	for (let i = 0; i < access[data.np_module.name.substring(2)].entities.length; i++)
		if (access[data.np_module.name.substring(2)].entities[i].name == data.entity.name.substring(2))
			access[data.np_module.name.substring(2)].entities.splice(i, 1);
	fs.writeFileSync(baseFolder + '/config/access.json', JSON.stringify(access, null, 4));

	const accessLock = JSON.parse(fs.readFileSync(baseFolder + '/config/access.lock.json', 'utf8'));
	for (let i = 0; i < accessLock[data.np_module.name.substring(2)].entities.length; i++)
		if (accessLock[data.np_module.name.substring(2)].entities[i].name == data.entity.name.substring(2))
			accessLock[data.np_module.name.substring(2)].entities.splice(i, 1);
	fs.writeFileSync(baseFolder + '/config/access.lock.json', JSON.stringify(accessLock, null, 4));

	// Remove entity entry from layout select
	const filePath = baseFolder + '/app/views/layout_' + data.np_module.name + '.dust';
	const $ = await domHelper.read(filePath);

	$(`li.nav-item[data-menu='${data.entity.name.substring(2)}']`).remove();

	domHelper.write(filePath, $);

	translateHelper.removeLocales(data.application.name, "entity", data.entity.name);
	return true;
};

exports.setupHasManyTab = async (data) => {
	const target = data.options.target;
	const source = data.options.source;
	const urlSource = data.options.urlSource;
	const alias = data.options.as;
	const foreignKey = data.options.foreignKey;
	const showAlias = data.options.showAs;

	/* Add Alias in Translation file for tabs */
	const fileTranslationFR = __dirname + '/../workspace/' + data.application.name + '/app/locales/fr-FR.json';
	const fileTranslationEN = __dirname + '/../workspace/' + data.application.name + '/app/locales/en-EN.json';
	const dataFR = JSON.parse(fs.readFileSync(fileTranslationFR));
	const dataEN = JSON.parse(fs.readFileSync(fileTranslationEN));

	dataFR.entity[source][alias] = showAlias;
	dataEN.entity[source][alias] = showAlias;

	fs.writeFileSync(fileTranslationFR, JSON.stringify(dataFR, null, 4), 'utf8');
	fs.writeFileSync(fileTranslationEN, JSON.stringify(dataEN, null, 4), 'utf8');

	// Setup association tab for show_fields.dust
	const fileBase = __dirname + '/../workspace/' + data.application.name + '/app/views/' + source;
	const file = fileBase + '/show_fields.dust';

	// Create new tab button
	const newLi = '\
		<li class="nav-item">\n\
			<a data-tabtype="hasMany" id="' + alias + '-click" href="#' + alias + '" class="nav-link" data-toggle="pill" role="tab" aria-controls="' + alias + '" aria-selected="false">\n\
				<!--{#__ key="entity.' + source + '.' + alias + '" /}-->\n\
			</a>\n\
		</li>';

	// Create new tab content
	const newTab = '  <div id="' + alias + '" class="ajax-tab tab-pane fade show" role="tabpanel" aria-labelledby="' + alias + '-tab" data-tabType="hasMany" data-asso-alias="' + alias + '" data-asso-foreignkey="' + foreignKey + '" data-asso-flag="{id}" data-asso-source="' + source + '" data-asso-url="' + urlSource + '"><div class="ajax-content sub-tab-table"></div></div>';

	return await addTab(data, file, newLi, newTab, target, 'has_many');
};

exports.setupHasManyPresetTab = async (data) => {

	const source = data.options.source;
	const urlSource = data.options.urlSource;
	const foreignKey = data.options.foreignKey;
	const alias = data.options.as;
	const showAlias = data.options.showAs;

	const workspacePath = __dirname + '/../workspace/' + data.application.name;

	/* Add Alias in Translation file for tabs */
	const fileTranslationFR = workspacePath + '/app/locales/fr-FR.json';
	const fileTranslationEN = workspacePath + '/app/locales/en-EN.json';
	const dataFR = JSON.parse(fs.readFileSync(fileTranslationFR));
	const dataEN = JSON.parse(fs.readFileSync(fileTranslationEN));

	dataFR.entity[source][alias] = showAlias;
	dataEN.entity[source][alias] = showAlias;

	fs.writeFileSync(fileTranslationFR, JSON.stringify(dataFR, null, 4));
	fs.writeFileSync(fileTranslationEN, JSON.stringify(dataEN, null, 4));

	// Setup association tab for show_fields.dust
	const fileBase = workspacePath + '/app/views/' + source;
	const file = fileBase + '/show_fields.dust';

	const newLi = '\
	<li class="nav-item">\n\
		<a data-tabtype="hasManyPreset" id="' + alias + '-click" href="#' + alias + '" class="nav-link" data-toggle="pill" role="tab" aria-controls="' + alias + '" aria-selected="false">\n\
			<!--{#__ key="entity.' + source + '.' + alias + '" /}-->\n\
		</a>\n\
	</li>';

	const newTabContent = '<div id="' + alias + '" class="ajax-tab tab-pane fade show" role="tabpanel" aria-labelledby="' + alias + '-tab" data-tabType="hasManyPreset" data-asso-alias="' + alias + '" data-asso-foreignkey="' + foreignKey + '" data-asso-flag="{id}" data-asso-source="' + source + '" data-asso-url="' + urlSource + '"><div class="ajax-content sub-tab-table"></div></div>';

	await addTab(data, file, newLi, newTabContent, data.options.target, 'has_many_preset');
	return true;
};

exports.saveHasManyData = (data, workspaceData, foreignKey) => {
	const jsonPath = __dirname + '/../workspace/' + data.application.name + '/app/models/toSync.json';
	const toSync = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
	toSync.queries = [];
	const firstKey = "fk_id_" + data.options.source;
	const secondKey = "fk_id_" + data.options.target;
	/* Insert value in toSync queries array to add values of the old has many in the belongs to many */
	for (let i = 0; i < data.length; i++)
		toSync.queries.push("INSERT INTO " + data.options.through + "(" + firstKey + ", " + secondKey + ") VALUES(" + data[i].id + ", " + data[i][foreignKey] + ");");
	fs.writeFileSync(jsonPath, JSON.stringify(toSync, null, 4));
	return true;
};

exports.setupHasOneTab = async (data) => {
	const target = data.options.target;
	const source = data.options.source;
	const urlSource = data.options.urlSource;
	const foreignKey = data.options.foreignKey;
	const alias = data.options.as;
	const showAlias = data.options.showAs;

	/* Add Alias in Translation file for tabs */
	const fileTranslationFR = __dirname + '/../workspace/' + data.application.name + '/app/locales/fr-FR.json';
	const fileTranslationEN = __dirname + '/../workspace/' + data.application.name + '/app/locales/en-EN.json';
	const dataFR = JSON.parse(fs.readFileSync(fileTranslationFR));
	const dataEN = JSON.parse(fs.readFileSync(fileTranslationEN));

	dataFR.entity[source][alias] = showAlias;
	dataEN.entity[source][alias] = showAlias;

	fs.writeFileSync(fileTranslationFR, JSON.stringify(dataFR, null, 2))
	fs.writeFileSync(fileTranslationEN, JSON.stringify(dataEN, null, 2))

	// Setup association tab for show_fields.dust
	const fileBase = __dirname + '/../workspace/' + data.application.name + '/app/views/' + source;
	const file = fileBase + '/show_fields.dust';

	// Create new tab button
	const newLi = '\
	<li class="nav-item">\n\
		<a data-tabtype="hasOne" id="' + alias + '-click" href="#' + alias + '" class="nav-link" data-toggle="pill" role="tab" aria-controls="' + alias + '" aria-selected="false">\n\
			<!--{#__ key="entity.' + source + '.' + alias + '" /}-->\n\
		</a>\n\
	</li>';

	// Create new tab content
	const newTab = '<div id="' + alias + '" class="ajax-tab tab-pane fade show" data-tabType="hasOne" role="tabpanel" aria-labelledby="' + alias + '-tab" data-asso-alias="' + alias + '" data-asso-foreignkey="' + foreignKey + '" data-asso-flag="{id}" data-asso-source="' + source + '" data-asso-url="' + urlSource + '"><div class="ajax-content"></div></div>';

	return await addTab(data, file, newLi, newTab, target, 'has_one');
};

exports.deleteTab = async (data) => {

	const tabNameWithoutPrefix = data.options.urlValue;
	let target;

	const workspacePath = __dirname + '/../workspace/' + data.application.name;
	const jsonPath = workspacePath + '/app/models/options/' + data.entity.name + '.json';

	const options = JSON.parse(fs.readFileSync(jsonPath));
	let found = false;
	let option;
	const deletedOptionsTarget = [];

	for (let i = 0; i < options.length; i++) {
		if (options[i].as !== "r_" + tabNameWithoutPrefix)
			continue;

		option = options[i];

		if(deletedOptionsTarget.indexOf(option.target) == -1)
			deletedOptionsTarget.push(option.target);

		if (option.relation == 'hasMany')
			target = option.target;
		else
			target = data.entity.name;

		// Delete unnecessary locales
		translateHelper.removeLocales(data.application.name, "field", [data.entity.name, option.as]);

		options.splice(i, 1);
		found = true;
		break;
	}

	if (!found) {
		const err = new Error('structure.association.error.unableTab');
		err.messageParams = [data.options.showValue];
		throw err;
	}

	// Look in option file for all concerned target to destroy auto_generate key no longer needed
	let targetOption, autoGenerateFound, targetJsonPath;
	for (let i = 0; i < deletedOptionsTarget.length; i++) {
		autoGenerateFound = false;
		targetJsonPath = workspacePath + '/app/models/options/' + deletedOptionsTarget[i] + '.json'
		targetOption = JSON.parse(fs.readFileSync(targetJsonPath));
		for (let j = 0; j < targetOption.length; j++) {
			if(targetOption[j].structureType == "auto_generate" && targetOption[j].foreignKey == option.foreignKey){
				targetOption.splice(j, 1);
				autoGenerateFound = true;
			}
		}
		if(autoGenerateFound)
			fs.writeFileSync(targetJsonPath, JSON.stringify(targetOption, null, 4), "utf8");
	}
	fs.writeFileSync(jsonPath, JSON.stringify(options, null, 4), "utf8");

	const showFile = workspacePath + '/app/views/' + data.entity.name + '/show_fields.dust';
	const $ = await domHelper.read(showFile)

	// Get tab type before destroying it
	const tabType = $("#r_" + tabNameWithoutPrefix + "-click").attr('data-tabtype');
	// Remove tab (<li>)
	$("#r_" + tabNameWithoutPrefix + "-click").parents('li').remove();
	// Remove tab content
	$("#r_" + tabNameWithoutPrefix).remove();

	// If last tab have been deleted, remove tab structure from view
	if ($(".tab-content .tab-pane").length == 1)
		$("#tabs").replaceWith($("#home").html());

	domHelper.write(showFile, $);

	return {
		fk: option.foreignKey,
		target: target,
		tabType: tabType
	};
};
