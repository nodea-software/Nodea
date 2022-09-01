const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const extend = require('util')._extend;

const middlewares = require('../helpers/middlewares');
const models = require('../models/');
const code_platform = require('../services/code_platform');
const mailer = require('../utils/mailer');
const metadata = require('../database/metadata')();
const language = require('../services/language');

router.get('/', middlewares.isLoggedIn, function(req, res) {
	res.render('front/configure/main');
});

/* Users */
router.get('/users', middlewares.isAdmin, (req, res) => {
	const data = {};
	models.User.findAll({
		// where: {
		// 	id: {
		// 		[models.$ne]: 1
		// 	}
		// },
		include: [{all: true}]
	}).then(users => {
		data.users = users;
		res.render('front/configure/users/list', data);
	})
})

router.get('/users/show/:id', middlewares.isAdmin, (req, res) => {
	const user_id = req.params.id;
	models.User.findOne({
		where: {
			id: user_id
		},
		include: [{all: true}]
	}).then(user => {
		const idAppUser = [];
		for (let i = 0; i < user.Applications.length; i++)
			idAppUser.push(user.Applications[i].id)
		models.Application.findAll({
			where: {
				id: {
					[models.$notIn]: idAppUser
				}
			}
		}).then(applications => {
			res.render('front/configure/users/show', {user: user, otherApp: applications})
		})
	})
})

router.get('/users/create', middlewares.isAdmin, (req, res) => {
	models.Role.findAll().then(roles => {
		res.render('front/configure/users/create', {roles: roles})
	})
})

router.post('/users/create', middlewares.isAdmin, (req, res) => {
	(async() => {
		if (req.body.login == '' || req.body.id_role == '' || req.body.email == '')
			throw new Error('action.missing_values');

		const alreadyExistLogin = await models.User.findOne({
			where: {
				login: req.body.login.toLowerCase()
			}
		});

		if(alreadyExistLogin)
			throw new Error('configure.users.user_already_exist');

		const alreadyExistEmail = await models.User.findOne({
			where: {
				email: req.body.email
			}
		});

		if(alreadyExistEmail)
			throw new Error('configure.users.email_already_exist');

		const user = await models.User.create({
			email: req.body.email,
			enabled: 0,
			firstname: req.body.firstname,
			lastname: req.body.lastname,
			login: req.body.login.toLowerCase(),
			id_role: req.body.role,
			password: null,
			phone: null,
			version: 1
		});

		if(req.body.send_mail_to_user == 'on')
			mailer.sendTemplate('signup', {
				to: req.body.email,
				subject: "Nodea - Inscription",
				data: {
					user: user,
					first_connection_url: mailer.config.host + '/first_connection?login=' + user.login + '&email=' + user.email
				}
			});

		return user;
	})().then(user => {
		req.session.toastr = [{
			message: "action.success.create",
			level: "success"
		}];
		res.redirect("/configure/users/show/" + user.id)
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message || 'Sorry, an error occured',
			level: "error"
		}];
		res.redirect("/configure/users/create");
	})
})

router.get('/users/update/:id', middlewares.isAdmin, (req, res) => {

	if(req.params.id == 1){
		req.session.toastr = [{
			message: "You can't modify the main administrator account",
			level: "error"
		}];
		return res.redirect("/configure/users");
	}

	models.User.findOne({
		where: {
			id: req.params.id
		},
		include: [{all: true}]
	}).then(user => {
		models.Role.findAll().then(roles => {
			res.render('front/configure/users/update', {user: user, roles: roles})
		})
	})
})

router.post('/users/update', middlewares.isAdmin, (req, res) => {
	if(req.body.id == 1){
		req.session.toastr = [{
			message: "You can't modify the main administrator account",
			level: "error"
		}];
		return res.redirect("/configure/users");
	}

	models.User.update({
		firstname: req.body.firstname,
		lastname: req.body.lastname,
		id_role: req.body.role,
		phone: req.body.phone
	}, {
		where: {
			id: req.body.id
		}
	}).then(_ => {
		req.session.toastr = [{
			message: "action.success.update",
			level: "success"
		}];
		res.redirect("/configure/users/update/" + req.body.id);
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.redirect("/configure/users/update/" + req.body.id);
	});
})

router.post('/users/delete', middlewares.isAdmin, (req, res) => {
	if(req.body.id == 1){
		req.session.toastr = [{
			message: 'users.not_delete_admin',
			level: "error"
		}];
		return res.redirect("/configure/users")
	}
	models.User.destroy({
		where: {
			id: req.body.id
		}
	}).then(_ => {
		req.session.toastr = [{
			message: 'action.success.destroy',
			level: "success"
		}];
		res.redirect("/configure/users")
	})
})

router.post('/users/assign', middlewares.isAdmin, (req, res) => {
	(async () => {
		let appID = req.body.app;
		const userID = req.body.id_user;
		const user = await models.User.findByPk(userID);

		if (!user)
			throw new Error("Nodea user not found in database.");

		if(!user.enabled)
			throw new Error("This Nodea user is not activated yet.");

		// Add user to code plateform project too
		if(code_platform.config.enabled){
			if(!Array.isArray(appID))
				appID = [appID];

			const code_platform_user = await code_platform.getUser(user);

			if(!code_platform_user)
				throw new Error('Cannot find code platform user with email: ' + user.email);

			for (let i = 0; i < appID.length; i++) {
				const application = await models.Application.findByPk(appID[i]); // eslint-disable-line
				const metadataApp = metadata.getApplication(application.name)
				await code_platform.addUserToProject(code_platform_user, { // eslint-disable-line
					id: metadataApp.repoID
				});
			}
		}

		await user.addApplication(appID);

		return userID;
	})().then(userID => {
		req.session.toastr = [{
			message: "L'application a bien été ajoutée !",
			level: 'success'
		}];
		res.redirect('/configure/users/show/' + userID + "#_applications");
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: 'error'
		}];
		return res.redirect('/configure/users');
	})
})

router.post('/users/remove_access', middlewares.isAdmin, (req, res) => {

	(async () => {
		const appID = req.body.id_app;
		const userID = req.body.id_user;
		const user = await models.User.findByPk(userID);
		if (!user)
			throw new Error("Nodea user not found in database.");

		if(!user.enabled)
			throw new Error("This Nodea user is not activated yet.");

		const applications = await user.getApplications();

		// Remove entity from association array
		for (let i = 0; i < applications.length; i++)
			if (applications[i].id == appID) {
				applications.splice(i, 1);
				break;
			}

		// Remove code platform access
		if(code_platform.config.enabled) {
			const application = await models.Application.findByPk(appID);
			const code_platform_user = await code_platform.getUser(user);
			if(!code_platform_user)
				throw new Error('Cannot find code platform user with email: ' + user.email);
			const metadataApp = metadata.getApplication(application.name);
			try {
				await code_platform.removeUserFromProject(code_platform_user, {
					id: metadataApp.repoID
				});
			} catch(err) {
				console.error('Error removing access on gitlab project to user ' + user.login);
			}
		}

		await user.setApplications(applications);

		return user.id;
	})().then(userID => {
		req.session.toastr = [{
			message: "L'accès à application a bien été retiré !",
			level: 'success'
		}];
		res.redirect('/configure/users/show/' + userID + "#_applications");
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message || "Sorry, an error occured",
			level: 'error'
		}];
		res.redirect('/configure/users/show/' + req.body.id_user + "#_applications");
	})
})

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