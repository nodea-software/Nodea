const models = require('@app/models');
const ormHelper = require('@core/helpers').orm;

module.exports = (async() => {
	// Sequelize models sync
	await models.sequelize.sync({logging: false, hooks: false});

	// Nodea handle toSync.json, for database alteration
	await ormHelper.customAfterSync();

	const count_user = await models.E_user.count();
	// Application have already users, no need to init admin
	if (count_user > 0)
		return;

	// System user for tracability
	const system = {user: {f_login: 'system'}};

	const [adminGroup, adminRole, admin] = await Promise.all([
		models.E_group.findOrCreate({
			where: {
				id: 1,
				f_label: 'admin'
			},
			user: system.user
		}),
		models.E_role.findOrCreate({
			where: {
				id: 1,
				f_label: 'admin'
			},
			user: system.user
		}),
		models.E_user.create({
			id: 1,
			f_login: 'admin',
			f_email: 'admin@local.fr',
			f_password: null,
			f_enabled: 0
		}, system)
	]);

	await Promise.all([
		admin.setR_role(adminRole[0].id),
		admin.setR_group(adminGroup[0].id)
	]);
})();