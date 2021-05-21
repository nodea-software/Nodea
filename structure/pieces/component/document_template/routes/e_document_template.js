const CoreDocumentTemplate = require('@core/routes/document_template');

const options = require('@app/models/options/e_document_template');
const attributes = require('@app/models/attributes/e_document_template');

const appConf = require('@config/application');

const helpers = require('@core/helpers');
const access = helpers.access;

const upload = require('multer');
const multer = upload();

function getLabelFromFormatCode(code) {
	const format = appConf.document_template.format_pairs.filter(f => f.code == code)
	return format[0] && format[0].label || code;
}

class DocumentTemplate extends CoreDocumentTemplate {
	constructor() {
		const additionalRoutes = [];
		super('e_document_template', attributes, options, helpers, additionalRoutes);

		this.defaultMiddlewares = [
			access.isLoggedIn
		];
	}

	get hooks() {
		return {
			entity_list: {
				// start: async data => {}
				// beforeResponse: async data => {}
			},
			generate: {
				// beforeTemplateRequest: async (data) => {},
				// afterTemplateRequest: async (data) => {},
				// beforeAccessCheck: async (data) => {},
				// afterTemplateInitialization: async (data) => {},
				// beforeTemplateGeneration: async (data) => {},
			},
			help: {
				// beforeRender: async(data) => {},
			},
			help_entity: {

			},
			list: {
				// beforeRender: async(data) => {}
			},
			datalist: {
				// beforeDatatableQuery: async(data) => {},
				beforePreparingData: (data) => {
					const language = this.helpers.language(data.req.session.lang_user);
					for (const row of data.rawData.data)
						row.f_format_pair = language.__(getLabelFromFormatCode(row.f_format_pair))
				},
				// beforeResponse: async(data) => {}
			},
			subdatalist: {},
			show: {
				afterEntityRequest: (data) => {
					const language = this.helpers.language(data.req.session.lang_user);
					data.e_document_template.f_format_pair = language.__(getLabelFromFormatCode(data.e_document_template.f_format_pair));
				},
				// beforeRender: async(data) => {}
			},
			create_form: {
				// ifFromAssociation: async(data) => {},
				beforeRender: (data) => {
					const language = this.helpers.language(data.req.session.lang_user);
					data.format_pairs = appConf.document_template.format_pairs.map(f => {return {code: f.code, label: language.__(f.label)}});
				}
			},
			create: {
				// beforeCreateRequest: async(data) => {},
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// afterEntityRequest: async(data) => {},
				beforeRender: (data) => {
					const language = this.helpers.language(data.req.session.lang_user);
					data.format_pairs = appConf.document_template.format_pairs.map(f => {return {code: f.code, label: language.__(f.label)}});
				}
			},
			update: {
				// beforeRedirect: async(data) => {}
			},
			loadtab: {
				// tabData: async(data) => {}
			},
			set_status: {
				// beforeStatusChange: async(data) => {},
				// afterStatusChange: async(data) => {}
			},
			search: {},
			fieldset_remove: {},
			fieldset_add: {},
			destroy: {
				// beforeEntityRequest: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			entity_list: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			// Access to generate is checked inside the route using template's r_role/r_group
			// Nothing to do here
			generate: [],
			help: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			help_entity: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			list: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "create"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.nodeaType))
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
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "update"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.nodeaType))
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
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read"),
				access.statusGroupAccess
			],
			search: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				access.entityAccessMiddleware(this.entity),
				access.actionAccessMiddleware(this.entity, "delete")
			]
		}
	}
}

module.exports = DocumentTemplate;