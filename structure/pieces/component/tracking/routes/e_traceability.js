const Tracking = require('@core/routes/tracking');

const options = require('@app/models/options/e_traceability');
const attributes = require('@app/models/attributes/e_traceability');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

class E_traceability extends Tracking {
	constructor() {
		super('e_traceability', attributes, options, helpers);
	}

	get hooks() {
		return {
			list: {
				// start: async(data) => {},
				// beforeRender: async(data) => {}
			},
			datalist: {
				// start: async(data) => {},
				// beforeDatatableQuery: async(data) => {},
				// afterDatatableQuery: async(data) => {},
				// beforeResponse: async(data) => {}
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
			]
		}
	}
}

module.exports = E_traceability;