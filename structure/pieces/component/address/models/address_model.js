const CoreModel = require('@core/models/model');
const attributes = require("./attributes/MODEL_NAME_LOWER.json");
const relations = require("./options/MODEL_NAME_LOWER.json");

class MODEL_NAME extends CoreModel {
	constructor() {
		super('MODEL_NAME', 'TABLE_NAME', attributes, relations);

		this.attributes.f_address_label = {
			...this.attributes.f_address_label,
			type: 'VIRTUAL',
			get() {
				const ignore = ['id', 'version', 'f_address_label', 'f_address_lat', 'f_address_lon'];
				const address_label = [];
				for (const field in attributes)
					if (!ignore.includes(field) && this[field] && this[field] != '')
						address_label.push(this[field]);
				return address_label.join(' ');
			}
		}
	}
}

module.exports = MODEL_NAME;