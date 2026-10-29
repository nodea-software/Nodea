const CoreModel = require("@core/models/model");
const attributes = require("./attributes/e_token.json");
const relations = require("./options/e_token.json");

class E_token extends CoreModel {
	constructor() {
		super("E_token", "e_token", attributes, relations);
		this.data.timestamps = false;
	}
}

module.exports = E_token;
