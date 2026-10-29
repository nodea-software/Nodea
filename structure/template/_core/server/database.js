const models = require("@app/models");
const ormHelper = require("@core/helpers").orm;
const { hashToken, generateToken, setExpiresAt } = require("@core/utils/token");
const mailer = require("@core/services/mailer");

module.exports = (async () => {
	// Sequelize models sync
	await models.sequelize.sync({ logging: false, hooks: false });

	// Nodea handle toSync.json, for database alteration
	await ormHelper.customAfterSync();

	// System user for tracability
	const USERSYS = { f_login: "system" };

	const count_user = await models.E_user.count();
	// Application have already users, no need to init admin
	if (count_user > 0) return;

	const transaction = await models.sequelize.transaction();
	try {
		const ADMIN_MAIL = process.env.ADMIN_MAIL;
		if (!ADMIN_MAIL && !global.auto_login) {
			throw new Error("Application startup failed: required environment variable ADMIN_MAIL is not defined.");
		}

		const group = await models.E_group.create({ id: 1, f_label: "admin" }, { transaction, user: USERSYS });
		await group.setR_group_accessible(group, { transaction, user: USERSYS });
		const role = await models.E_role.create({ id: 1, f_label: "admin" }, { transaction, user: USERSYS });
		await role.setR_role_accessible(role, { transaction, user: USERSYS });
		const admin = await models.E_user.create(
			{
				f_login: "admin",
				f_email: ADMIN_MAIL,
				f_password: null,
				f_enabled: false,
			},
			{ transaction, user: USERSYS }
		);

		await admin.setR_group(group.id, { transaction, user: USERSYS });
		await admin.setR_role(role.id, { transaction, user: USERSYS });

		const status_1 = await models.E_status.create(
			{
				id: 1,
				f_entity: "e_user",
				f_field: "s_state",
				f_name: "En attente de 1ère connection",
				f_color: "#FFFF3C",
				f_text_color: "#000000",
				f_default: 1,
				f_comment: 0,
				f_reason: 0,
			},
			{ transaction, user: USERSYS }
		);

		const status_2 = await models.E_status.create(
			{
				id: 2,
				f_entity: "e_user",
				f_field: "s_state",
				f_name: "Activé",
				f_color: "#8CFF4F",
				f_text_color: "#000000",
				f_button_label: "Activer",
				f_default: 0,
				f_comment: 0,
				f_reason: 0,
			},
			{ transaction, user: USERSYS }
		);
		const status_3 = await models.E_status.create(
			{
				id: 3,
				f_entity: "e_user",
				f_field: "s_state",
				f_name: "Désactivé",
				f_color: "#FF4E4E",
				f_text_color: "#FFFFFF",
				f_button_label: "Désactiver",
				f_default: 0,
				f_comment: 0,
				f_reason: 0,
			},
			{ transaction, user: USERSYS }
		);

		await admin.setR_state(status_1.id, { transaction, user: USERSYS });
		await status_1.setR_accepted_group(group.id, { transaction, user: USERSYS });
		await status_2.setR_accepted_group(group.id, { transaction, user: USERSYS });
		await status_3.setR_accepted_group(group.id, { transaction, user: USERSYS });
		await status_1.setR_children(status_2.id, { transaction, user: USERSYS });
		await status_2.setR_children(status_3.id, { transaction, user: USERSYS });
		await status_3.setR_children(status_2.id, { transaction, user: USERSYS });

		if (!global.auto_login) {
			const activationToken = generateToken();
			const hash = hashToken(activationToken);

			await models.E_token.create(
				{
					hash,
					type: "FIRST_CONNECTION",
					expires_at: setExpiresAt("FIRST_CONNECTION"),
					fk_id_user: admin.id,
				},
				{ transaction, user: USERSYS }
			);

			await mailer.sendTemplate("first_connection", {
				data: {
					first_connection_url: `${mailer.config.url.host}/first_connection?login=${admin.f_login}&token=${activationToken}`,
					host: mailer.config.url.host,
					user: admin,
				},
				from: mailer.config.from,
				to: admin.f_email,
				subject: mailer.config.subject.mail_first,
			});
		}

		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
})();
