const attributes = require('@app/models/attributes/e_user');
const options = require('@app/models/options/e_user');
const access = require('@core/helpers/access');

const ApiEntity = require('@core/abstract_routes/api_entity');

// TODO: Change publicAttributes to privateAttributes
const publicAttributes = [];
for (const attribute in attributes) {
	if (attribute != 'f_password' && attribute != 'f_enabled' && attribute != 'f_token_password_reset')
		publicAttributes.push(attribute);
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
					data.query.attributes = publicAttributes;
				},
				// afterFind: async data => {},
			},
			findOne:{
				beforeFind: data => {
					data.query.attributes = publicAttributes;
				},
				// afterFind: async data => {},
			},
			findAssociation:{
				// beforeFind: async data => {},
				// afterFind: async data => {},
			},
			create:{
				beforeCreate: data => {
					for (const field of data.createObject || {})
						if (!publicAttributes.includes(field))
							delete data.createObject[field];
				},
				// beforeAssociations: async data => {},
				// afterAssociations: async data => {},
			},
			update:{
				beforeUpdate: data => {
					for (const field of data.updateObject || {})
						if (!publicAttributes.includes(field))
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
			find:[],
			findOne:[],
			findAssociation:[],
			create:[],
			update:[],
			destroy:[]
		}
	}
}

module.exports = ApiE_user;
