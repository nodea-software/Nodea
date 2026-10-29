const Entity = require("@core/abstract_routes/entity");
const middlewares = require("@core/helpers/middlewares");

const models = require("@app/models/");
const options = require("@app/models/options/e_user");
const attributes = require("@app/models/attributes/e_user");
const helpers = require("@core/helpers");
const mailer = require("@core/services/mailer");

const globalConfig = require("@config/global");

const { generateToken, hashToken, setExpiresAt } = require("@core/utils/token");

const USER_ID_ADMIN = 1;
const STATUS_ID_ENABLED = 2;
const STATUS_ID_DISABLED = 3;
const CONF_AUTH_MODE = globalConfig.authStrategy?.toLowerCase();

class E_user extends Entity {
	constructor() {
		const additionalRoutes = ["settingsGET", "settingsPOST", "resendFirstConnectionEmail", "sendResetPassword"];
		super("e_user", attributes, options, helpers, additionalRoutes);
	}

	settingsGET() {
		this.router.get(
			"/settings",
			this.middlewares.settingsGET,
			this.asyncRoute(async ({ req, res }) => {
				const id_e_user = req.user.id;
				if (!id_e_user) throw new Error("Missing current user in session.");

				const e_user = await models.E_user.findOne({
					attributes: ["id", "f_login", "f_email"],
					where: {
						id: id_e_user,
					},
					include: [
						{
							model: models.E_group,
							as: "r_group",
						},
						{
							model: models.E_role,
							as: "r_role",
						},
					],
				});

				if (!e_user) throw new Error("Cannot find current user in database.");

				const data = {
					e_user: e_user,
					isLocal: false,
				};
				if (CONF_AUTH_MODE === "local") data.isLocal = true;

				res.success((_) => res.render("e_user/settings", data));
			})
		);
	}

	settingsPOST() {
		this.router.post(
			"/settings",
			this.middlewares.settingsPOST,
			this.asyncRoute(async (data) => {
				data.transaction = await models.sequelize.transaction();
				try {
					const { f_email } = data.req.body;
					const user = await models.E_user.findByPk(data.req.session.passport.user.id);
					if (f_email && f_email !== user.f_email) {
						await user.update({ f_email }, { transaction: data.transaction, user: data.req.user });
						data.req.session.toastr = [
							{
								message: "settings.success",
								level: "success",
							},
						];
					}
					data.res.success((_) => data.res.redirect("/user/settings"));
				} catch (err) {
					console.log(err);
					data.req.session.toastr = [
						{
							message: "settings.error",
							level: "error",
						},
					];
					data.res.error((_) => data.res.redirect("/user/settings"));
				}
			})
		);
	}

	resendFirstConnectionEmail() {
		this.router.post(
			"/resend_first_connection",
			this.middlewares.resendFirstConnectionEmail,
			this.asyncRoute(async (data) => {
				const { f_login, f_email } = data.req.body;
				data.transaction = await models.sequelize.transaction();
				// Send first connection email to new user

				try {
					// Check if user with login + email exist in DB
					const user = await models.E_user.findOne({
						where: { f_login, f_email },
					});
					if (!user) throw new Error("login.reset_password.userNotExist");

					const existingToken = await models.E_token.findOne({
						where: { type: "FIRST_CONNECTION", fk_id_user: user.id },
						attributes: ["id"],
					});
					if (existingToken) {
						await existingToken.destroy({ transaction: data.transaction, user: data.req.user });
					}
					const activationToken = generateToken();
					const hash = hashToken(activationToken);

					await models.E_token.create(
						{
							hash,
							type: "FIRST_CONNECTION",
							expires_at: setExpiresAt("FIRST_CONNECTION"),
							fk_id_user: user.id,
						},
						{ transaction: data.transaction, user: data.req.user }
					);

					await mailer.sendTemplate("first_connection", {
						data: {
							first_connection_url: `${mailer.config.url.host}/first_connection?login=${f_login}&token=${activationToken}`,
							host: mailer.config.url.host,
							user,
						},
						from: mailer.config.from,
						to: f_email,
						subject: mailer.config.subject.mail_first,
					});
					data.res.success((_) => data.res.status(200).send(true));
				} catch (err) {
					console.error(err);
					data.res.success((_) => data.res.status(500).send(err));
				}
			})
		);
	}

	sendResetPassword() {
		this.router.post(
			"/send_reset_password",
			this.middlewares.sendResetPassword,
			this.asyncRoute(async (data) => {
				const { login, email } = data.req.body;
				data.transaction = await models.sequelize.transaction();

				try {
					// Check if user with login + email exist in DB
					const user = await models.E_user.findOne({
						where: {
							f_login: login,
							f_email: email,
						},
					});
					if (!user) throw new Error("login.reset_password.userNotExist");
					if (!user.f_enabled) throw new Error("login.not_enabled");

					const existingToken = await models.E_token.findOne({
						where: { type: "RESET_PASSWORD", fk_id_user: user.id },
						attributes: ["id"],
					});
					if (existingToken) {
						await existingToken.destroy({ transaction: data.transaction, user: data.req.user });
					}
					const resetToken = generateToken();
					const hash = hashToken(resetToken);

					await models.E_token.create(
						{
							hash,
							type: "RESET_PASSWORD",
							expires_at: setExpiresAt("RESET_PASSWORD"),
							fk_id_user: user.id,
						},
						{ transaction: data.transaction, user: data.req.user }
					);

					await mailer.sendTemplate("mail_reset_password", {
						data: {
							href: `${mailer.config.url.host}/reset_password?login=${login}&token=${resetToken}`,
							user,
						},
						from: mailer.config.from,
						to: data.req.body.email,
						subject: mailer.config.subject.mail_reset,
					});
					data.res.success((_) => data.res.status(200).send(true));
				} catch (err) {
					console.error(err);
					data.res.success((_) => data.res.status(500).send(err));
				}
			})
		);
	}

	get hooks() {
		return {
			list: {
				// start: async(data) => {},
				// beforeRender: async(data) => {},
			},
			datalist: {
				// start: async(data) => {},
				// beforeDatatableQuery: async(data) => {},
				// afterDatatableQuery: async(data) => {},
				// beforeResponse: async(data) => {}
			},
			subdatalist: {
				// start: async (data) => {},
				// beforeDatatableQuery: async (data) => {},
				// afterDatatableQuery: async (data) => {},
				// beforeResponse: async (data) => {},
			},
			show: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create_form: {
				// start: async (data) => {},
				// ifFromAssociation: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create: {
				start: (data) => {
					if (CONF_AUTH_MODE === "ldap") data.req.body.f_enabled = true;
				},
				beforeRedirect: async (data) => {
					if (CONF_AUTH_MODE === "local" && data.req.body.send_first_connection_mail == "true" && data.req.body.f_email) {
						const activationToken = generateToken();
						const hash = hashToken(activationToken);

						await models.E_token.create(
							{
								hash,
								type: "FIRST_CONNECTION",
								expires_at: setExpiresAt("FIRST_CONNECTION"),
								fk_id_user: data.createdRow.id,
							},
							{ transaction: data.transaction, user: data.req.user }
						);

						// Send first connection email to new user
						try {
							mailer.sendTemplate("first_connection", {
								data: {
									first_connection_url: `${mailer.config.url.host}/first_connection?login=${data.req.body.f_login}&token=${activationToken}`,
									host: mailer.config.url.host,
									user: data.req.body,
								},
								from: mailer.config.from,
								to: data.req.body.f_email,
								subject: mailer.config.subject.mail_first,
							});
						} catch (err) {
							console.error(err);
						}
					}
					// activate status for ldap auth
					if (CONF_AUTH_MODE === "ldap") {
						await helpers.status.setStatus(this.e_entity, data.createdRow.id, "state", STATUS_ID_ENABLED, {
							user: data.req.user,
							transaction: data.transaction,
						});
					}
				},
			},
			update_form: {
				start: (data) => {
					if (data.idEntity == USER_ID_ADMIN) {
						data.req.session.toastr = [
							{
								message: "administration.user.cannot_modify_admin",
								level: "error",
							},
						];
						data.res.success((_) => data.res.redirect("/user/list"));
						return false;
					}
				},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				start: (data) => {
					if (data.idEntity == USER_ID_ADMIN) {
						data.req.session.toastr = [
							{
								message: "administration.user.cannot_modify_admin",
								level: "error",
							},
						];
						data.res.success((_) => data.res.redirect("/user/list"));
						return false;
					}
				},
				// beforeRedirect: async(data) => {}
			},
			loadtab: {
				// start: async (data) => {},
				// beforeValidityCheck: (data) => {},
				// afterValidityCheck: (data) => {},
				// beforeDataQuery: (data) => {},
				// beforeRender: (data) => {},
			},
			set_status: {
				start: (data) => {
					if (data.idEntity == USER_ID_ADMIN && data.idNewStatus == STATUS_ID_DISABLED) {
						if (data.req.query.ajax) {
							data.res.success((_) =>
								data.res.status(403).send(helpers.language(data.req.session.lang_user).__("administration.user.cannot_disable_admin"))
							);
						} else {
							data.req.session.toastr = [
								{
									message: "administration.user.cannot_disable_admin",
									level: "error",
								},
							];
							data.res.success((_) => data.res.redirect(data.redirect));
						}
						return false;
					}
				},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				beforeQuery: (data) => {
					data.query.where = {
						...data.query.where,
						fk_id_status_state: STATUS_ID_ENABLED,
					};
				},
				// beforeResponse: async (data) => {}
			},
			fieldset_remove: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_add: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			destroy: {
				start: (data) => {
					if (data.idEntity == USER_ID_ADMIN) {
						if (data.req.query.ajax) {
							data.res.success((_) =>
								data.res.status(403).send(helpers.language(data.req.session.lang_user).__("administration.user.cannot_delete_admin"))
							);
						} else {
							data.req.session.toastr = [
								{
									message: "administration.user.cannot_delete_admin",
									level: "error",
								},
							];
							data.res.success((_) => data.res.redirect(`/user/show?id=${data.idEntity}`));
						}
						return false;
					}
				},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			},
		};
	}

	get middlewares() {
		return {
			list: [middlewares.actionAccess(this.entity, "read")],
			datalist: [middlewares.actionAccess(this.entity, "read")],
			subdatalist: [middlewares.actionAccess(this.entity, "read")],
			show: [middlewares.actionAccess(this.entity, "read")],
			create_form: [middlewares.actionAccess(this.entity, "create")],
			create: [middlewares.actionAccess(this.entity, "create"), middlewares.fileInfo(this.fileFields)],
			update_form: [middlewares.actionAccess(this.entity, "update")],
			update: [middlewares.actionAccess(this.entity, "update"), middlewares.fileInfo(this.fileFields)],
			loadtab: [middlewares.actionAccess(this.entity, "read")],
			set_status: [middlewares.actionAccess(this.entity, "read"), middlewares.statusGroupAccess],
			search: [middlewares.actionAccess(this.entity, "read")],
			fieldset_remove: [middlewares.actionAccess(this.entity, "delete")],
			fieldset_add: [middlewares.actionAccess(this.entity, "create")],
			destroy: [middlewares.actionAccess(this.entity, "delete")],
			settingsGET: [middlewares.actionAccess(this.entity, "read")],
			settingsPOST: [middlewares.actionAccess(this.entity, "update")],
			resendFirstConnectionEmail: [middlewares.actionAccess(this.entity, "read")],
			sendResetPassword: [middlewares.actionAccess(this.entity, "read")],
		};
	}
}

module.exports = E_user;
