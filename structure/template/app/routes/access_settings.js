const CoreAccessSettings = require('@core/routes/access_settings.js');
const helpers = require('@core/helpers');
const access = helpers.access;

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
				access.entityAccessMiddleware("access_settings_api"),
				access.actionAccessMiddleware("access_settings", "read")
			],
			show_group: [
				access.entityAccessMiddleware("access_settings_group"),
				access.actionAccessMiddleware("access_settings", "read")
			],
			show_role: [
				access.entityAccessMiddleware("access_settings_role"),
				access.actionAccessMiddleware("access_settings", "read")
			],
			enable_disable_api: [
				access.entityAccessMiddleware("access_settings_api"),
				access.actionAccessMiddleware("access_settings", "create")
			],
			set_group_access: [
				access.entityAccessMiddleware("access_settings_group"),
				access.actionAccessMiddleware("access_settings", "create")
			],
			set_role_access: [
				access.entityAccessMiddleware("access_settings_role"),
				access.actionAccessMiddleware("access_settings", "create")
			]
		}
	}
}

module.exports = AccessSettings;