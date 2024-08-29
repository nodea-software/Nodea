const attributes = require('@app/models/attributes/e_user');
const options = require('@app/models/options/e_user');
const middlewares = require('@core/helpers/middlewares');
const ApiEntity = require('@core/abstract_routes/api_entity');

// Define private attributes that will not be accessed by API
const privateAttributes = [];
for (const attribute in attributes) {
	if (attribute != 'f_password' && attribute != 'f_enabled' && attribute != 'f_token_password_reset')
		privateAttributes.push(attribute);
}

class ApiE_user extends ApiEntity {
	constructor() {
		const additionalRoutes = [];
		super('e_user', attributes, options, additionalRoutes)
	}

	get hooks() {
		return {
			find:{
				beforeFind: data => {
					data.query.attributes = privateAttributes;
				},
				// afterFind: async data => {},
			},
			findOne:{
				beforeFind: data => {
					data.query.attributes = privateAttributes;
				},
				// afterFind: async data => {},
			},
			findAssociation:{
				// beforeFind: async data => {},
				// afterFind: async data => {},
			},
			create:{
				beforeCreate: data => {
					for (const field in data.createObject || {})
						if (!privateAttributes.includes(field))
							delete data.createObject[field];
				},
				// beforeAssociations: async data => {},
				// afterAssociations: async data => {},
			},
			update:{
				beforeUpdate: data => {
					for (const field in data.updateObject || {})
						if (!privateAttributes.includes(field))
							delete data.updateObject[field];
				},
				// beforeAssociations: async data => {},
				// afterAssociations: async data => {},
			},
			destroy:{
				// beforeDestroy: async data => {},
				// afterDestroy: async data => {},
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

module.exports = ApiE_user;
