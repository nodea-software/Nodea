const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_inline_help');
const attributes = require('@app/models/attributes/e_inline_help');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;
const language = helpers.language;
const models = require('@app/models');

const fs = require('fs');

class E_inline_help extends Entity {
	constructor() {
		const additionalRoutes = ['help'];
		super('e_inline_help', attributes, options, helpers, additionalRoutes);

		this.defaultMiddlewares = [
			middlewares.isLoggedIn
		];
	}

	help() {
		this.router.get('/help/:entity/:field', this.asyncRoute(async (data) => {
			const help = await models.E_inline_help.findOne({
				where: {
					f_entity: data.req.params.entity.startsWith('e_') ? data.req.params.entity : 'e_' + data.req.params.entity,
					f_field: data.req.params.field
				}
			});
			if (!help)
				return data.res.error(_ => data.res.status(404).end());

			if (help.f_content && help.f_content != '' && isNaN(help.f_content)) {
				// Escape HTML
				help.f_content = help.f_content.replace(/&/g, '&amp');
				help.f_content = help.f_content.replace(/</g, '&lt');
				help.f_content = help.f_content.replace(/>/g, '&gt');
			}

			data.res.success(_ => data.res.send(help.f_content));
		}));
	}

	get hooks() {
		return {
			list: {
				// start: async(data) => {},
				// beforeRender: async(data) => {},
			},
			datalist: {
				// start: async(data) => {},
				// beforeDatatableQuery: async(data) => {},
				// afterDatatableQuery: async(data) => {},
				beforeResponse: (data) => {
					for (let i = 0; i < data.preparedData.data.length; i++) {
						const row = data.preparedData.data[i];
						const entityTrad = 'entity.' + row.f_entity + '.label_entity';
						const fieldTrad = 'entity.' + row.f_entity + '.' + row.f_field;
						data.preparedData.data[i].f_entity = language(data.req.session.lang_user).__(entityTrad);
						data.preparedData.data[i].f_field = language(data.req.session.lang_user).__(fieldTrad);
					}
				}
			},
			subdatalist: {
				// start: async (data) => {},
				// beforeDatatableQuery: async (data) => {},
				// afterDatatableQuery: async (data) => {},
				// beforeResponse: async (data) => {},
			},
			show: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				afterEntityQuery: (data) => {
					const entity = data.e_inline_help.f_entity;
					data.e_inline_help.f_entity = language(data.req.session.lang_user).__('entity.' + entity + '.label_entity');
					data.e_inline_help.f_field = language(data.req.session.lang_user).__('entity.' + entity + '.' + data.e_inline_help.f_field);
				}
				// beforeRender: async(data) => {}
			},
			create_form: {
				// start: async (data) => {},
				// ifFromAssociation: async(data) => {},
				beforeRender: (data) => {
					const entities = [];
					fs.readdirSync(__dirname + '/../models/attributes/').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json' && file.substring(0, 2) == 'e_').forEach(file => {
						const fields = [];
						const attributesObj = JSON.parse(fs.readFileSync(__dirname + '/../models/attributes/' + file));
						const optionsObj = JSON.parse(fs.readFileSync(__dirname + '/../models/options/' + file));
						const entityName = file.substring(0, file.length - 5);

						for (const field in attributesObj)
							if (field != 'id' && field != 'version' && field.indexOf('f_') == 0)
								fields.push({
									tradKey: 'entity.' + entityName + '.' + field,
									field: field
								});

						for (let i = 0; i < optionsObj.length; i++)
							if (optionsObj[i].structureType == 'relatedTo' || optionsObj[i].structureType == 'relatedToMultiple' || optionsObj[i].structureType == 'relatedToMultipleCheckbox')
								fields.push({
									tradKey: 'entity.' + entityName + '.' + optionsObj[i].as,
									field: optionsObj[i].as
								});

						if (fields.length > 0)
							entities.push({
								tradKey: 'entity.' + entityName + '.label_entity',
								entity: entityName,
								fields: fields
							});
					});
					data.entities = entities;
				}
			},
			create: {
				start: (data) => {
					if (!data.req.body.f_entity ||
						!data.req.body.f_field ||
						data.req.body.f_entity == '' ||
						data.req.body.f_field == '') {
						data.req.session.toastr = [{
							message: 'Selecting an entity and a field is required',
							level: 'error'
						}];
						data.res.error(_ => data.res.redirect('/inline_help/create_form'));
						return false;
					}
				},
				beforeCreateQuery: (data) => {
					data.createObject.f_field = data.req.body.f_field.split('.')[1];
				}
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// start: async (data) => {},
				// afterEntityQuery: async(data) => {},
				beforeRender: (data) => {
					const entity = data.e_inline_help.f_entity;
					data.e_inline_help.f_entity = language(data.req.session.lang_user).__('entity.' + entity + '.label_entity');
					data.e_inline_help.f_field = language(data.req.session.lang_user).__('entity.' + entity + '.' + data.e_inline_help.f_field);
				}
			},
			update: {
				// start: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			loadtab: {
				// start: async (data) => {},
				// beforeValidityCheck: (data) => {},
				// afterValidityCheck: (data) => {},
				// beforeDataQuery: (data) => {},
				// beforeRender: (data) => {},
			},
			set_status: {
				// start: async (data) => {},
				// beforeAllowedCheck: async (data) => {},
				// beforeActionsExecution: async (data) => {},
				// beforeSetStatus: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				// beforeQuery: async (data) => {}
				// beforeResponse: async (data) => {}
			},
			fieldset_remove: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_add: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			destroy: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			list: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			datalist: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			subdatalist: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			show: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			create_form: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "create")
			],
			create: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "create")
			],
			update_form: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "update")
			],
			loadtab: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			set_status: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read"),
				middlewares.statusGroupAccess
			],
			search: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "read")
			],
			fieldset_remove: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "delete")
			],
			fieldset_add: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "create")
			],
			destroy: [
				middlewares.entityAccess(this.entity),
				middlewares.actionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = E_inline_help;