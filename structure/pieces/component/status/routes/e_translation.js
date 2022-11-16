const Entity = require('@core/abstract_routes/entity');
const middlewares = require('@core/helpers/middlewares');
const fs = require('fs-extra');
const options = require('@app/models/options/e_translation');
const attributes = require('@app/models/attributes/e_translation');
const helpers = require('@core/helpers');

class Translation extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_translation', attributes, options, helpers, additionalRoutes);
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
				// beforeResponse: async(data) => {}
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
				// afterEntityQuery: async(data) => {},
				beforeRender: async(data) => {
					// Give children status entity/field translation
					for (let i = 0; data.e_translation.r_children && i < data.e_translation.r_children.length; i++) {
						const curr = data.e_translation.r_children[i];
						const entityTradKey = 'entity.' + curr.f_entity + '.label_entity';
						curr.f_field = 'entity.' + curr.f_entity + '.' + curr.f_field;
						curr.f_entity = entityTradKey;
					}
				}
			},
			create_form: {
				// start: async (data) => {},
				// ifFromAssociation: async(data) => {},
				beforeRender: (data) => {
					data.languages = [];
					fs.readdirSync(__appPath + '/locales').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json' && file != 'enum_radio.json').forEach(file => {
						data.languages.push(file.substring(0, file.length - 5));
					});
				}
			},
			create: {
				// start: async (data) => {},
				// beforeCreateQuery: async(data) => {},
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// start: async (data) => {},

				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
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
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
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
				middlewares.actionAccess(this.entity, "read")
			],
			datalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			subdatalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			show: [
				middlewares.actionAccess(this.entity, "read")
			],
			create_form: [
				middlewares.actionAccess(this.entity, "create")
			],
			create: [
				middlewares.actionAccess(this.entity, "create")
			],
			update_form: [
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.actionAccess(this.entity, "update")
			],
			loadtab: [
				middlewares.actionAccess(this.entity, "read")
			],
			set_status: [
				middlewares.actionAccess(this.entity, "read"),
				middlewares.statusGroupAccess
			],
			search: [
				middlewares.actionAccess(this.entity, "read")
			],
			fieldset_remove: [
				middlewares.actionAccess(this.entity, "delete")
			],
			fieldset_add: [
				middlewares.actionAccess(this.entity, "create")
			],
			destroy: [
				middlewares.actionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = Translation;