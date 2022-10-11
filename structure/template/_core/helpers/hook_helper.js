const fs = require('fs-extra');

module.exports = {
	getModels: function() {
		if (!this.models)
			this.models = require('@app/models');
		return this.models;
	},
	getAliasFromFk: function (entity, fk) {
		const options = JSON.parse(fs.readFileSync(`${__appPath}/models/options/${entity}.json`, 'utf8'));
		for (const option in options) {
			if (options[option].foreignKey == fk)
				return options[option].as
		}
	},
	getAliasFromName: function (entity, relationEntity) {
		const options = JSON.parse(fs.readFileSync(`${__appPath}/models/options/${entity}.json`, 'utf8'));
		for (const option in options) {
			if (options[option].target == relationEntity)
				return options[option].as
		}
	},
	notTrackField: [
		'createdAt',
		'updatedAt',
		'createdBy',
		'updatedBy',
		'version'
	],
	formatDate: ['YYYY-MM-DD', 'DD/MM/YYYY']
}