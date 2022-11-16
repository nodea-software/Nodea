const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');

const globalConf = require('../config/global');
const middlewares = require('../helpers/middlewares');
const local_authentication = require('../services/authentication/local');
const mailer = require('../utils/mailer');
const models = require('../models/');
const code_platform = require('../services/code_platform');

router.get('/login', middlewares.loginAccess, function(req, res) {
	res.render('login/login', {
		redirect: req.query.redirect
	});
});

router.post('/login', local_authentication.authenticate, function(req, res) {
	(async () => {
		if (req.body.remember_me)
			req.session.cookie.maxAge = 168 * 3600000; // 1 week
		else
			req.session.cookie.maxAge = 60000 * 60 * 24; // 1 Day

		req.session.isgenerator = true; // Needed to differentiate from generated app session

		// Set default null
		req.session.code_platform = {
			user: null
		};

		if(code_platform.config.enabled) {
			req.session.code_platform.user = await code_platform.getUser(req.user);

			if(!req.session.code_platform.user)
				throw new Error('code_platform.error.user_not_found');

			if(!req.session.code_platform.user.accessToken) {
				console.warn("Missing code platform access token in session, generating it...");
				req.session.code_platform.user.accessToken = await code_platform.generateAccessToken(req.session.code_platform.user, 'git_access_' + globalConf.host, ['read_repository', 'write_repository']);
				await models.User.update({
					repo_access_token: req.session.code_platform.user.accessToken
				}, {
					where: {
						id: req.user.id
					}
				})
			}
		}
	})().then(_ => {
		if(req.body.redirect)
			res.redirect(req.body.redirect);
		else
			res.redirect('/default/home');
	}).catch(err => {
		console.error(err);
		req.logout(error => {
			if(error)
				console.error(error);

			req.session.toastr = [{
				message: err.message || "error.oops",
				level: "error"
			}];
			res.redirect('/');
		});
	});
});

router.get('/logout', function(req, res) {

	if(globalConf.demo_mode && req.session && req.session.passport && req.session.passport.user.id != 1)
		return res.redirect('/');

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

router.get('/first_connection', middlewares.loginAccess, function(req, res) {
	const params = {
		login: "",
		email: ""
	};

	if(typeof req.query.login !== "undefined")
		params.login = req.query.login;

	if(typeof req.query.email !== "undefined")
		params.email = req.query.email;

	if(typeof req.query.token !== "undefined")
		params.token = req.query.token;

	res.render('login/first_connection', params);
});

router.post('/first_connection', middlewares.loginAccess, function(req, res) {
	const login = req.body.login.toLowerCase();
	const email = req.body.email;
	// Set default null
	let code_platform_user = null;
	(async() => {
		const passwordRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*/+;-])(?=.{8,})");

		// Develop env can setup weak password
		if (globalConf.env != 'develop' && (req.body.password != req.body.confirm_password || !passwordRegex.test(req.body.password)))
			throw new Error("login.first_connection.passwordNotValid");

		const password = bcrypt.hashSync(req.body.confirm_password, null, null);

		const user = await models.User.findOne({
			where: {
				login: login,
				email: email
			}
		})

		if (!user)
			throw new Error("login.first_connection.userNotExist");

		if (user.password && user.password != "")
			throw new Error("login.first_connection.hasAlreadyPassword");

		if(user.token_first_connection && user.token_first_connection != '') {
			if(!req.body.token)
				throw new Error("login.first_connection.missingToken");
			if(user.token_first_connection != req.body.token)
				throw new Error("login.first_connection.wrongToken");
		}

		if(code_platform.config.enabled)
			code_platform_user = await code_platform.initUser(user, req.body.confirm_password);

		await user.update({
			password: password,
			email: email,
			token_first_connection: null,
			enabled: true
		});

		return user;

	})().then(user => {
		// Autologin after first connection form done
		req.login(user, err => {
			if (err)
				throw err;

			req.session.code_platform = {
				user: code_platform_user
			};

			req.session.isgenerator = true; // Needed to differentiate from generated app session
			res.redirect('/default/home');
		});
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message ? err.message : 'Sorry, an error occured',
			level: "error"
		}];
		res.redirect('/first_connection?login=' + login + '&email=' + email);
	});
});

router.get('/reset_password', middlewares.loginAccess, function(req, res) {
	res.render('login/reset_password');
});

// Reset password - Generate token, insert into DB, send email
router.post('/reset_password', middlewares.loginAccess, function(req, res) {
	(async () => {
		// Check if user with login + email exist in DB
		const user = await models.User.findOne({
			where: {
				login: req.body.login.toLowerCase(),
				email: req.body.email
			}
		});

		if(!user)
			throw new Error("login.first_connection.userNotExist");

		if(!user.password && !user.enabled)
			throw new Error("login.first_connection.userNotActivate");

		// Create unique token and insert into user
		const token = crypto.randomBytes(64).toString('hex');

		await user.update({
			token_password_reset: token
		});

		await mailer.sendTemplate('reset_password', {
			to: user.email,
			subject: "Nodea - Réinitialisation de votre mot de passe",
			data: {
				user: user,
				token: token
			}
		});
	})().then(_ => {
		req.session.toastr = [{
			message: "login.emailResetSent",
			level: "success"
		}];
		res.redirect('/');
	}).catch(err => {
		// Remove inserted value in user to avoid zombies
		models.User.update({
			token_password_reset: null
		}, {
			where: {
				login: req.body.login.toLowerCase()
			}
		})

		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.render('login/reset_password');
	})
})

router.get('/reset_password_form/:token', middlewares.loginAccess, function(req, res) {
	models.User.findOne({
		where: {
			token_password_reset: req.params.token
		}
	}).then(user => {
		if (!user) {
			req.session.toastr = [{
				message: "login.tokenNotFound",
				level: "error"
			}];
			return res.render('login/reset_password');
		}

		user.update({
			password: null
		}).then(_ => {
			res.render('login/reset_password_form', {
				resetUser: user
			});
		});
	}).catch(err => {
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.render('login/reset_password');
	});
});

router.post('/reset_password_form', middlewares.loginAccess, function(req, res) {

	const login = req.body.login.toLowerCase();
	const email = req.body.email;

	(async () => {
		const user = await models.User.findOne({
			where: {
				login: login,
				email: email,
				[models.$or]: [{password: ""}, {password: null}]
			}
		});

		if(globalConf.env != 'develop' && (req.body.password != req.body.confirm_password || req.body.password.length < 8))
			throw {
				message: "login.first_connection.passwordNotValid",
				redirect: '/reset_password_form/'+user.token_password_reset
			}

		const password = bcrypt.hashSync(req.body.confirm_password, null, null);

		if(!user)
			throw {
				message: "login.first_connection.userNotExist",
				redirect: '/login'
			}

		if(user.password && user.password != '')
			throw {
				message: "login.first_connection.hasAlreadyPassword",
				redirect: '/login'
			}

		await models.User.update({
			password: password,
			token_password_reset: null
		}, {
			where: {
				id: user.id
			}
		});

		// Autologin after first connection form done
		const connectedUser = await models.User.findOne({
			where: {
				id: user.id
			}
		});

		// Set default null
		req.session.code_platform = {
			user: null
		};

		if(code_platform.config.enabled)
			req.session.code_platform.user = await code_platform.initUser(user, req.body.confirm_password);

		return connectedUser;

	})().then(user => {

		req.login(user, err => {
			if (err)
				throw err;

			req.session.isgenerator = true; // Needed to differentiate from generated app session

			req.session.toastr = [{
				message: "login.passwordReset",
				level: "success"
			}];
			res.redirect('/default/home');
		});
	}).catch(err => {
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.redirect(err.redirect ? err.redirect : '/login');
	})
});

router.get('/signup', middlewares.loginAccess, function(req, res) {

	if(!globalConf.open_signup) {
		req.session.toastr = [{
			message: "L'inscription n'est pas disponible sur cet environnement Nodea.",
			level: "error"
		}];
		return res.redirect('/');
	}

	res.render('login/signup');
});

router.post('/signup', middlewares.loginAccess, function(req, res) {

	if(!globalConf.open_signup) {
		req.session.toastr = [{
			message: "L'inscription n'est pas disponible sur cet environnement Nodea.",
			level: "error"
		}];
		return res.redirect('/');
	}

	(async() => {

		req.body.login = req.body.login.toLowerCase();

		const alreadyExistingLogin = await models.User.findOne({
			where: {
				login: req.body.login
			}
		});

		if(alreadyExistingLogin)
			throw new Error('configure.users.user_already_exist');

		const alreadyExistingEmail = await models.User.findOne({
			where: {
				email: req.body.email
			}
		});

		if(alreadyExistingEmail)
			throw new Error('configure.users.email_already_exist');

		// Create unique token and insert into user
		const token = crypto.randomBytes(64).toString('hex');

		const createdUser = await models.User.create({
			login: req.body.login,
			email: req.body.email,
			enabled: 0,
			firstname: req.body.firstname,
			lastname: req.body.lastname,
			version: 1,
			token_first_connection: token,
			id_role: 2 // User
		});

		await mailer.sendTemplate('signup', {
			to: req.body.email,
			subject: "Nodea - Inscription",
			data: {
				user: createdUser,
				first_connection_url: mailer.config.host + '/first_connection?login=' + req.body.login + '&email=' + req.body.email + '&token=' + token
			}
		});

		req.session.toastr = [{
			message: "Votre inscription a bien été prise en compte. Un email vous a été envoyé pour finaliser votre inscription.",
			level: "success"
		}];

		res.redirect('/');

	})().catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.redirect('/signup');
	});
});

module.exports = router;