const CoreModel = require('@core/models/model');
const attributes = require("./attributes/MODEL_NAME_LOWER.json");
const relations = require("./options/MODEL_NAME_LOWER.json");

class MODEL_NAME extends CoreModel {
	constructor() {
		super('MODEL_NAME', 'TABLE_NAME', attributes, relations);
	}
}

module.exports = MODEL_NAME;