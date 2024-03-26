const models = require('@app/models');
const ormHelper = require('@core/helpers').orm;

module.exports = (async() => {
	// Sequelize models sync
	await models.sequelize.sync({logging: false, hooks: false});

	// Nodea handle toSync.json, for database alteration
	await ormHelper.customAfterSync();

	// System user for tracability
	const system = { user: { f_login: 'system' } };

	const count_user = await models.E_user.count();
	// Application have already users, no need to init admin
	if (count_user > 0)
		return;

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
			f_login: 'admin',
			f_email: 'admin@local.fr',
			f_password: null,
			f_enabled: false
		}, system)
	]);

	await Promise.all([
		admin.setR_role(adminRole[0].id),
		admin.setR_group(adminGroup[0].id)
	]);

	// Init User status
	const count_status = await models.E_status.count();
	if (count_status < 3) {
		const [user_status_pending, user_status_enabled, user_status_disabled] = await Promise.all([
			models.E_status.findOrCreate({
				where: {
					id: 1,
					f_entity: 'e_user',
					f_field: 's_state',
					f_name: 'En attente de 1ère connection',
					f_color: '#FFFF3C',
					f_text_color: '#000000',
					f_default: 1,
					f_comment: 0,
					f_reason: 0
				},
				user: system.user
			}),
			models.E_status.findOrCreate({
				where: {
					id: 2,
					f_entity: 'e_user',
					f_field: 's_state',
					f_name: 'Activé',
					f_color: '#8CFF4F',
					f_text_color: '#000000',
					f_button_label: 'Activer',
					f_default: 0,
					f_comment: 0,
					f_reason: 0
				},
				user: system.user
			}),
			models.E_status.findOrCreate({
				where: {
					id: 3,
					f_entity: 'e_user',
					f_field: 's_state',
					f_name: 'Désactivé',
					f_color: '#FF4E4E',
					f_text_color: '#FFFFFF',
					f_button_label: 'Désactiver',
					f_default: 0,
					f_comment: 0,
					f_reason: 0
				},
				user: system.user
			})
		]);

		// Set initial status to admin
		// Set admin group to user status
		// Set children status to user status
		await Promise.all([
			admin.setR_state(user_status_pending[0].id),
			user_status_pending[0].setR_accepted_group(adminGroup[0].id),
			user_status_enabled[0].setR_accepted_group(adminGroup[0].id),
			user_status_disabled[0].setR_accepted_group(adminGroup[0].id),
			user_status_pending[0].setR_children(user_status_enabled[0].id),
			user_status_enabled[0].setR_children(user_status_disabled[0].id),
			user_status_disabled[0].setR_children(user_status_enabled[0].id),
		]);
	}
})();