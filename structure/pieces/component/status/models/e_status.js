const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_status.json");
const relations = require("./options/e_status.json");

class E_status extends CoreModel {
	constructor() {
		super('E_status', 'e_status', attributes, relations);
	}

	setInstanceMethods(sequelizeModel) {
		sequelizeModel.prototype.translate = this.translate;
		sequelizeModel.prototype.executeActions = this.executeActions;
	}

	translate(lang) {
		if (!this.r_translations)
			return;
		for (let i = 0; i < this.r_translations.length; i++)
			if (this.r_translations[i].f_language == lang) {
				this.f_name = this.r_translations[i].f_value;
				break;
			}
	}

	// TODO: Obsolete
	// async executeActions(entitySource) {
	// 	for (const action of this.r_actions || []) {
	// 		if (!action.r_media)
	// 			continue;
	// 		// eslint-disable-next-line no-await-in-loop
	// 		await action.r_media.execute(entitySource);
	// 	}
	// }
}

module.exports = E_status;