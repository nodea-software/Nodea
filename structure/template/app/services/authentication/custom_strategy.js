const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const models = require('@app/models');
// Handle writing log in file connection.log
const { writeConnectionLog } = require('@core/helpers/connection_log');

// Default authentication strategy : passport.authenticate('local')
passport.use(new LocalStrategy({
	usernameField: 'login',
	passwordField: 'password',
	passReqToCallback: true // Allows us to pass back the entire request to the callback
}, function (req, login, password, done) {
	function accessForbidden(msg){
		// Write in file connection.log
		const log = `LOGIN ERROR => ${msg} [login: ${login}]`;
		writeConnectionLog(log);

		console.error(log);
		if(!req.session.loginAttempt)
			req.session.loginAttempt = 0;
		req.session.loginAttempt++;

		req.session.toastr = [{
			message: "login.login_fail",
			level: 'error'
		}];

		return done(null, false);
	}

	if (password && password.length > 120)
		return accessForbidden('Mot de passe trop long');

	// Wrong captcha
	if(typeof req.session.loginCaptcha !== "undefined" && req.session.loginCaptcha && req.session.loginCaptcha != req.body.captcha)
		return accessForbidden("Le captcha saisi n'est pas correct.");

	models.E_user.findOne({
		where: {f_login: login},
		include: [{
			model: models.E_group,
			as: 'r_group'
		}, {
			model: models.E_role,
			as: 'r_role'
		}]
	}).then(function(user) {
		// If the user doesn't exist
		if (!user)
			return accessForbidden("Nom d'utilisateur inexistant.");

		// If the user has no password
		if (user.f_password == "" || user.f_password == null)
			return accessForbidden('Compte non activé - Mot de passe manquant');

		// If the user is not enabled
		if (user.f_enabled == false || user.f_enabled == null)
			return accessForbidden('Compte non activé');

		// If the user is found but the password is wrong
		if (!bcrypt.compareSync(password, user.f_password))
			return accessForbidden('Mauvais mot de passe.');

		// Access authorized
		delete req.session.loginAttempt;

		return done(null, user);
	});
}));

passport.serializeUser(function(user_id, done) {
	done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
	done(null, user_id);
});

exports.isLoggedIn = passport.authenticate('local', {
	failureRedirect: '/login',
	badRequestMessage: "login.missing_infos",
	failureFlash: true
});

exports.passport = passport;