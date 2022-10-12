const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const extend = require('util')._extend;

const middlewares = require('../helpers/middlewares');
const models = require('../models/');
const code_platform = require('../services/code_platform');
const mailer = require('../utils/mailer');
const language = require('../services/language');


router.get('/', middlewares.isLoggedIn, function(req, res) {
	res.render('front/configure/main');
});

/* Account */
router.get('/account', middlewares.isLoggedIn, (req, res) => {
	models.User.findOne({
		where: {
			id: req.session.passport.user.id
		},
		include: [{
			model: models.Role
		}, {
			model: models.Application
		}]
	}).then(user => {

		const data = {
			user: user
		};

		if (code_platform.config.enabled) {
			data.code_platform_user = req.session.code_platform.user;
			data.code_platform_host = code_platform.config.protocol + "://" + code_platform.config.url;
		}

		res.render('front/configure/account', data);
	});
});

router.post('/account/update', middlewares.isLoggedIn, (req, res) => {
	models.User.update({
		firstname: req.body.firstname,
		lastname: req.body.lastname,
		phone: req.body.phone
	}, {
		where: {
			id: req.session.passport.user.id
		}
	}).then(_ => {
		res.status(200).send(true);
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	});
})

/* Settings */
router.get('/settings/', middlewares.isLoggedIn, function(req, res) {
	const data = {};
	// Récupération des toastr en session
	data.toastr = req.session.toastr;
	// Nettoyage de la session
	req.session.toastr = [];
	data.toTranslate = req.session.toTranslate || false;
	data.user = req.session.passport.user;
	models.Role.findByPk(data.user.id_role).then(function(userRole){
		data.user.role = userRole;
		res.render('front/configure/settings', data);
	});
});

// Fonction de changement du language
router.post('/settings/change_language', middlewares.isLoggedIn, function(req, res) {
	if (typeof req.body !== 'undefined' && typeof req.body.lang !== 'undefined') {
		req.session.lang_user = req.body.lang;
		res.locals = extend(res.locals, language(req.body.lang));
		res.json({
			success: true
		});
	} else
		res.json({
			success: false
		});
});

router.post('/settings/change_theme', middlewares.isLoggedIn, function(req, res) {
	req.session.dark_theme = req.body.choice;
	res.json({
		success: true
	});
});

// Reset password - Generate token, insert into DB, send email
router.post('/settings/reset_password', middlewares.isLoggedIn, function(req, res) {

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
			message: req.query.other == 1 ? 'login.emailResetSentOther' : 'login.emailResetSent',
			level: 'success'
		}];

		res.status(200).send(true);
	}).catch(err => {
		// Remove inserted value in user to avoid zombies
		models.User.update({
			token_password_reset: null
		}, {
			where: {
				login: req.body.login.toLowerCase()
			}
		});

		console.error(err);
		res.status(500).send(err.message || 'Sorry, an error occured');
	})
});

module.exports = router;