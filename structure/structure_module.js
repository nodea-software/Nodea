const fs = require("fs-extra");
const domHelper = require('../utils/jsDomHelper');
const translateHelper = require("../utils/translate");
const dataHelper = require('../utils/data_helper');

exports.setupModule = async (data) => {

	const appName = data.app_name;

	// Initialize variables according to options
	const name_module = data.options.value;
	const show_name_module = data.options.showValue;
	const url_name_module = data.options.urlValue;

	// Read routes/app.js file
	let module_template = fs.readFileSync(__piecesPath + '/routes/module.js', 'utf8');

	module_template = module_template.replace(/MODULE_NAME/g, url_name_module.charAt(0).toUpperCase() + url_name_module.toLowerCase().slice(1));
	module_template = module_template.replace(/MODULE_URL/g, url_name_module);

	// const defaultjs = fs.readFileSync(file, 'utf8');
	// // Add new module route to routes/app.js file
	// let str = '// *** Dynamic Module | Do not remove ***\n\n';
	// str += 'router.get(\'/' + url_name_module.toLowerCase() + '\', block_access.isLoggedIn, block_access.moduleAccessMiddleware("' + url_name_module + '"), function(req, res) {\n';
	// str += '	res.render(\'default/' + name_module.toLowerCase() + '\');\n';
	// str += '});';
	// const result = defaultjs.replace('// *** Dynamic Module | Do not remove ***', str);

	fs.writeFileSync(`${__workspacePath}/${appName}/app/routes/${url_name_module}.js`, module_template, 'utf8');

	// Create views/modules/m_module.dust file
	const fileToCreate = `${__workspacePath}/${appName}/app/views/modules/${name_module.toLowerCase()}.dust`

	fs.copySync(__dirname + '/pieces/views/modules/custom_module.dust', fileToCreate);

	// Replace all variables 'custom_module' in new created file
	const dataDust = fs.readFileSync(fileToCreate, 'utf8');

	// Replace custom_module occurence and write to file
	let resultDust = dataDust.replace(/custom_module/g, name_module.toLowerCase());
	if (name_module.toLowerCase() != "m_home") {
		const moduleAriane = "\
			<li class='active'>\
				{#__ key=\"module." + name_module.toLowerCase() + "\"/}\n\
			</li>";
		resultDust = resultDust.replace(/<!-- NEW MODULE -->/g, moduleAriane);
	}
	resultDust = resultDust.replace(/custom_show_module/g, show_name_module.toLowerCase());

	fs.writeFileSync(fileToCreate, resultDust, 'utf8');

	await translateHelper.writeLocales(appName, "module", name_module, show_name_module, data.googleTranslate)

	// Create module's layout file
	const layout_module = `${__workspacePath}/${appName}/app/views/layout_${name_module.toLowerCase()}.dust`;
	fs.copySync(__piecesPath + '/views/layout_custom_module.dust', layout_module);

	// Loop over module list to add new module's <option> tag in all modules <select> tags
	const promises = [];
	const modules = data.modules;

	for (let i = 0; i < modules.length; i++) {
		promises.push((async () => {
			const fileName = __workspacePath + '/' + appName + '/app/views/layout_' + modules[i].name + '.dust';
			const $ = await domHelper.read(fileName);
			$("#module-select").empty();
			let option = "\n";
			for (let j = 0; j < modules.length; j++) {
				option += '<!--{#moduleAccess module="' + modules[j].name.substring(2) + '"}-->\n';
				option += '	 <option data-module="' + modules[j].name + '" value="/module/' + dataHelper.removePrefix(modules[j].name, "module") + '" ' + (modules[i].name == modules[j].name ? 'selected' : '') + '>\n';
				option += '		 <!--{#__ key="module.' + modules[j].name + '" /}-->\n';
				option += '	 </option>\n';
				option += '<!--{/moduleAccess}-->\n';
			}
			$("#module-select").append(option);
			domHelper.write(fileName, $);
		})());
	}

	// Wait for all the layouts to be modified before calling `callback()`
	await Promise.all(promises);

	// Access settings handling
	const accessPath = __workspacePath + '/' + appName + '/config/access.json';
	const accessLockPath = __workspacePath + '/' + appName + '/config/access.lock.json';
	const accessObject = JSON.parse(fs.readFileSync(accessPath, 'utf8'));
	accessObject[url_name_module.toLowerCase()] = {groups: ["admin"], entities: []};
	fs.writeFileSync(accessPath, JSON.stringify(accessObject, null, 4), "utf8");
	fs.writeFileSync(accessLockPath, JSON.stringify(accessObject, null, 4), "utf8");

	return true;
};

exports.deleteModule = async (data) => {
	const moduleFilename = 'layout_' + data.np_module.name + '.dust';
	const layoutsPath = __workspacePath + data.application.name + '/views/';

	// Remove layout
	fs.unlinkSync(layoutsPath + moduleFilename);
	fs.unlinkSync(layoutsPath + "/app/" + data.np_module.name + ".dust");

	// Clean default.js route GET
	let defaultRouteContent = fs.readFileSync(__workspacePath + data.application.name + '/routes/app.js', 'utf8');
	const regex = new RegExp("router\\.get\\('\\/" + data.np_module.name.substring(2) + "'([\\s\\S]*?)(?=router)");
	defaultRouteContent = defaultRouteContent.replace(regex, "");
	fs.writeFileSync(__workspacePath + data.application.name + '/routes/app.js', defaultRouteContent);

	// Clean up access config
	const access = JSON.parse(fs.readFileSync(__workspacePath + data.application.name + '/config/access.json', 'utf8'));
	for (const np_module in access) {
		if (np_module == data.np_module.name.substring(2))
			delete access[np_module];
	}

	fs.writeFileSync(__workspacePath + data.application.name + '/config/access.json', JSON.stringify(access, null, 4));
	fs.writeFileSync(__workspacePath + data.application.name + '/config/access.lock.json', JSON.stringify(access, null, 4));

	const layoutFiles = fs.readdirSync(layoutsPath).filter(file => file.indexOf('.') !== 0 && file.indexOf('layout_') === 0);

	for (let i = 0; i < layoutFiles.length; i++) {
		const $ = await domHelper.read(layoutsPath + layoutFiles[i]); // eslint-disable-line
		$("option[data-module='" + data.np_module.name + "']").remove();
		domHelper.write(layoutsPath + layoutFiles[i], $); // eslint-disable-line
	}

	translateHelper.removeLocales(data.application.name, "module", data.np_module.name);
	return true;
};