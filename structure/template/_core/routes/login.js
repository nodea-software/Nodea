const svgCaptcha = require('svg-captcha');
const bcrypt = require('bcrypt');

const globalConf = require('@config/global');
const models = require('@app/models')
const crypto = require('crypto');
const mailer = require('@core/services/mailer');
const helpers = require('@core/helpers');
const Route = require('@core/abstract_routes/route');
const { writeConnectionLog } = require('@core/helpers/connection_log');
const dayjs = require('dayjs');

class CoreLogin extends Route {
	constructor(additionalRoutes = []) {
		super([
			'loginGET',
			'loginPOST',
			'refresh_login_captcha',
			'first_connectionGET',
			'first_connectionPOST',
			'reset_passwordGET',
			'reset_passwordPOST',
			'reset_password_token',
			'logout',
			...additionalRoutes
		]);
	}

	loginGET() {
		this.router.get('/login', ...this.middlewares.loginGET, (req, res) => {

			let captcha;

			if(req.session.loginAttempt >= 5){
				const loginCaptcha = svgCaptcha.create({
					size: 4, // size of random string
					ignoreChars: '0oO1iIlL', // filter out some characters
					noise: 1, // number of noise lines
					color: false,
					width: 340
				});
				req.session.loginCaptcha = loginCaptcha.text;
				captcha = loginCaptcha.data;
			}

			res.render('login/login', {
				captcha: captcha,
				redirect: req.query.r ? req.query.r : null
			});
		});
	}

	loginPOST() {
		this.router.post('/login', ...this.middlewares.loginPOST, (req, res) => {

			if (req.body.remember_me)
				req.session.cookie.maxAge = 168 * 3600000; // 1 week
			else
				req.session.cookie.expires = false; // Logout on browser exit

			const redirect = req.query.r ? req.query.r : "/module/home";
			req.session.loginCaptcha = null;
			res.redirect(redirect);
		});
	}

	refresh_login_captcha() {
		this.router.get('/refresh_login_captcha', ...this.middlewares.refresh_login_captcha, (req, res) => {
			const captcha = svgCaptcha.create({
				size: 4,
				ignoreChars: '0oO1iIlL',
				noise: 1,
				color: false,
				width: 340
			});
			req.session.loginCaptcha = captcha.text;
			res.status(200).send(captcha.data);
		});
	}

	first_connectionGET() {
		this.router.get('/first_connection', ...this.middlewares.first_connectionGET, (req, res) => {
			res.render('login/first_connection', {
				login: req.query.login
			});
		});
	}

	first_connectionPOST() {
		this.router.post('/first_connection', ...this.middlewares.first_connectionPOST, (req, res) => {
			const login = req.body.login;
			const STATUS_ID_ENABLE = 2;
			const passwordRegex = new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&?*]).{12,120}$/);

			(async () => {

				if (globalConf.env != 'develop' && (req.body.password != req.body.confirm_password || !passwordRegex.test(req.body.password)))
					throw new Error("login.first_connection.passwordNotValid");

				const user = await models.E_user.findOne({
					where: {
						f_login: login,
						f_enabled: {
							[models.$or]: [null, false]
						}
					},
					include: [{
						model: models.E_group,
						as: 'r_group'
					}, {
						model: models.E_role,
						as: 'r_role'
					}]
				});

				if (!user)
					throw new Error("login.first_connection.userNotExist");

				if (user.f_password && user.f_password != '')
					throw new Error("login.first_connection.alreadyHavePassword");

				const saltRounds = 10;
				const hashedPassword = await bcrypt.hash(req.body.confirm_password, saltRounds);

				await user.update({
					f_password: hashedPassword,
					f_enabled: true,
					f_last_connection: dayjs()
				}, {
					user
				});

				await helpers.status.setStatus('e_user', user.id, 'state', STATUS_ID_ENABLE, {user});

				return user;
			})().then(user => {
				req.login(user, err => {
					if (err) {
						console.error(err);
						req.session.toastr = [{
							message: err.message,
							level: "warn"
						}];
						return res.redirect('/login');
					}
					req.session.toastr = [{
						message: "login.first_connection.success_login",
						level: "success"
					}];
					// Reset potential captcha
					delete req.session.loginAttempt;
					res.redirect('/module/home');
				})
			}).catch(err => {
				writeConnectionLog(err);
				console.error(err.message);
				req.session.toastr = [{
					message: err.message,
					level: "error"
				}];
				res.redirect('/first_connection');
			})
		})
	}

	reset_passwordGET() {
		// Affichage de la page reset_password
		this.router.get('/reset_password', ...this.middlewares.reset_passwordGET, (req, res) => {
			res.render('login/reset_password');
		});
	}

	reset_passwordPOST() {
		// Reset password - Generate token, insert into DB, send email
		this.router.post('/reset_password', ...this.middlewares.reset_passwordPOST, (req, res) => {
			(async () => {
				// Check if user with login + email exist in DB
				const user = await models.E_user.findOne({
					where: {
						f_login: req.body.login.toLowerCase(),
						f_email: req.body.email
					}
				});

				if(!user)
					throw new Error("login.reset_password.userNotExist");

				if(!user.f_enabled)
					throw new Error("login.not_enabled");

				// Create unique token and insert into user
				const token = crypto.randomBytes(64).toString('hex');

				await user.update({
					f_token_password_reset: token
				});

				// Send email with generated token
				await mailer.sendTemplate('mail_reset_password', {
					data: {
						href: mailer.config.host + '/reset_password/' + token,
						user: user
					},
					from: mailer.config.from,
					to: req.body.email,
					subject: 'Nodea - Réinitialisation de votre mot de passe'
				});
			})().then(_ => {
				req.session.toastr = [{
					message: "login.reset_password.successMail",
					level: "success"
				}];
				// Reset potential captcha
				delete req.session.loginAttempt;
				res.redirect('/');
			}).catch(err => {
				// Remove inserted value in user to avoid zombies
				models.E_user.update({
					f_token_password_reset: null
				}, {
					where: {
						f_login: req.body.login.toLowerCase()
					}
				}).catch(err => {console.error(err);})

				writeConnectionLog(err);
				console.error(err);
				req.session.toastr = [{
					message: err.message,
					level: "error"
				}];
				res.render('login/reset_password');
			})
		})
	}

	reset_password_token() {
		// Trigger password reset
		this.router.get('/reset_password/:token', ...this.middlewares.reset_password_token, (req, res) => {
			models.E_user.findOne({
				where: {
					f_token_password_reset: req.params.token
				}
			}).then(user => {
				if (!user) {
					req.session.toastr = [{
						message: "login.reset_password.cannotFindToken",
						level: 'error'
					}];
					return res.redirect('/login');
				}

				user.update({
					f_password: null,
					f_token_password_reset: null,
					f_enabled: false
				}).then(_ => {
					req.session.toastr = [{
						message: "login.reset_password.success",
						level: 'success'
					}];
					res.redirect('/first_connection');
				});
			}).catch(err => {
				writeConnectionLog(err);
				req.session.toastr = [{
					message: err.message,
					level: 'error'
				}];
				res.redirect('/login');
			});
		});
	}

	logout() {
		this.router.get('/logout', ...this.middlewares.logout, (req, res) => {
			req.session.autologin = false;
			req.logout(err => {
				if(err) {
					req.session.toastr = [{
						message: "error.500.title",
						level: "error"
					}];
					return res.redirect('/');
				}

				req.session.toastr = [{
					message: "login.logout_success",
					level: "success"
				}];
				res.redirect('/login');
			});
		});
	}
}

module.exports = CoreLogin;