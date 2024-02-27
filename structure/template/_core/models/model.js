const modelBuilder = require('@core/helpers/model_builder');
const defaultHooks = require('@core/models/hooks');

class CoreModel {
	constructor(modelName, tableName, attributes, relations) {
		this.modelName = modelName;
		this.attributes = attributes;
		this.relations = relations;
		this.hooks = defaultHooks;

		this.data = {
			tableName: tableName,
			timestamps: true,
			instanceMethods: {},
			classMethods: {}
		};
	}

	associate(models) {
		modelBuilder.buildSequelizeAssociations(models, this.modelName, this.relations);
	}

	// eslint-disable-next-line no-unused-vars
	setInstanceMethods(sequelizeModel) {
		// Override to provide instance methods
		// Ex: sequelizeModel.prototype.instanceMethod = function() {}
	}

	// eslint-disable-next-line no-unused-vars
	setClassMethods(sequelizeModel) {
		// Override to provide class methods
		// Ex: sequelizeModel.classMethod = function() {}
		sequelizeModel.getAttributes = () => this.attributes;
		sequelizeModel.getRelations = () => this.relations;
	}

}

module.exports = CoreModel;