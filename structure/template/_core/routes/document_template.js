const moment = require('moment');
const globalConf = require('@config/global');
const appConf = require('@config/application');
const fs = require('fs-extra');
const path = require('path');

const CoreEntity = require('@core/abstract_routes/entity');
const models = require('@app/models');

class CoreDocumentTemplate extends CoreEntity {
	constructor(entityName, attributes, options, helpers, additionalRoutes) {
		super(entityName, attributes, options, helpers, [
			'entity_list',
			'generate',
			'help',
			'help_entity',
			...additionalRoutes
		]);

		try {
			this.entityList = fs.readdirSync(__appPath + '/models/')
				.filter(dir => dir.indexOf('e_') === 0 && dir !== this.e_entity)
				.map(dir => dir.slice(0, -3))
		} catch(err) {
			console.error("Couldn't load DocumentTemplate's entityList");
			console.error(err);
		}
	}

	entity_list() {
		this.router.post('/entity_list', ...this.middlewares.entity_list, this.asyncRoute((data) => {
			data.search = data.req.body.search || '';
			data.searchField = data.req.body.searchField || 'f_entity';
			data.language = this.helpers.language(data.req.session.lang_user);
			data.entityList = this.entityList;

			if (this.getHook('entity_list', 'start', data) === false)
				return;

			// TODO: Filter on traducted values
			// TODO: Sort results
			data.results = (data.search === '' ? data.entityList : data.entityList.filter(entity => entity.includes(data.search.toLowerCase())))
				.map(entity => {return {id: entity, [data.searchField]: data.language.__(`entity.${entity}.label_entity`)}});

			if (this.getHook('entity_list', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.json({
				rows: data.results,
				more: false,
				count: data.results.length
			}));
		}));
	}

	// TODO: create toastr and send right status instead of `throw new Error`
	generate() {
		this.router.post('/generate', ...this.middlewares.generate, this.asyncRoute(async (data) => {
			data.idEntity = data.req.body.id_entity;
			data.idDocument = data.req.body.id_document;
			data.allowedAccess = false;
			data.templateQuery = {
				where: {id: data.idDocument},
				include: [{
					model: models.E_group,
					as: 'r_group'
				}, {
					model: models.E_role,
					as: 'r_role'
				}]
			}

			if (await this.getHook('generate', 'start', data) === false)
				return;

			if (!data.idEntity || !data.idDocument)
				throw new Error("Missing body values. Expecting {id_entity, id_document}");

			if (await this.getHook('generate', 'beforeTemplateRequest', data) === false)
				return;

			data.template = await models.E_document_template.findOne(data.templateQuery);
			if (!data.template)
				throw new Error("Unable to find template");

			if (await this.getHook('generate', 'afterTemplateRequest', data) === false)
				return;

			if (!data.template.r_group.length && !data.template.r_role.length)
				data.allowedAccess = true;
			else {
				head:for (const tmplGroup of data.template.r_group || [])
					for (const userGroup of data.req.user.r_group || [])
						if (tmplGroup.id == userGroup.id) {
							data.allowedAccess = true;
							break head;
						}
				if (!data.allowedAccess)
					head:for (const tmplRole of data.template.r_role || [])
						for (const userRole of data.req.user.r_role || [])
							if (tmplRole.id == userRole.id) {
								data.allowedAccess = true;
								break head;
							}
			}

			if (await this.getHook('generate', 'beforeAccessCheck', data) === false)
				return;

			if (!data.allowedAccess)
				throw new Error("You do not have access to this file.");

			data.filePath = this.helpers.file.fullPath(data.template.f_file);

			data.format_pair = appConf.document_template.format_pairs.filter(f => f.code == data.template.f_format_pair)[0];
			if (!data.format_pair)
				throw new Error("Template's f_format_pair doesn't match any configuration in `@config/application`");

			const templateFileInfo = path.parse(data.filePath);
			if (templateFileInfo.ext !== '.'+data.format_pair.input)
				console.warn("WARN: Template extention is not the one expected : "+data.format_pair.input)

			data.templateDataParser = this.helpers.document_template.getDataParser(data.format_pair.input);
			data.templateGenerator = this.helpers.document_template.getTemplateGenerator(data.format_pair.input, data.format_pair.output);
			data.globalVariables = this.helpers.document_template.getGlobalVariables();

			if (await this.getHook('generate', 'afterTemplateInitialization', data) === false)
				return;

			data.templateFields = await data.templateDataParser(data);

			// Extract globals and images from `data.templateFields` so only data to include remains for getIncludeFromFields
			const globalFields = [], staticImages = [];
			for (const [idx, field] of (data.templateFields || []).entries()) {
				if (field.substring(0, 2) === 'g_') {
					globalFields.push(field);
					data.templateFields.splice(idx, 1);
				}
				else if (field.substring(0, 4) === 'img_') {
					staticImages.push(field);
					data.templateFields.splice(idx, 1);
				}
			}

			// Entity data
			const include = this.helpers.model_builder.getIncludeFromFields(models, data.template.f_entity, data.templateFields);
			data.templateData = await models[data.template.f_entity.capitalizeFirstLetter()].findOne({
				where: {id: data.idEntity},
				include
			}) || {};

			await this.helpers.entity.postProcessEntityData(data.templateData);

			// Global data
			const globalVarsPromises = [];
			for (const globalVar of data.globalVariables)
				if (globalFields.includes(globalVar.ref))
					globalVarsPromises.push((async currentVar => {
						data.templateData[currentVar.ref] = await currentVar.func(data);
					})(globalVar));
			await Promise.all(globalVarsPromises);

			// Static image
			if (staticImages.length) {
				const images = await models.E_image_ressources.findAll({
					where: {f_code: {[models.$in]: staticImages}}
				});
				for (const img of images || []) {
					try {
						data.templateData[img.f_code] = 'data:image/*;base64, ' + fs.readFileSync(globalConf.localstorage + img.f_image).toString('base64');
					} catch(err) {
						console.log("WARN: Couldn't load image ressource "+img.f_code)
					}
				}
			}
			const [noExtOriginalFilename] = this.helpers.file.originalFilename(data.template.f_file).split('.').slice(0, -1);
			data.filename = `${data.idEntity || '0'}_${moment().format('DDMMYYYY_HHmmss')}_${noExtOriginalFilename}.${data.format_pair.output}`;

			if (await this.getHook('generate', 'beforeTemplateGeneration', data) === false)
				return;

			const templateInfos = await data.templateGenerator(data);

			data.res.success(_ => {
				data.res.writeHead(200, {
					"Content-Type": templateInfos.contentType || 'text/plain',
					"Content-Disposition": "attachment;filename=" + data.filename
				});
				data.res.write(templateInfos.buffer);
				data.res.end();
			});
		}));
	}

	help() {
		this.router.get('/help', ...this.middlewares.help, this.asyncRoute(async (data) => {
			const language = this.helpers.language(data.req.session.lang_user);
			data.globalVariables = this.helpers.document_template.getGlobalVariables();
			data.entities = this.entityList.map(entity => {return {id: entity, text: language.__(`entity.${entity}.label_entity`)}});

			if (await this.getHook('help', 'start', data) === false)
				return;

			if (await this.getHook('help', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_document_template/help', data));
		}));
	}

	help_entity() {
		function randomColor() {
			let colorCode = "";
			const possible = "abcdef0123456789";
			for (let i = 0; i < 6; i++)
				colorCode += possible.charAt(Math.floor(Math.random() * possible.length));
			return '#'+colorCode;
		}

		this.router.get('/help_entity/:entity', ...this.middlewares.help_entity, this.asyncRoute(async (data) => {
			const language = this.helpers.language(data.req.session.lang_user);
			data.entity = data.req.params.entity;

			if (await this.getHook('help_entity', 'start', data) === false)
				return;

			if (data.entity) {
				const entityDetails = new Map();
				const entityFieldTree = this.helpers.status.fullEntityFieldTree(data.entity);
				const entityFieldList = this.helpers.status.entityFieldForSelect(entityFieldTree, data.req.session.lang_user);

				for (const details of entityFieldList) {
					const codenameParts = details.traduction.split(' > ');
					const field = codenameParts.pop();
					const pathToEntity = codenameParts.join(' > ');

					if (!entityDetails.has(pathToEntity))
						entityDetails.set(pathToEntity, []);
					entityDetails.get(pathToEntity).push({
						entity: language.__(`entity.${details.target}.label_entity`),
						field,
						codename: details.codename
					});
				}
				data.entityDetails = [...entityDetails].map(detail => {
					return {
						traduction: detail[0],
						fields: detail[1],
						color: randomColor()
					}
				});
			}

			if (await this.getHook('help_entity', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_document_template/help_entity', {
				entityDetails: data.entityDetails
			}));
		}));
	}
}

module.exports = CoreDocumentTemplate;