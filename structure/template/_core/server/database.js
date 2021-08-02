const models = require('@app/models');
const ormHelper = require('@core/helpers').orm;

module.exports = (async() => {
	await models.sequelize.sync({logging: false, hooks: false});

	await ormHelper.customAfterSync();

	const users = await models.E_user.findAll();

	// Check if user admin exists
	const hasAdmin = users.filter(user => user.f_login == 'admin').length != 0;

	if (users.length == 0 || !hasAdmin) {

		// Fake user for tracability
		const system = {user: {f_login: 'system'}};

		const [adminGroup, adminRole, admin] = await Promise.all([
			models.E_group.create({
				version: 0,
				f_label: 'admin'
			}, system),
			models.E_role.create({
				version: 0,
				f_label: 'admin'
			}, system),
			models.E_user.create({
				f_login: 'admin',
				f_email: 'admin@local.fr',
				f_password: null,
				f_enabled: 0,
				version: 0
			}, system)
		]);

		await Promise.all([
			admin.setR_role(adminRole.id),
			admin.setR_group(adminGroup.id)
		]);
	}
})();