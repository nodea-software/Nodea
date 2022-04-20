const fs = require('fs-extra');
const models = require('@app/models');
const entity_helper = require('./entity');
const model_builder = require('./model_builder');
const language = require('./language');
const address_fields = ['f_label', 'f_number', 'f_street_1', 'f_street_2', 'f_postal_code', 'f_city', 'f_country', 'f_lat', 'f_lon'];

function buildObjFromBody() {

}

module.exports = {
	createAddress: async function({body, user}, entityObject, relations, transaction) {
		const address_relations = relations.filter(x => x.component == 'address');
		const promises = [];
		for (const relation of address_relations) {
			const create_obj = {};
			for (const idx in address_fields) {
				const field = address_fields[idx];
				create_obj[field] = body[`${relation.as}.${field}`]
			}
			const func = 'create' + relation.as.capitalizeFirstLetter();
			promises.push(entityObject[func](create_obj, {
				user,
				transaction
			}));
		}
		await Promise.all(promises);
	},
	updateAddress: async function({body, user}, entityObject, relations, transaction) {
		const address_relations = relations.filter(x => x.component == 'address');
		const promises = [];
		for (const relation of address_relations) {
			promises.push((async _ => {

				const address = await entityObject['get' + relation.as.capitalizeFirstLetter()]();
				if(!address)
					return await this.createAddress({body, user}, entityObject, relations, transaction);

				const update_obj = {};
				for (const idx in address_fields) {
					const field = address_fields[idx];
					update_obj[field] = body[`${relation.as}.${field}`]
				}

				await address.update(update_obj, {
					user,
					transaction
				});
			})());
		}
		await Promise.all(promises);
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
