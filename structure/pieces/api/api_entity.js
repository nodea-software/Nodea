const attributes = require('@app/models/attributes/ENTITY_NAME');
const options = require('@app/models/options/ENTITY_NAME');
const middlewares = require('@core/helpers/middlewares');
const ApiEntity = require('@core/abstract_routes/api_entity');

class ApiMODEL_NAME extends ApiEntity {
	constructor() {
		const additionalRoutes = [];
		super('ENTITY_NAME', attributes, options, additionalRoutes)
	}

	get hooks() {
		return {
			find:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			findOne:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			findAssociation:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			create:{
				// beforeCreate: async _ => {},
				// beforeAssociations: async _ => {},
				// afterAssociations: async _ => {},
			},
			update:{
				// beforeUpdate: async _ => {},
				// beforeAssociations: async _ => {},
				// afterAssociations: async _ => {},
			},
			destroy:{
				// beforeDestroy: async _ => {},
				// afterDestroy: async _ => {},
			}
		}
	}

	get middlewares() {
		return {
			find:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			findOne:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			findAssociation:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			create:[
				middlewares.apiActionAccess(this.entity, "create")
			],
			update:[
				middlewares.apiActionAccess(this.entity, "update")
			],
			destroy:[
				middlewares.apiActionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = ApiMODEL_NAME;
