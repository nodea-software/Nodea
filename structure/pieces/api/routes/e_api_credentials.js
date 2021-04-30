const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_api_credentials');
const attributes = require('@app/models/attributes/e_api_credentials');

const helpers = require('@core/helpers');
const access = helpers.access;

const randomString = require('randomstring');

class E_api_credentials extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_api_credentials', attributes, options, helpers, additionalRoutes);
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
				// beforeRender: async(data) => {}
			},
			create_form: {
				// start: async (data) => {},
				// ifFromAssociation: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create: {
				// start: async (data) => {},
				beforeCreateQuery: (data) => {
					data.createObject.f_client_key = randomString.generate(15);
					data.createObject.f_client_secret = randomString.generate(15);
				},
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
				access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			update_form: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			loadtab: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				access.actionAccessMiddleware(this.entity, "read"),
				access.statusGroupAccess
			],
			search: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				access.actionAccessMiddleware(this.entity, "delete")
			]
		}
	}
}

module.exports = E_api_credentials;