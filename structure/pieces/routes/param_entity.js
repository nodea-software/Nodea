const CoreParamEntity = require('@core/routes/param_entity');

const options = require('@app/models/options/ENTITY_NAME');
const attributes = require('@app/models/attributes/ENTITY_NAME');

const helpers = require('@core/helpers');
const access = helpers.access;

const upload = require('multer');
const multer = upload();

class MODEL_NAME extends CoreParamEntity {
	constructor() {
		const additionalRoutes = [];
		super('ENTITY_NAME', attributes, options, helpers, additionalRoutes);
	}

	get hooks() {
		return {
			update_form: {
				// start: async (data) => {},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				// start: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			}
		};
	}

	get middlewares() {
		return {
			update_form: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
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
			search: [
				access.actionAccessMiddleware(this.entity, "read")
			]
		}
	}
}

module.exports = MODEL_NAME;