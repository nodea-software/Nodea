const CoreParamEntity = require('@core/routes/param_entity');

const options = require('@app/models/options/ENTITY_NAME');
const attributes = require('@app/models/attributes/ENTITY_NAME');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

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
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.actionAccess(this.entity, "update"),
				middlewares.fileInfo(this.fileFields)
			],
			search: [
				middlewares.actionAccess(this.entity, "read")
			]
		}
	}
}

module.exports = MODEL_NAME;