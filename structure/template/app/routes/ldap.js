const CoreLdap = require("@core/routes/ldap");

class Ldap extends CoreLdap {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {};
	}

	get middlewares() {
		return {
			configuration: [],
			saveSettings: [],
			getGroupSettings: [],
		};
	}
}

module.exports = Ldap;
