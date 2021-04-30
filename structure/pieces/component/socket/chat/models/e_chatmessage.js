const attributes = require("./attributes/e_chatmessage.json");
const options = require("./options/e_chatmessage.json");
const modelBuilder = require('@core/helpers/model_builder');
const defaultHooks = require('@core/models/hooks');

const modelName = 'E_chatmessage';
const tableName = 'e_chat_chatmessage';

const { DataTypes, Model } = require('sequelize');

class E_chatmessage extends Model {
	static name() {return modelName}

	static load(sequelize) {

		const builtAttributes = modelBuilder.buildSequelizeAttributes(DataTypes, attributes);
		const hooks = defaultHooks;

		E_chatmessage.init(builtAttributes, {
			sequelize,
			modelName,
			tableName,
			timestamps: true
		});

		for (const hookType in hooks)
			for (const hook of hooks[hookType])
				E_chatmessage.addHook(hookType, hook.name, hook.func)
	}

	static associate(models) {
		modelBuilder.buildSequelizeAssociations(models, modelName, options);
	}

	// Model function
	// static modelFunc()

	// Instance function
	// instanceFunc()
}

module.exports = E_chatmessage;