const router = require('express').Router();
const middlewares = require('../helpers/middlewares');
const access = require('../helpers/access');
const metadata = require('../database/metadata')();
const global_conf = require('../config/global');
const models = require('../models/');
const mailer = require('../utils/mailer');

/* Queue */
router.get('/queue', middlewares.isAdmin, (req, res) => {
	res.render('front/administration/queue');
});

router.get('/get_queue', middlewares.isAdmin, (req, res) => {
	res.status(200).send(global.app_queue);
});

router.post('/remove_in_queue', middlewares.isAdmin, (req, res) => {
	global.app_queue.splice(req.body.idx_to_remove, 1);
	res.status(200).send(true);
});

/* Users */
router.get('/users', middlewares.isAdmin, (req, res) => {
	models.User.findAll({
		include: [{
			all: true
		}]
	}).then(users => {
		const redirect = global_conf.demo_mode ? 'front/administration/users/list_demo' : 'front/administration/users/list';
		res.render(redirect, {
			users: users
		});
	})
});

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
			res.render('front/administration/users/show', {user: user, otherApp: applications})
		})
	})
});

router.get('/users/create', middlewares.isAdmin, (req, res) => {
	models.Role.findAll().then(roles => {
		res.render('front/administration/users/create', {roles: roles})
	})
});

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
			phone: req.body.phone,
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
		res.redirect("/administration/users/show/" + user.id)
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message || 'Sorry, an error occured',
			level: "error"
		}];
		res.redirect("/administration/users/create");
	})
});

router.get('/users/update/:id', middlewares.isAdmin, (req, res) => {

	if(req.params.id == 1){
		req.session.toastr = [{
			message: "You can't modify the main administrator account",
			level: "error"
		}];
		return res.redirect("/administration/users");
	}

	models.User.findOne({
		where: {
			id: req.params.id
		},
		include: [{all: true}]
	}).then(user => {
		models.Role.findAll().then(roles => {
			res.render('front/administration/users/update', {user: user, roles: roles})
		})
	})
});

router.post('/users/update', middlewares.isAdmin, (req, res) => {
	if(req.body.id == 1){
		req.session.toastr = [{
			message: "You can't modify the main administrator account",
			level: "error"
		}];
		return res.redirect("/administration/users");
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
		res.redirect("/administration/users/show/" + req.body.id);
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: "error"
		}];
		res.redirect("/administration/users/show/" + req.body.id);
	});
});

router.post('/users/delete', middlewares.isAdmin, (req, res) => {
	if(req.body.id == 1){
		req.session.toastr = [{
			message: 'users.not_delete_admin',
			level: "error"
		}];
		return res.redirect("/administration/users")
	}

	models.User.destroy({
		where: {
			id: req.body.id
		}
	}).then(_ => {

		// Logout user from session
		access.logout_user(req.body.id);

		req.session.toastr = [{
			message: 'action.success.destroy',
			level: "success"
		}];
		res.redirect("/administration/users")
	})
});

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
		res.redirect('/administration/users/show/' + userID + "#_applications");
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message,
			level: 'error'
		}];
		return res.redirect('/administration/users');
	})
});

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
		res.redirect('/administration/users/show/' + userID + "#_applications");
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message || "Sorry, an error occured",
			level: 'error'
		}];
		res.redirect('/administration/users/show/' + req.body.id_user + "#_applications");
	})
});

module.exports = router;