const passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const models = require('../../models/');
const moment = require('moment');

// Default authentication strategy : passport.authenticate('local')
passport.use(new LocalStrategy({
	usernameField: 'login',
	passwordField: 'password',
	passReqToCallback: true // allows us to pass back the entire request to the callback
},
async (req, login, password, done) => {
	try {
		const user = await models.User.findOne({
			where: {
				[models.$or]: [{
					login: login.toLowerCase()
				}, {
					email: login.toLowerCase()
				}]
			}
		})

		let loginValid = true;
		if (!user) {
			// If the user doesn't exist
			loginValid = false;
			console.warn('CONNECTION ATTEMPT FAIL: USER "' + login + '" DOES NOT EXIST.');
		} else if (user.password == "" || user.password == null) {
			// If the user has no password
			loginValid = false;
			console.warn('CONNECTION ATTEMPT FAIL: USER "' + login + '" PASSWORD IS NOT SET.');
		} else if (!bcrypt.compareSync(password, user.password)) {
			// If the user is found but the password is wrong
			loginValid = false;
			console.warn('CONNECTION ATTEMPT FAIL: USER "' + login + '" WRONG PASSWORD.');
		}

		if (!loginValid) {
			req.session.toastr = [{
				message: "login.login_fail",
				level: "error"
			}];
			return done(null, false);
		}

		const dataColumnName = models.sequelize.options.dialect == 'postgres' ? 'sess' : 'data';
		const sessionIDCol = models.sequelize.options.dialect == 'postgres' ? 'sid' : 'session_id';
		// Check if current user is already connected
		const sessions = await models.sequelize.query("SELECT " + sessionIDCol + ", " + dataColumnName + " FROM sessions", {
			type: models.sequelize.QueryTypes.SELECT
		});
		let currentSession, sessionID;
		for (let i = 0; i < sessions.length; i++) {
			sessionID = sessions[i][sessionIDCol];
			currentSession = sessions[i][dataColumnName];

			if (typeof sessions[i][dataColumnName] === "string")
				currentSession = JSON.parse(sessions[i][dataColumnName]);

			if (typeof currentSession.passport !== "undefined" &&
				typeof currentSession.passport.user !== "undefined" &&
				currentSession.cookie.expires &&
				moment().isBefore(currentSession.cookie.expires) // Not counting expired session
				&&
				currentSession.passport.user.id == user.id &&
				currentSession.isgenerator) {
				console.log("USER ALREADY LOGGED IN:", currentSession.passport.user.login);
				// eslint-disable-next-line no-await-in-loop
				await models.sequelize.query("DELETE FROM sessions WHERE " + sessionIDCol + " = '" + sessionID + "';", {
					type: models.sequelize.QueryTypes.DELETE
				});
			}
		}

		return done(null, user);
	} catch (err) {
		console.error(err);
	}
}));

passport.serializeUser(function(user_id, done) {
	done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
	done(null, user_id);
});

exports.authenticate = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: true
});