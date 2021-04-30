const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_media.json");
const relations = require("./options/e_media.json");

class E_media extends CoreModel {
	constructor() {
		super('E_media', 'e_media', attributes, relations);
	}

	setInstanceMethods(sequelizeModel) {
		sequelizeModel.prototype.getFieldsToInclude = this.getFieldsToInclude;
		sequelizeModel.prototype.execute = this.execute;
	}

	getFieldsToInclude() {
		const mediaType = this.f_type.toLowerCase();
		if (!this['r_media_' + mediaType]) {
			console.error("No media with type " + mediaType);
			return null;
		}
		return this['r_media_' + mediaType].parseForInclude();
	}

	async execute(data) {
		const mediaType = this.f_type.toLowerCase();
		if (!this['r_media_' + mediaType])
			throw new Error("No media with type " + mediaType);
		await this['r_media_' + mediaType].execute(data);
	}
}

module.exports = E_media;