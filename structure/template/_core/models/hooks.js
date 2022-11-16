const trackingConfig = require('@config/tracking.json');
const fs = require('fs-extra');
const language = require('@core/helpers/language');
const {
	getModels,
	getAliasFromFk,
	getAliasFromName,
	notTrackField,
	formatDate
} = require('@core/helpers/hook_helper');
const __ = language("fr-FR").__;
const dayjs = require('dayjs');

module.exports = {
	insertCreatedBy: {
		// Hook is expecting a user to set createdBy
		// If user equals false, warning is disabled
		type: 'beforeCreate',
		func: async (model, args) => {
			try {
				// No user
				if(args.user === undefined || args.user === null)
					throw 'No user provided for createdBy on table -> ' + model.constructor.tableName;

				// Disabled
				if (args.user === false)
					return;

				// No login
				if (!args.user.f_login)
					throw 'Couldn\'t get user login for createdBy on table -> ' + model.constructor.tableName;

				model.createdBy = args.user.f_login;
			} catch (errMsg) {
				console.log('WARN '+errMsg);
			}
		}
	},
	insertUpdatedBy: {
		// Hook is expecting a user to set updatedBy
		// If user equals false, warning is disabled
		type: 'beforeUpdate',
		func: async (model, args) => {
			try {
				// No user
				if(args.user === undefined || args.user === null)
					throw 'No user provided for updatedBy on table -> ' + model.constructor.tableName;

				// Disabled
				if (args.user === false)
					return;

				// No login
				if (!args.user.f_login)
					throw 'Couldn\'t get user login for updatedBy on table -> ' + model.constructor.tableName;

				model.updatedBy = args.user.f_login;
			} catch (errMsg) {
				console.log('WARN '+errMsg);
			}
		}
	},
	traceabilityCreate: {
		type: 'afterCreate',
		func: async (model, options) => {
			try {
				const modelName = model.constructor.getTableName();
				const values = model.dataValues;
				let idEntitySource = values.id;
				let relationPath = '';

				const acceptedModelTracking = Object.keys(trackingConfig);
				if(options.upperEntity && !acceptedModelTracking.includes(options.upperEntity)){
					return;
				}

				if(!options.upperEntity && !acceptedModelTracking.includes(options.entitySource)){
					return;
				}

				if(!options.upperEntity && options.entitySource !== modelName){
					relationPath = `${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					idEntitySource = options.entitySourceID ? options.entitySourceID : idEntitySource;
					const acceptedNestedModelTracking = Object.keys(trackingConfig[options.entitySource]);
					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				if(options.upperEntity){
					relationPath = `${options.upperEntity}.${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					idEntitySource = options.upperEntityID ? options.upperEntityID : idEntitySource;
					let acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity]);
					if(!acceptedNestedModelTracking.includes(options.entitySource)){
						return;
					}

					acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity][options.entitySource])

					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				const attributes = JSON.parse(fs.readFileSync(`${__appPath}/models/attributes/${modelName}.json`, 'utf8'));
				let changesNewValues = '';
				for (const item in values) {

					if (typeof attributes[item] !== "undefined" && attributes[item].type == "DATE") {
						values[item] = values[item] ? dayjs(values[item], formatDate).format("DD/MM/YYYY HH:mm") : values[item];
					}

					if(typeof attributes[item] !== "undefined" && attributes[item].nodeaType === 'password'){
						continue;
					}

					if (notTrackField.includes(item))
						continue;

					let translatedKey = item;
					// If foreign key, we need the alias to translate the key
					if (translatedKey.startsWith("fk_")) {
						translatedKey = getAliasFromFk(modelName, translatedKey)
					}
					let translatedItem = __(`entity.${modelName}.${translatedKey}`);

					if (translatedKey.startsWith("r_")) {
						translatedKey = translatedKey.charAt(0).toUpperCase() + translatedKey.toLowerCase().slice(1);
					}

					// Keep the field like in BDD if no translation found
					if (translatedItem.startsWith("entity."))
						translatedItem = item;

					if(values[item]){
						changesNewValues += `<b>${translatedItem}:</b> ${values[item]}<br>`;
					}
				}

				let userID = null;
				if(!options.user){
					console.warn(`Missing USER for the traceability => ${options.entitySource} (CREATE)`);
				} else {
					userID = options.user.id;
				}

				const objTracabilite = {
					f_entity: options.upperEntity ? options.upperEntity : options.entitySource,
					f_relation_path: relationPath,
					f_id_entity: idEntitySource,
					f_before: '',
					f_after: changesNewValues,
					f_action: 'CREATION',
					fk_id_user_user: userID
				};

				if(!objTracabilite.f_after){
					return;
				}

				getModels().E_traceability.create(objTracabilite, {user: options.user}).catch(function(err) {
					console.error("Error on generate traceability.");
					console.error(err);
				});
			} catch (err) {
				console.error("Error on generate traceability.");
				console.error(err);
			}
		}
	},
	traceabilityUpdate: {
		type: 'afterUpdate',
		func: async (model, options) => {
			try {
				const modelName = model.constructor.getTableName();
				const values = model.dataValues;
				let idEntitySource = values.id;
				const oldValues = model._previousDataValues;
				let relationPath = '';

				const acceptedModelTracking = Object.keys(trackingConfig);
				if(options.upperEntity && !acceptedModelTracking.includes(options.upperEntity)){
					return;
				}

				if(!options.upperEntity && !acceptedModelTracking.includes(options.entitySource)){
					return;
				}

				if(!options.upperEntity && options.entitySource !== modelName){
					relationPath = `${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					idEntitySource = options.entityID ? options.entityID : idEntitySource;
					const acceptedNestedModelTracking = Object.keys(trackingConfig[options.entitySource]);
					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				if(options.upperEntity){
					relationPath = `${options.upperEntity}.${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					idEntitySource = options.upperEntityID ? options.upperEntityID : idEntitySource;
					let acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity]);
					if(!acceptedNestedModelTracking.includes(options.entitySource)){
						return;
					}

					acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity][options.entitySource])

					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				const attributes = JSON.parse(fs.readFileSync(`${__appPath}/models/attributes/${modelName}.json`, 'utf8'));
				let changesOldValues = '';
				let changesNewValues = '';

				for (const item in values) {

					if (typeof attributes[item] !== "undefined" && attributes[item].type == "DATE") {
						values[item] = values[item] ? dayjs(values[item], formatDate).format("DD/MM/YYYY HH:mm") : values[item];
						oldValues[item] = oldValues[item] ? dayjs(oldValues[item], formatDate).format("DD/MM/YYYY HH:mm") : oldValues[item];
					}

					if(typeof attributes[item] !== "undefined" && attributes[item].nodeaType === 'password'){
						continue;
					}

					for (const oldItem in oldValues) {
						if (item != oldItem || values[item] == oldValues[oldItem])
							continue;

						if (notTrackField.includes(item))
							continue;

						let translatedKey = item;
						// If foreign key, we need the alias to translate the key
						if (translatedKey.startsWith("fk_")) {
							translatedKey = getAliasFromFk(modelName, translatedKey)
						}
						let translatedItem = __(`entity.${modelName}.${translatedKey}`);

						if (translatedKey.startsWith("r_")) {
							translatedKey = translatedKey.charAt(0).toUpperCase() + translatedKey.toLowerCase().slice(1);
						}

						// Keep the field like in BDD if no translation found
						if (translatedItem.startsWith("entity.")){
							translatedItem = item;
						}

						changesOldValues += `<b>${translatedItem}:</b> ${oldValues[oldItem] ? oldValues[oldItem] : '' }<br>`;
						changesNewValues += `<b>${translatedItem}:</b> ${values[item] ? values[item] : ''}<br>`;
					}
				}

				let userID = null;
				if(!options.user){
					console.warn(`Missing USER for the traceability => ${options.entitySource} (UPDATE)`);
				} else {
					userID = options.user.id;
				}

				const objTracabilite = {
					f_entity: options.upperEntity ? options.upperEntity : options.entitySource,
					f_relation_path: relationPath,
					f_id_entity: idEntitySource,
					f_before: changesOldValues,
					f_after: changesNewValues,
					f_action: 'MODIFICATION',
					fk_id_user_user: userID
				};

				if(!objTracabilite.f_after){
					return;
				}

				await getModels().E_traceability.create(objTracabilite, {user: options.user});

			} catch (err) {
				console.error("Error on generate traceability.");
				console.error(err);
			}
		}
	},
	traceabilityDelete: {
		type: 'afterDestroy',
		func: async (model, options) => {
			try {
				const modelName = model.constructor.getTableName();
				const oldValues = model._previousDataValues;
				let relationPath = '';

				const acceptedModelTracking = Object.keys(trackingConfig);
				if(options.upperEntity && !acceptedModelTracking.includes(options.upperEntity)){
					return;
				}

				if(!options.upperEntity && !acceptedModelTracking.includes(options.entitySource)){
					return;
				}

				if(!options.upperEntity && options.entitySource !== modelName){
					relationPath = `${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					const acceptedNestedModelTracking = Object.keys(trackingConfig[options.entitySource]);
					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				if(options.upperEntity){
					relationPath = `${options.upperEntity}.${options.entitySource}.${getAliasFromName(options.entitySource, modelName)}`;
					let acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity]);
					if(!acceptedNestedModelTracking.includes(options.entitySource)){
						return;
					}

					acceptedNestedModelTracking = Object.keys(trackingConfig[options.upperEntity][options.entitySource])

					if(!acceptedNestedModelTracking.includes(modelName)){
						return;
					}
				}

				const attributes = JSON.parse(fs.readFileSync(`${__appPath}/models/attributes/${modelName}.json`, 'utf8'));
				let changesOldValues = '';
				for (const oldItem in oldValues) {

					if (notTrackField.includes(oldItem))
						continue;

					if (typeof attributes[oldItem] !== "undefined" && attributes[oldItem].type == "DATE") {
						oldValues[oldItem] = oldValues[oldItem] ? dayjs(oldValues[oldItem], formatDate).format("DD/MM/YYYY HH:mm") : oldValues[oldItem];
					}

					let translatedKey = oldItem;
					// If foreign key, we need the alias to translate the key
					if (translatedKey.startsWith("fk_")) {
						translatedKey = getAliasFromFk(modelName, translatedKey)
					}
					let translatedItem = __(`entity.${modelName}.${translatedKey}`);

					if (translatedKey.startsWith("r_")) {
						translatedKey = translatedKey.charAt(0).toUpperCase() + translatedKey.toLowerCase().slice(1);
					}

					// Keep the field like in BDD if no translation found
					if (translatedItem.startsWith("entity.")){
						translatedItem = oldItem;
					}

					changesOldValues += `<b>${translatedItem}:</b> ${oldValues[oldItem] ? oldValues[oldItem] : '' }<br>`;
				}

				let userID = null;
				if(!options.user){
					console.warn(`Missing USER for the traceability => ${options.entitySource} (DELETE)`);
				} else {
					userID = options.user.id;
				}

				const objTracabilite = {
					f_entity: options.upperEntity ? options.upperEntity : options.entitySource,
					f_relation_path: relationPath,
					f_id_entity: oldValues.id,
					f_before: changesOldValues,
					f_after: '',
					f_action: 'SUPPRESSION',
					fk_id_user_user: userID
				};

				getModels().E_traceability.create(objTracabilite, {user: options.user}).catch(function(err) {
					console.error("Error on generate traceability.");
					console.error(err);
				});
			} catch (err) {
				console.error("Error on generate traceability.");
				console.error(err);
			}
		}
	}
}
