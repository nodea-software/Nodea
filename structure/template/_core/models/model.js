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

	setInstanceMethods(sequelizeModel) {
		// Override to provide instance methods
		// Ex: sequelizeModel.prototype.instanceMethod = function() {}
	}

	setClassMethods(sequelizeModel) {
		// Override to provide class methods
		// Ex: sequelizeModel.classMethod = function() {}
	}

}

module.exports = CoreModel;