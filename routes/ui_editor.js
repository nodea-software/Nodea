const express = require('express');
const router = express.Router();
const block_access = require('../utils/block_access');
const domHelper = require('../utils/jsDomHelper');
const language = require('../services/language');
const gitHelper = require('../utils/git_helper');

async function applyToAllEntity(currentHtml, notPage, entity, appName) {
	const pageFiles = ['create_fields.dust', 'update_fields.dust', 'show_fields.dust'];
	for (let i = 0; i < pageFiles.length; i++) {
		if (pageFiles[i] == notPage)
			continue;

		const pageUri = __workspacePath + '/' + appName + '/app/views/' + entity + '/' + pageFiles[i];
		const $ = await domHelper.read(pageUri); // eslint-disable-line
		const saveField = {};

		// Save current state of fields in the current working page
		$("div[data-field]").each(function() {
			saveField[$(this).attr("data-field")] = $(this)[0].innerHTML;
		});

		// Loop on source entity fields
		currentHtml("div[data-field]").each(function() {
			if (typeof saveField[currentHtml(this).attr("data-field")] === "undefined") {
				currentHtml(this).remove();
				console.log("ERROR: Cannot find field " + currentHtml(this).attr("data-field") + " in apply all UI designer function, it won't be restitute correctly !")
			} else
				currentHtml(this).html(saveField[currentHtml(this).attr("data-field")]);
			saveField[currentHtml(this).attr("data-field")] = true;
		});

		// Missing fields from the source that we'll append in col-xs-12
		for (const field in saveField) {
			if (saveField[field] != true) {
				let newDiv = "<div data-field='" + field + "' class='col-12'>";
				newDiv += saveField[field];
				newDiv += "</div>";
				currentHtml("div[data-field]:last").after(newDiv);
			}
		}

		// Find all rows and group them to be appended to #fields
		let packedRow = '';
		for (let i = 0; i < currentHtml("body").children('.row').length; i++)
			if (currentHtml("body").children('.row').eq(i).html() != "")
				packedRow += currentHtml("body").children('.row').eq(i).html();

		await domHelper.insertHtml(pageUri, "#fields", packedRow); // eslint-disable-line
	}
}

router.get('/getPage/:entity/:page', block_access.hasAccessApplication, (req, res) => {
	let page = req.params.page;

	if (!page || page != 'create' && page != 'update' && page != 'show')
		throw new Error('ui_editor.page_not_found');
	page += '_fields.dust';

	const entity = req.params.entity;
	const languagePath = __workspacePath + '/' + req.session.app_name + '/_core/helpers/language';

	// eslint-disable-next-line global-require
	const moduleAlias = require('module-alias');
	moduleAlias.addAlias('@config', __workspacePath + '/' + req.session.app_name + '/config');
	moduleAlias.addAlias('@core', __workspacePath + '/' + req.session.app_name + '/_core');
	moduleAlias.addAlias('@app', __workspacePath + '/' + req.session.app_name + '/app');

	const workspaceLanguage = require(languagePath)(req.session.lang_user); // eslint-disable-line
	const pageUri = __workspacePath + '/' + req.session.app_name + '/app/views/' + entity + '/' + page;

	const $ = domHelper.read(pageUri);

	// Encapsulate traduction with span to be able to translate, keep comment for later use
	$('div[data-field]').each(function(){
		const regexResult = new RegExp(/<!--{#__ key=['"](.*?)['"] ?\/}-->/g).exec($(this).find('label').html());
		// By default label is the data-field
		let label = $(this).attr('data-field');
		// No dust traduction matching
		if(!regexResult) {
			// Check if <label> exists
			if($(this).find('label').length != 0 && $(this).find('label').html() != '')
				label = $(this).find('label').html();
		} else {
			// Translate dust key
			label = workspaceLanguage.__(regexResult[1])
		}
		const tmpHtml = `
			<span id='content-${$(this).attr('data-field')}' class='original-content' style='display: none;'>
				${$(this).html()}
			</span>
		`;
		// Show only the labels on UI Designer
		$(this).html(label);
		// Save original content on seperate div
		$(this).append(tmpHtml);
	});

	res.status(200).send($("#fields")[0].outerHTML);
});

router.post('/setPage/:entity/:page', block_access.hasAccessApplication, (req, res) => {
	const generatorLanguage = language(req.session.lang_user);
	(async () => {

		let page = req.params.page;
		if (!page || page != 'create' && page != 'update' && page != 'show')
			throw new Error('ui_editor.page_not_found');

		page += '_fields.dust';

		const entity = req.params.entity;
		const html = req.body.html;
		const pageUri = __workspacePath + '/' + req.session.app_name + '/app/views/' + entity + '/' + page;

		const $ = await domHelper.loadFromHtml(html);

		$('div[data-field]').each(function(){
			$(this).html($(this).find(`span.original-content#content-${$(this).attr('data-field')}`).html());
			$(this).removeClass('column');
			if($(this).attr('style') == '')
				$(this).removeAttr('style');
		});

		// Find all rows and group them to be appended to #fields
		let packedRow = '';
		for (let i = 0; i < $("body").children('.row').length; i++)
			if ($("body").children('.row').eq(i).html() != "")
				packedRow += $("body").children('.row').eq(i).html();

		await domHelper.insertHtml(pageUri, "#fields", packedRow);

		// If the user ask to apply on all entity
		if (req.body.applyAll == "true")
			await applyToAllEntity($, page, entity, req.session.app_name);

		// Doing git commit
		// We simply add session values in attributes array
		await gitHelper.gitCommit({
			application: {
				name: req.session.app_name
			},
			module_name: req.session.module_name,
			entity_name: req.session.entity_name,
			function: "Save a file from UI designer: " + pageUri
		});
	})().then(_ => {
		if (req.body.applyAll == "true")
			res.status(200).send(generatorLanguage.__("ui_editor.page_saved_all"));
		else
			res.status(200).send(generatorLanguage.__("ui_editor.page_saved"));
	}).catch(err => {
		console.error(err);
		res.status(500).send(generatorLanguage.__("ui_editor.page_not_found"));
	});
});

module.exports = router;