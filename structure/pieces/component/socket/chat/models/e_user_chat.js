const attributes = require("./attributes/e_user_chat.json");
const options = require("./options/e_user_chat.json");
const modelBuilder = require('@core/helpers/model_builder');
const defaultHooks = require('@core/models/hooks');

const modelName = 'E_user_chat';
const tableName = 'chat_user_chat';

const { DataTypes, Model } = require('sequelize');

class E_user_chat extends Model {
	static name() {return modelName}

	static load(sequelize) {

		const builtAttributes = modelBuilder.buildSequelizeAttributes(DataTypes, attributes);
		const hooks = defaultHooks;

		E_user_chat.init(builtAttributes, {
			sequelize,
			modelName,
			tableName,
			timestamps: true
		});

		for (const hookType in hooks)
			for (const hook of hooks[hookType])
				E_user_chat.addHook(hookType, hook.name, hook.func)
	}

	static associate(models) {
		modelBuilder.buildSequelizeAssociations(models, modelName, options);
	}

	// Model function
	// static modelFunc()

	// Instance function
	// instanceFunc()
}

module.exports = E_user_chat;