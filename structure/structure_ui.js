const fs = require("fs-extra");
const domHelper = require('../utils/jsDomHelper');
const iconList = require('../config/font_awesome_list.json');

exports.setColumnVisibility = async (data) => {
	const pathToViews = __workspacePath + '/' + data.application.name + '/app/views/' + data.entity.name;

	const possibilityShow = ["show", "visible"];
	const possibilityHide = ["hide", "hidden", "non visible", "caché"];

	const attributes = data.options.word.toLowerCase();
	let hide;

	if (possibilityHide.indexOf(attributes) != -1)
		hide = true;
	else if (possibilityShow.indexOf(attributes) != -1)
		hide = false;
	else
		throw new Error('structure.field.attributes.notUnderstand');

	const $ = await domHelper.read(pathToViews + '/list_fields.dust');

	if(data.options.value == "f_id")
		data.options.value = "id";

	if($("*[data-field='" + data.options.value + "']").length > 0){
		$("*[data-field='" + data.options.value + "']").attr("data-hidden", hide ? 'true' : 'false');
		domHelper.write(pathToViews + '/list_fields.dust', $);
		return {
			message: hide ? "structure.ui.columnVisibility.hide" : "structure.ui.columnVisibility.show",
			messageParams: [data.options.showValue]
		};
	}

	// Check if it's a related to field
	const fieldCodeName = "r_" + data.options.value.substring(2);

	if($("*[data-field='" + fieldCodeName + "']").length > 0){
		//$("*[data-field='" + fieldCodeName + "']")[hide ? 'hide' : 'show']();
		$("*[data-field='" + fieldCodeName + "']").attr("data-hidden", hide ? 'true' : 'false');
		domHelper.write(pathToViews + '/list_fields.dust', $);
		return {
			message: hide ? "structure.ui.columnVisibility.hide" : "structure.ui.columnVisibility.show",
			messageParams: [data.options.showValue]
		}
	}

	// No column found
	const err = new Error('structure.ui.columnVisibility.noColumn');
	err.messageParams = [data.options.showValue]
	throw err;
}

// eslint-disable-next-line require-await
exports.setLogo = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name + '/app/';

	// Check if logo exist
	if (!fs.existsSync(workspacePath + '/public/img/logo/' + data.options.value))
		throw new Error('preview.logo.notExist');

	const layouts = ['login_layout', 'main_layout'];

	for (let i = 0; i < layouts.length; i++) {

		const layoutPath = workspacePath + '/views/' + layouts[i] + '.dust';

		const $ = domHelper.read(layoutPath, true);

		$("body link[rel='icon']").remove();
		$("body link[rel='apple-touch-icon']").remove();
		$("head link[rel='icon']").remove();
		$("head link[rel='apple-touch-icon']").remove();
		$(".app-logo").html("<a href='/'><img src='/img/logo/" + data.options.value + "' class='img-fluid' alt='App logo' ></a>");
		$("head").append("<link rel=\"icon\" href='/img/logo/thumbnail/" + data.options.value + "'>");

		domHelper.writeMainLayout(layoutPath, $);
	}

	return true;
}

// eslint-disable-next-line require-await
exports.removeLogo = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';
	let message;
	const layouts = ['login_layout', 'main_layout'];

	for (let i = 0; i < layouts.length; i++) {

		const layoutPath = workspacePath + '/views/' + layouts[i] + '.dust';

		const $ = domHelper.read(layoutPath, true);

		if($(".app-logo img").length > 0){
			$(".app-logo").html('<img src="/img/logo/logo_nodea_color.png" class="img-fluid" alt="App Logo">');
			$("body link[rel='icon']").remove();
			$("body link[rel='apple-touch-icon']").remove();
			$("head link[rel='icon']").remove();
			$("head link[rel='apple-touch-icon']").remove();
			$("head").append('<link rel="apple-touch-icon" sizes="57x57" href="/img/favicons/apple-icon-57x57.png">\
			<link rel="apple-touch-icon" sizes="60x60" href="/img/favicons/apple-icon-60x60.png">\
			<link rel="apple-touch-icon" sizes="72x72" href="/img/favicons/apple-icon-72x72.png">\
			<link rel="apple-touch-icon" sizes="76x76" href="/img/favicons/apple-icon-76x76.png">\
			<link rel="apple-touch-icon" sizes="114x114" href="/img/favicons/apple-icon-114x114.png">\
			<link rel="apple-touch-icon" sizes="120x120" href="/img/favicons/apple-icon-120x120.png">\
			<link rel="apple-touch-icon" sizes="144x144" href="/img/favicons/apple-icon-144x144.png">\
			<link rel="apple-touch-icon" sizes="152x152" href="/img/favicons/apple-icon-152x152.png">\
			<link rel="apple-touch-icon" sizes="180x180" href="/img/favicons/apple-icon-180x180.png">\
			<link rel="icon" type="image/png" sizes="192x192"  href="/img/favicons/android-icon-192x192.png">\
			<link rel="icon" type="image/png" sizes="32x32" href="/img/favicons/favicon-32x32.png">\
			<link rel="icon" type="image/png" sizes="96x96" href="/img/favicons/favicon-96x96.png">\
			<link rel="icon" type="image/png" sizes="16x16" href="/img/favicons/favicon-16x16.png">');
			message = "preview.logo.remove";
		}
		else
			message = "preview.logo.noLogo";

		domHelper.writeMainLayout(layoutPath, $);
	}

	return message;
}

exports.setLayout = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';
	const layoutPath = workspacePath + '/public/css/AdminLteV2/layouts';
	const askedLayout = data.options.value.toLowerCase().trim().replace(/ /g, "-");

	const layoutsDir = fs.readdirSync(layoutPath).filter(file => file.indexOf('.') !== 0 && (file.slice(-4) === '.css' && file.slice(0, 1) !== '_'));

	const layoutListAvailable = [];

	layoutsDir.forEach(file => {
		layoutListAvailable.push(file.slice(7, -4));
	});

	if (layoutListAvailable.indexOf(askedLayout) != -1) {

		const moduleLayout = workspacePath + '/views/layout_' + data.np_module.name + '.dust';
		const $ = await domHelper.read(moduleLayout);

		// const oldLayout = $("link[data-type='layout']").data("data-layout");
		$("link[data-type='layout']").replaceWith("<link href='/css/AdminLteV2/layouts/layout-" + askedLayout + ".css' rel='stylesheet' type='text/css' data-type='layout' data-layout='" + askedLayout + "'>\n");

		domHelper.write(moduleLayout, $)

		return {
			message: "structure.ui.layout.success",
			messageParams: [data.options.value, data.np_module.displayName],
			restartServer: false
		}
	}
	const err = new Error('structure.ui.layout.cannotFind');
	let msgParams = "";
	for (let i = 0; i < layoutListAvailable.length; i++)
		msgParams += "-  " + layoutListAvailable[i] + "<br>";
	err.messageParams = [msgParams];
	throw err;
}

exports.listLayout = (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';

	const layoutPath = workspacePath + '/public/css/AdminLteV2/layouts';
	const layoutsDir = fs.readdirSync(layoutPath).filter(file => file.indexOf('.') !== 0 && (file.slice(-4) === '.css' && file.slice(0, 1) !== '_'));

	const layoutListAvailable = [];

	layoutsDir.forEach(file => {
		layoutListAvailable.push(file.slice(7, -4));
	});

	let msgParams = "";
	for (let i = 0; i < layoutListAvailable.length; i++)
		msgParams += "-  " + layoutListAvailable[i] + "<br>";

	return {
		message: "structure.ui.layout.list",
		messageParams: [msgParams],
		restartServer: false
	}
}

exports.setTheme = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';

	let askedTheme = data.options.value.toLowerCase();
	askedTheme = askedTheme.trim().replace(/ /g, "-");

	function retrieveTheme(themePath) {
		const themesDir = fs.readdirSync(themePath).filter(folder => folder.indexOf('.') == -1);
		const themeListAvailable = [];
		themesDir.forEach(theme => {
			themeListAvailable.push(theme);
		});
		return themeListAvailable;
	}

	const themeWorkspacePath = workspacePath + '/public/theme';
	const themeListAvailableWorkspace = retrieveTheme(themeWorkspacePath);

	// If not found in workspace, look for not imported theme exisiting in structure/template
	if (themeListAvailableWorkspace.indexOf(askedTheme) == -1) {
		const themeTemplatePath = __dirname + '/template/app/public/theme';
		const themeListAvailableTemplate = retrieveTheme(themeTemplatePath);

		if (themeListAvailableTemplate.indexOf(askedTheme) == -1) {
			const err = new Error('structure.ui.theme.cannotFind');
			let msgParams = "";
			for (let i = 0; i < themeListAvailableWorkspace.length; i++)
				msgParams += "-  " + themeListAvailableWorkspace[i] + "<br>";
			err.messageParams = [msgParams];
			throw err;
		}

		fs.copySync(themeTemplatePath + "/" + askedTheme + "/", themeWorkspacePath + "/" + askedTheme + "/");
	}

	const themeInformation = JSON.parse(fs.readFileSync(workspacePath + "/public/theme/" + askedTheme + "/infos.json"));
	const promises = [];
	const layoutToWrite = ["main_layout", "login_layout"];

	for (let i = 0; i < layoutToWrite.length; i++) {
		promises.push((async() => {
			const layoutPath = workspacePath + '/views/' + layoutToWrite[i] + '.dust';
			const $ = await domHelper.read(layoutPath, true);
			// const oldTheme = $("link[data-type='theme']").attr("data-theme");
			$("link[data-type='theme']").replaceWith("<link href='/theme/" + askedTheme + "/css/style.css' rel='stylesheet' type='text/css' data-type='theme' data-theme='" + askedTheme + "'>");

			if(themeInformation.sidebar == 'dark'){
				$(".main-sidebar").removeClass('sidebar-light-primary');
				$(".main-sidebar").addClass('sidebar-dark-primary');
			} else {
				$(".main-sidebar").removeClass('sidebar-dark-primary');
				$(".main-sidebar").addClass('sidebar-light-primary');
			}

			if (typeof themeInformation.js !== "undefined") {
				// If the theme need js inclusion
				for (let j = 0; j < themeInformation.js.length; j++) {
					$("body script:last").after("<script type='text/javascript'></script>");
					$("body script:last").attr('src', "/theme/" + askedTheme + "/js/" + themeInformation.js[j]);
				}
			}

			domHelper.writeMainLayout(layoutPath, $);
			return;
		})());
	}

	await Promise.all(promises);
	return;
}

exports.listTheme = (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';
	const themePath = workspacePath + '/public/theme';
	const themesDir = fs.readdirSync(themePath).filter(folder => folder.indexOf('.') == -1);

	const themeListAvailable = [];
	themesDir.forEach(theme => {
		themeListAvailable.push(theme);
	});

	let msgParams = "";
	for (let i = 0; i < themeListAvailable.length; i++)
		msgParams += "-  " + themeListAvailable[i] + "<br>";

	return {
		message: "structure.ui.theme.list",
		messageParams: [msgParams],
		restartServer: false
	};
}

exports.setIcon = async(data) => {
	const workspacePath = __workspacePath + '/' + data.application.name + '/app';
	const layout_filename = 'layout_' + data.module_name + '.dust';
	const entityWithouPrefix = data.entity_name.substring(2);

	const iconName = 'fa-' + data.iconValue.split(' ').join('-');
	let iconClass = iconList.filter(x => x.includes(iconName));

	if(iconClass.length == 0) {
		const err = new Error('structure.ui.icon.not_found')
		err.messageParams = ['- ' + iconClass.join('<br>- ')];
		throw err;
	}

	if(iconClass.length > 1) {
		// If one of the icon is totally the same
		if(iconClass.filter(x => x.split(' ')[1] == iconName).length != 0) {
			iconClass = [iconClass.filter(x => x.split(' ')[1] == iconName)[0]]
		} else {
			const err = new Error('structure.ui.icon.multiple_choice')
			err.messageParams = ['- ' + iconClass.map(x => x.split(' ')[1].substring(3)).join('<br>- ')];
			throw err;
		}
	}

	iconClass = iconClass[0];

	let $ = await domHelper.read(workspacePath + '/views/' + layout_filename)

	const elementI = $("li[data-menu=" + entityWithouPrefix + ']').find('a:first').find('i:first');
	elementI.removeClass();
	elementI.addClass(iconClass + ' nav-icon');

	domHelper.write(workspacePath + '/views/' + layout_filename, $)

	$ = await domHelper.read(workspacePath + '/views/modules/' + data.module_name + '.dust');
	$('i.' + entityWithouPrefix + '-icon').removeClass().addClass(iconClass + ' ' + entityWithouPrefix + '-icon');
	domHelper.write(workspacePath + '/views/modules/' + data.module_name + '.dust', $);
	return;
}

exports.addTitle = async (data) => {

	const pathToViews = __workspacePath + '/' + data.application.name + '/app/views/' + data.entity_name;
	const viewsToProcess = ["create_fields", "update_fields", "show_fields"];
	const processPromises = [];

	const title = "\
	<div class='col-12 text-center'>\n\
		<div class='form-group form-title'>\n\
			<h3>" + data.options.value + "</h3>\n\
		</div>\n\
	</div>\n";

	for (let i = 0; i < viewsToProcess.length; i++) {
		processPromises.push((async() => {
			const currentView = viewsToProcess[i];
			const $ = await domHelper.read(pathToViews + '/' + currentView + '.dust');
			if (data.options.afterField) {
				$("div[data-field=" + data.field.name + "]").after(title);
			} else {
				$("#fields").append(title);
			}
			domHelper.write(pathToViews + '/' + currentView + '.dust', $);
		})());
	}

	await Promise.all(processPromises);
	return true;
}

exports.removeTitle = async (data) => {
	const pathToViews = __workspacePath + '/' + data.application.name + '/app/views/' + data.entity.name;
	const viewsToProcess = ["create_fields", "update_fields", "show_fields"];
	const processPromises = [];
	let titleFound = false;
	for (let i = 0; i < viewsToProcess.length; i++) {
		processPromises.push((async() => {
			const currentView = viewsToProcess[i];
			const $ = await domHelper.read(pathToViews + '/' + currentView + '.dust');
			$("#fields").find('.form-title').each(function() {
				if($(this).find('h3').text() == data.options.value) {
					$(this).parent().remove();
					titleFound = true;
				}
			});
			domHelper.write(pathToViews + '/' + currentView + '.dust', $);
		})());
	}

	await Promise.all(processPromises);

	if(!titleFound)
		throw new Error('structure.ui.title.not_found');

	return true;
}

exports.createWidget = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name + '/app';
	const layout_filename = 'layout_' + data.np_module.name + '.dust';

	// Get entity's icon
	let $ = await domHelper.read(workspacePath + '/views/' + layout_filename);

	const entityIconClass = $("#" + data.entity.name.substring(2) + '_menu_item').find('a:first').find('i:first').attr('class') || 'fa fa-folder';
	const layout_view_filename = workspacePath + '/views/modules/' + data.np_module.name + '.dust';

	// Add widget to module's layout
	$ = await domHelper.read(layout_view_filename);
	const $2 = await domHelper.read(__piecesPath + '/views/widget/' + data.widgetType + '.dust');

	let widgetElemId = data.widgetType + '_' + data.entity.name + '_widget';

	let cpt = 1;
	while($(`#${widgetElemId}`).length != 0)
		widgetElemId = data.widgetType + '_' + data.entity.name + '_widget_' + ++cpt;

	// Create widget's html
	let newHtml = "";
	newHtml += '<!--{#entityAccess entity="' + data.entity.name.substring(2) + '" }-->';
	newHtml += "<div id='" + widgetElemId + "' data-entity='" + data.entity.name + "' data-widget-type='" + data.widgetType + "' class='ajax-widget col-sm-3 col-12'>\n";
	newHtml += $2("body")[0].innerHTML + "\n";
	newHtml += "</div>";
	newHtml += '<!--{/entityAccess}-->';
	newHtml = newHtml.replace(/ENTITY_NAME/g, data.entity.name);
	newHtml = newHtml.replace(/ENTITY_URL_NAME/g, data.entity.name.substring(2));
	$("#widgets").append(newHtml);

	// Set entity's icon class to widget
	$('i.' + data.entity.name.substring(2) + '-icon').removeClass().addClass(entityIconClass + ' ' + data.entity.name.substring(2) + '-icon');

	return domHelper.write(layout_view_filename, $);
}

exports.createWidgetPiechart = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name + '/app';

	if (!data.field) {
		// TODO: Refactor to remove `definitlyNotFound`
		let definitlyNotFound = true;
		const options = JSON.parse(fs.readFileSync(workspacePath + '/models/options/' + data.entity.name + '.json', 'utf8'));
		for (let j = 0; j < options.length; j++) {
			if (data.givenField && options[j].showAs && data.givenField.toLowerCase() == options[j].showAs.toLowerCase()) {
				data.field = {
					name: options[j].as,
					displayName: options[j].showAs,
					type: options[j].nodeaType
				};
				definitlyNotFound = false;
				break;
			}
		}
		if (definitlyNotFound){
			if(!data.field)
				throw new Error('structure.ui.widget.no_fields');

			const err = new Error('structure.ui.widget.unknown_fields');
			err.messageParams = [data.field];
			throw err;
		}
	}

	// Add widget to module's layout
	const layoutFile = workspacePath + '/views/modules/' + data.np_module.name + '.dust';
	const $ = await domHelper.read(layoutFile);
	const $2 = await domHelper.read(__piecesPath + '/views/widget/' + data.widgetType + '.dust');

	// Widget box title traduction
	$2(".box-title").html(`<!--{#__ key="defaults.widgets.piechart.distribution" /}-->&nbsp;<!--{#__ key="entity.${data.entity.name}.label_entity" /}-->&nbsp;-&nbsp;<!--{#__ key="entity.${data.entity.name}.${data.field.name}" /}-->`);

	let widgetElemId = data.widgetType + '_' + data.entity.name + '_' + data.field.name + '_widget';

	let randomNumber = Math.floor(Math.random() * 100);
	while($('#widgetElemId_' + randomNumber).length != 0)
		randomNumber = Math.floor(Math.random() * 100);

	widgetElemId = widgetElemId + '_' + randomNumber;

	const type = data.field.type || 'string';

	// Create widget's html
	let newHtml = "";
	newHtml += '<!--{#entityAccess entity="' + data.entity.name.substring(2) + '" }-->';
	newHtml += "<div id='" + widgetElemId + "' data-entity='" + data.entity.name + "' data-field-type='" + type + "' data-field='" + data.field.name + "' data-legend='" + data.legend + "' data-widget-type='" + data.widgetType + "' class='ajax-widget col-sm-4 col-12'>\n";
	newHtml += $2("body")[0].innerHTML + "\n";
	newHtml += "</div>";
	newHtml += '<!--{/entityAccess}-->';
	$("#widgets").append(newHtml);
	domHelper.write(layoutFile, $);
	return;
}

exports.createWidgetLastRecords = async (data) => {

	const workspacePath = __workspacePath + '/' + data.application.name + '/app';

	// Look for related to fields in entity's options
	const definitlyNotFound = [];
	const options = JSON.parse(fs.readFileSync(workspacePath + '/models/options/' + data.entity.name + '.json', 'utf8'));

	for (let i = 0; i < data.columns.length; i++) {
		if (data.columns[i].found == true)
			continue;
		for (let j = 0; j < options.length; j++)
			if (data.columns[i].name.toLowerCase() == options[j].showAs.toLowerCase()) {
				data.columns[i] = {
					name: options[j].as,
					displayName: options[j].showAs,
					found: true
				};
				break;
			}
		if (!data.columns[i].found)
			definitlyNotFound.push(data.columns[i].name);
	}
	if (definitlyNotFound.length > 0){
		const err = new Error('structure.ui.widget.unknown_fields');
		err.messageParams = [definitlyNotFound.join(', ')];
		throw err;
	}

	if (!data.columns || data.columns.length == 0)
		throw new Error('structure.ui.widget.no_fields');

	const layoutFile = workspacePath + '/views/modules/' + data.np_module.name + '.dust';
	const $ = await domHelper.read(layoutFile);
	const $template = await domHelper.read(__piecesPath + '/views/widget/' + data.widgetType + '.dust');

	const widgetElemId = data.widgetType + '_' + data.entity.name + '_widget';
	let newHtml = "";
	newHtml += '<!--{#entityAccess entity="' + data.entity.name.substring(2) + '" }-->';
	newHtml += "<div id='" + widgetElemId + "' data-entity='" + data.entity.name + "' data-widget-type='" + data.widgetType + "' class='col-12 col-" + (data.columns.length > 4 ? '12' : '6') + "'>\n";
	newHtml += $template("body")[0].innerHTML + "\n";
	newHtml += "</div>";
	newHtml += '<!--{/entityAccess}-->';
	newHtml = newHtml.replace(/ENTITY_NAME/g, data.entity.name);
	newHtml = newHtml.replace(/ENTITY_URL_NAME/g, data.entity.name.substring(2));
	$("#widgets").append(newHtml);

	const $list = await domHelper.read(workspacePath + '/views/' + data.entity.name + '/list_fields.dust');

	let thead = '<thead><tr>';
	for (let i = 0; i < data.columns.length; i++) {
		let field = data.columns[i].name;
		let type = $list('th[data-field="' + field + '"]').data('type');
		let col = $list('th[data-field="' + field + '"]').data('col');

		// Not found with f_, try with r_ for related to field
		if(typeof type === 'undefined' && typeof col === 'undefined') {
			field = 'r_' + field.substring(2);
			type = $list('th[data-field="' + field + '"]').data('type');
			col = $list('th[data-field="' + field + '"]').data('col');
		}

		const fieldTradKey = field != 'id' ? field : 'id_entity';
		thead += '\
		<th data-field="' + field + '" data-type="' + type + '" data-col="' + col + '">\n\
			<!--{#__ key="entity.' + data.entity.name + '.' + fieldTradKey + '" /}-->\n\
		</th>';
	}
	thead += '</tr></thead>';

	$("#" + data.entity.name.substring(2) + '_lastrecords').html(thead);
	$("#" + data.entity.name.substring(2) + '_lastrecords').attr('data-limit', data.limit);
	domHelper.write(layoutFile, $);
	return;
}

exports.deleteWidget = async (data) => {
	const workspacePath = __workspacePath + '/' + data.application.name + '/app';

	// Delete from view
	const $ = await domHelper.read(workspacePath + '/views/modules/' + data.np_module.name + '.dust');
	let widgetElements = [];

	// For each widgetType, find corresponding divs using a regex on data id
	for (const widgetType of data.widgetTypes) {
		widgetElements = $("#widgets > div[data-widget-type=" + widgetType + "]").filter(function() {
			// We don't know piechart's field, use regex to match rest of id
			const reg = widgetType == 'piechart' ? new RegExp('piechart_' + data.entity.name + '_.*_widget') : new RegExp(widgetType + '_' + data.entity.name + '_widget');
			return this.id.match(reg);
		});

		// Delete matched widget divs
		for (const elem of widgetElements)
			$(elem).remove();
	}

	domHelper.write(workspacePath + '/views/modules/' + data.np_module.name + '.dust', $);
	return true;
}