const fs = require('fs-extra');

const models = require('@app/models');
const entity_helper = require('./entity');
const model_builder = require('./model_builder');
const language = require('./language');

module.exports = {
	setAddressIfComponentExists: async function(entityObject, options, body, transaction) {
		const option = entity_helper.findInclude(options, 'as', "r_address");
		if (!option || option.targetType != "component")
			return;

		const componentAttributes = require('@app/models/attributes/' + option.target + '.json'); // eslint-disable-line
		const componentOptions = require('@app/models/options/' + option.target + '.json'); // eslint-disable-line
		const [objectToCreate] = model_builder.parseBody(option.target, componentAttributes, componentOptions, body);
		const componentModelName = option.target.capitalizeFirstLetter();
		const e_created = await models[componentModelName].create(objectToCreate, {
			transaction
		});
		const func = 'set' + option.as.capitalizeFirstLetter();
		await entityObject[func](e_created, {
			transaction
		});
	},
	updateAddressIfComponentExists: async function(entityObject, options, body, transaction) {
		if (!entityObject.fk_id_address)
			return this.setAddressIfComponentExists(entityObject, options, body, transaction);

		const option = entity_helper.findInclude(options, 'as', "r_address");
		if (option && option.targetType === "component" && body.address_id) {
			const componentAttributes = require('@app/models/attributes/' + option.target + '.json'); // eslint-disable-line
			const componentOptions = require('@app/models/options/' + option.target + '.json'); // eslint-disable-line
			const [objectToCreate] = model_builder.parseBody(option.target, componentAttributes, componentOptions, body || {});
			const componentModelName = option.target.capitalizeFirstLetter();
			await models[componentModelName].update(objectToCreate, {
				where: {
					id: body.address_id
				}
			}, {
				transaction
			});
		}
	},
	buildComponentAddressConfig: lang => {
		const result = [];
		const trads = language(lang);
		try {
			const config = JSON.parse(fs.readFileSync(__configPath + '/address_settings.json'));
			if (config && config.entities) {
				for (const item in config.entities) {
					const entityTrad = trads.__('entity.' + item + '.label_entity');
					let entity = item.replace('e_', '');
					entity = entity.charAt(0).toUpperCase() + entity.slice(1);
					config.entities[item].entity = entity;
					config.entities[item].entityTrad = entityTrad;
					result.push(config.entities[item]);
				}
				return result;
			}
			return result;
		} catch (e) {
			console.error(e);
			return result;
		}
	},
	getMapsConfigIfComponentAddressExists: entity => {
		let result = {enableMaps: false};
		try {
			const config = JSON.parse(fs.readFileSync(__configPath + '/address_settings.json'));
			if (config && config.entities && config.entities[entity]) {
				result = config.entities[entity];
				for (const item in config.entities[entity].mapsPosition)
					if (config.entities[entity].mapsPosition[item] === true) {
						result.mapsPosition = item;
						break;
					}
				return result;
			} return result;
		} catch (e) {
			return result;
		}
	}
};
