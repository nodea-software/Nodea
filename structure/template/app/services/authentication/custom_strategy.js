const passport = require('passport');
const CustomStrategy = require('passport-customauth');
const language = require('../../services/language');

passport.use(new CustomStrategy({
	server: {
		url: null,
		bindDN: null,
		bindCredentials: null,
		searchBase: null,
		searchFilter: null,
		groupSearchBase: null,
		groupSearchFilter: null
	},
	usernameField: 'login',
	passwordField: 'password',
	passReqToCallback: true
}, (req, user, done) => {
	console.log(req);
	console.log(user);
	done();
}));

exports.isLoggedIn = passport.authenticate('customauth', {
	failureRedirect: '/login',
	failureFlash: true,
	failWithError: true,
	invalidCredentials: language('fr-FR').__('login.auth.invalid_credentials'),
	badRequestMessage: language('fr-FR').__('login.auth.bad_request_message')
});

exports.passport = passport;