const svgCaptcha = require("svg-captcha");
const bcrypt = require("bcrypt");

const globalConf = require("@config/global");
const models = require("@app/models");
const mailer = require("@core/services/mailer");
const helpers = require("@core/helpers");
const Route = require("@core/abstract_routes/route");
const { writeConnectionLog } = require("@core/helpers/connection_log");
const dayjs = require("dayjs");
const { hashToken, generateToken, setExpiresAt } = require("@core/utils/token");
const { lang } = require("@config/application");
const __ = helpers.language(lang).__;

class CoreLogin extends Route {
	constructor(additionalRoutes = []) {
		super([
			"loginGET",
			"loginPOST",
			"refresh_login_captcha",
			"first_connectionGET",
			"first_connectionPOST",
			"forgot_passwordGET",
			"forgot_passwordPOST",
			"reset_passwordGET",
			"reset_passwordPOST",
			"logout",
			...additionalRoutes,
		]);
	}

	loginGET() {
		this.router.get("/login", ...this.middlewares.loginGET, (req, res) => {
			let captcha;

			if (req.session.loginAttempt >= 5) {
				const loginCaptcha = svgCaptcha.create({
					size: 4, // size of random string
					ignoreChars: "0oO1iIlL", // filter out some characters
					noise: 1, // number of noise lines
					color: false,
					width: 340,
				});
				req.session.loginCaptcha = loginCaptcha.text;
				captcha = loginCaptcha.data;
			}

			const flashMessage = req.flash();
			if (flashMessage && flashMessage.error) {
				req.session.toastr = [];
				for (const error of flashMessage.error)
					req.session.toastr.push({
						message: error,
						level: "error",
					});
			}

			res.render("login/login", {
				captcha: captcha,
				redirect: req.query.r ? req.query.r : null,
			});
		});
	}

	loginPOST() {
		this.router.post("/login", ...this.middlewares.loginPOST, (req, res) => {
			if (req.body.remember_me) req.session.cookie.maxAge = 168 * 3600000; // 1 week
			else req.session.cookie.expires = false; // Logout on browser exit

			const redirect = req.query.r ? req.query.r : "/module/home";
			req.session.loginCaptcha = null;
			res.redirect(redirect);
		});
	}

	refresh_login_captcha() {
		this.router.get("/refresh_login_captcha", ...this.middlewares.refresh_login_captcha, (req, res) => {
			const captcha = svgCaptcha.create({
				size: 4,
				ignoreChars: "0oO1iIlL",
				noise: 1,
				color: false,
				width: 340,
			});
			req.session.loginCaptcha = captcha.text;
			res.status(200).send(captcha.data);
		});
	}

	first_connectionGET() {
		this.router.get("/first_connection", ...this.middlewares.first_connectionGET, (req, res) => {
			const { token, login } = req.query;
			res.render("login/first_connection", { login, token });
		});
	}
	first_connectionPOST() {
		this.router.post(
			"/first_connection",
			...this.middlewares.first_connectionPOST,
			this.asyncRoute(async (data) => {
				data.transaction = await models.sequelize.transaction();
				const { login, token } = data.req.body;
				const STATUS_ID_ENABLE = 2;
				const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&?*]).{12,120}$/);

				try {
					if (data.req.body.password !== data.req.body.confirm_password) {
						throw new Error("login.first_connection.passwordNotValid");
					}
					if (globalConf.env !== "develop" && !passwordRegex.test(data.req.body.password)) {
						throw new Error("login.first_connection.passwordNotValid");
					}
					const user = await models.E_user.findOne({
						where: {
							f_login: login,
							f_enabled: {
								[models.$or]: [null, false],
							},
						},
						include: [
							{ model: models.E_group, as: "r_group" },
							{ model: models.E_role, as: "r_role" },
						],
					});
					if (!user) throw new Error("login.first_connection.userNotExist");

					if (user.f_password && user.f_password != "") throw new Error("login.first_connection.alreadyHavePassword");

					const hash = hashToken(token);

					const activationToken = await models.E_token.findOne({ where: { hash, fk_id_user: user.id } });
					if (!activationToken || dayjs().isAfter(activationToken.expires_at)) {
						throw new Error("login.invalid_token");
					}

					const saltRounds = 10;
					const hashedPassword = await bcrypt.hash(data.req.body.confirm_password, saltRounds);

					await user.update(
						{
							f_password: hashedPassword,
							f_enabled: true,
							f_last_connection: dayjs(),
						},
						{
							transaction: data.transaction,
							user,
						}
					);

					await activationToken.destroy({ transaction: data.transaction, user: data.req.user });

					await helpers.status.setStatus("e_user", user.id, "state", STATUS_ID_ENABLE, { user, transaction: data.transaction });

					data.req.login(user, (err) => {
						if (err) {
							throw new Error(err.message);
						}
						data.req.session.toastr = [
							{
								message: "login.first_connection.success_login",
								level: "success",
							},
						];
						// Reset potential captcha
						delete data.req.session.loginAttempt;
						data.res.success(() => data.res.redirect("/module/home"));
					});
				} catch (err) {
					writeConnectionLog(`FIRST CONNECTION ERROR => ${__(err.message)} [login: ${login}]`);
					console.error(err);
					data.req.session.toastr = [
						{
							message: err.message,
							level: "error",
						},
					];
					data.res.error(() => data.res.redirect("/first_connection"));
				}
			})
		);
	}

	forgot_passwordGET() {
		this.router.get("/forgot_password", ...this.middlewares.forgot_passwordGET, (req, res) => {
			res.render("login/forgot_password");
		});
	}

	forgot_passwordPOST() {
		// Reset password - Generate token, insert into DB, send email
		this.router.post(
			"/forgot_password",
			...this.middlewares.forgot_passwordPOST,
			this.asyncRoute(async (data) => {
				data.transaction = await models.sequelize.transaction();
				const { login, email } = data.req.body;
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
					// Send email with generated token
					await mailer.sendTemplate("mail_reset_password", {
						data: {
							href: `${mailer.config.url.host}/reset_password?login=${user.f_login}&token=${resetToken}`,
							user,
						},
						from: mailer.config.from,
						to: email,
						subject: mailer.config.subject.mail_reset,
					});
					data.req.session.toastr = [
						{
							message: "login.reset_password.successMail",
							level: "success",
						},
					];
					// Reset potential captcha
					delete data.req.session.loginAttempt;
					data.res.success((_) => data.res.redirect("/"));
				} catch (err) {
					writeConnectionLog(`FORGOT PASSWORD ERROR => ${__(err.message)} [login: ${login}]`);
					console.error(err);
					data.req.session.toastr = [
						{
							message: err.message,
							level: "error",
						},
					];
					data.res.error(() => data.res.render("login/forgot_password"));
				}
			})
		);
	}

	reset_passwordGET() {
		this.router.get("/reset_password", ...this.middlewares.reset_passwordGET, (req, res) => {
			const { login, token } = req.query;
			res.render("login/reset_password", { login, token });
		});
	}

	reset_passwordPOST() {
		// Trigger password reset
		this.router.post(
			"/reset_password",
			...this.middlewares.reset_passwordPOST,
			this.asyncRoute(async (data) => {
				data.transaction = await models.sequelize.transaction();
				const { login, token } = data.req.body;
				const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&?*]).{12,120}$/);

				try {
					if (data.req.body.password !== data.req.body.confirm_password) {
						throw new Error("login.first_connection.passwordNotValid");
					}
					if (globalConf.env !== "develop" && !passwordRegex.test(data.req.body.password)) {
						throw new Error("login.first_connection.passwordNotValid");
					}

					const user = await models.E_user.findOne({
						where: {
							f_login: login,
						},
					});

					if (!user) throw new Error("login.first_connection.userNotExist");

					const hash = hashToken(token);
					const resetToken = await models.E_token.findOne({ where: { hash, fk_id_user: user.id } });
					if (!resetToken || dayjs().isAfter(resetToken.expires_at)) {
						throw new Error("login.invalid_token");
					}

					const saltRounds = 10;
					const hashedPassword = await bcrypt.hash(data.req.body.confirm_password, saltRounds);

					await user.update(
						{
							f_password: hashedPassword,
							f_enabled: true,
							f_last_connection: dayjs(),
						},
						{
							transaction: data.transaction,
							user,
						}
					);

					await resetToken.destroy({ transaction: data.transaction });

					data.req.session.toastr = [
						{
							message: "login.reset_password.success",
							level: "success",
						},
					];
					data.res.success(() => data.res.redirect("/"));
				} catch (err) {
					writeConnectionLog(`RESET PASSWORD ERROR => ${__(err.message)} [login: ${login}]`);
					console.log(err);
					data.req.session.toastr = [
						{
							message: err.message,
							level: "error",
						},
					];
					data.res.error((_) => data.res.redirect("/login"));
				}
			})
		);
	}

	logout() {
		this.router.get("/logout", ...this.middlewares.logout, (req, res) => {
			req.logout((err) => {
				if (err) {
					req.session.toastr = [
						{
							message: "error.500.title",
							level: "error",
						},
					];
					return res.redirect("/");
				}

				req.session.toastr = [
					{
						message: "login.logout_success",
						level: "success",
					},
				];
				res.redirect("/login");
			});
		});
	}
}

module.exports = CoreLogin;
