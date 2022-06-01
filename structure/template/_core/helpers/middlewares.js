const models = require('@app/models');
const access = require('@core/helpers/access');

const upload = require('multer');
const multer = upload();

// route middleware to make sure user is logged in
exports.isLoggedIn = function(req, res, next) {
	// Autologin for Nodea's "iframe" live preview context
	if (global.auto_login == true) { // eslint-disable-line
		global.auto_login = false; // eslint-disable-line
		models.E_user.findOne({
			where: {id: 1},
			include: [{
				model: models.E_group,
				as: 'r_group'
			}, {
				model: models.E_role,
				as: 'r_role'
			}]
		}).then(user => req.login(user, _ => next()));
	}
	else if (req.isAuthenticated())
		return next();
	else
		res.redirect('/login?r=' + req.originalUrl);
};

// If the user is already identified, he can't access the login page
exports.loginAccess = function(req, res, next) {
	if (!req.isAuthenticated())
		return next();

	res.redirect('/module/home');
};

exports.moduleAccess = function(moduleName) {
	return function(req, res, next) {
		if (!req.isAuthenticated())
			return res.redirect('/login');
		const userGroups = req.session.passport.user.r_group;
		if (userGroups.length > 0 && access.moduleAccess(userGroups, moduleName))
			return next();

		if(userGroups.length == 0){
			req.session.toastr = [{
				level: 'error',
				message: "administration.access_settings.no_group"
			}];
			return res.redirect('/logout');
		}

		req.session.toastr = [{
			level: 'error',
			message: "administration.access_settings.no_access_group_module"
		}];
		return res.redirect('/');
	}
}

function entityAccess(entityName) {
	return function (req, res, next) {
		// In case of browser console request or other specific request (like healthcheck or other), user may not be defined
		if (!req.user)
			return res.redirect('/');
		if (req.originalUrl == '/user/settings') {
			// Exception for /user/settings, only logged access is required
			return next()
		} else if (req.originalUrl == `/${entityName}/search`) {
			// Exception for `/search` routes. We only check for 'read' action access.
			// Bypass module/entity access check
			if (access.actionAccess(req.user.r_role, entityName, 'read'))
				return next();
		} else {
			const userGroups = req.user.r_group;
			if (userGroups.length > 0 && access.entityAccess(userGroups, entityName))
				return next();
		}
		req.session.toastr = [{
			level: 'error',
			message: "administration.access_settings.no_access_group_entity"
		}];
		return res.redirect('/');
	}
}
exports.entityAccess = entityAccess;

function actionAccess(entityName, action) {
	return function (req, res, next) {
		const userRoles = req.user.r_role;
		if (userRoles && userRoles.length > 0 && access.actionAccess(userRoles, entityName, action))
			return next();
		req.session.toastr = [{
			level: 'error',
			message: "administration.access_settings.no_access_role"
		}];
		return res.redirect('/');
	}
}
exports.actionAccess = actionAccess;

// API Access
exports.apiAuthentication = function (req, res, next) {
	const token = req.query.token;

	models.E_api_credentials.findOne({
		where: {
			f_token: token
		},
		include: [{
			model: models.E_group,
			as: 'r_group'
		}, {
			model: models.E_role,
			as: 'r_role'
		}]
	}).then(credentialsObj => {
		if (!credentialsObj)
			return res.status(401).end('Bad Bearer Token');

		const currentTmsp = new Date().getTime();
		if (parseInt(credentialsObj.f_token_timeout_tmsp) < currentTmsp)
			return res.status(403).json('Bearer Token expired');

		req.apiCredentials = credentialsObj;
		req.user = {
			f_login: credentialsObj.f_client_name
		};
		next();
	});
}

exports.apiEntityAccess = function (entityName) {
	return function (req, res, next) {

		const userGroups = req.apiCredentials.r_group;
		if (userGroups.length > 0 && access.entityAccess(userGroups, entityName))
			return next();

		res.status(403).json({
			level: 'error',
			message: "You are not allowed to access entity " + entityName
		});
	}
}

exports.apiActionAccess = function (entityName, action) {
	return function (req, res, next) {
		const userRoles = req.apiCredentials.r_role;

		if (access.actionAccess(userRoles, entityName, action))
			return next();

		res.status(403).json({
			level: 'error',
			message: "This action is not authorized on entity " + entityName
		});
	}
}

exports.statusGroupAccess = function(req, res, next) {
	const idNewStatus = parseInt(req.params.id_new_status);
	const userGroups = req.session.passport.user.r_group;

	models.E_status.findOne({
		where: { id: idNewStatus },
		include: [{
			model: models.E_group,
			as: "r_accepted_group"
		}]
	}).then(newStatus => {
		if(!newStatus)
			return next();
		// No groups defined, open for all
		if(!newStatus.r_accepted_group || newStatus.r_accepted_group.length == 0)
			return next();
		for (let i = 0; i < userGroups.length; i++)
			for (let j = 0; j < newStatus.r_accepted_group.length; j++)
				// You are in accepted groups, let's continue
				if(userGroups[i].id == newStatus.r_accepted_group[j].id)
					return next();

		console.warn("USER "+req.session.passport.user.f_login+" TRYING TO SET STATUS "+idNewStatus+ " BUT IS NOT AUTHORIZED.");
		req.session.toastr = [{
			message: "administration.access_settings.no_access_change_status",
			level: "error"
		}];
		return res.redirect("/");
	})
}

// fileFields = [{name: 'string', maxCount: int}]
exports.fileInfo = (fileFields) => (req, res, next) => {
	const fileMiddleware = fileFields && fileFields.length > 0
		? multer.fields(fileFields)
		: multer.none();

	fileMiddleware(req, res, err => {
		if (err)
			return next(err);
		next();
	});
}

exports.disableRoute = ({res}) => {
	res.render('common/error', {
		error: 404
	})
}