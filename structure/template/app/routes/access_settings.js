const CoreAccessSettings = require('@core/routes/access_settings.js');
const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

class AccessSettings extends CoreAccessSettings {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			show_api: [
				middlewares.entityAccess("access_settings_api"),
				middlewares.actionAccess("access_settings", "read")
			],
			show_group: [
				middlewares.entityAccess("access_settings_group"),
				middlewares.actionAccess("access_settings", "read")
			],
			show_role: [
				middlewares.entityAccess("access_settings_role"),
				middlewares.actionAccess("access_settings", "read")
			],
			enable_disable_api: [
				middlewares.entityAccess("access_settings_api"),
				middlewares.actionAccess("access_settings", "create")
			],
			set_group_access: [
				middlewares.entityAccess("access_settings_group"),
				middlewares.actionAccess("access_settings", "create")
			],
			set_role_access: [
				middlewares.entityAccess("access_settings_role"),
				middlewares.actionAccess("access_settings", "create")
			]
		}
	}
}

module.exports = AccessSettings;