const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/ENTITY_NAME');
const attributes = require('@app/models/attributes/ENTITY_NAME');

const helpers = require('@core/helpers');
const access = helpers.access;

const upload = require('multer');
const multer = upload();

class MODEL_NAME extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('ENTITY_NAME', attributes, options, helpers, additionalRoutes);
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
				// beforeUpdate: async (data) => {},
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
				// beforeAllowedCheck: async (data) => {},
				// beforeActionsExecution: async (data) => {},
				// beforeSetStatus: async (data) => {},
				// beforeRedirect: async (data) => {}
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
				access.actionAccessMiddleware(this.entity, "create"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.newmipsType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			update_form: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				access.actionAccessMiddleware(this.entity, "update"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.newmipsType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
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

module.exports = MODEL_NAME;