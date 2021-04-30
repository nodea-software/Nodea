const passport = require('passport');
const WindowsStrategy = require('passport-windowsauth');
const ldapConfig = require('../config/ldap/ldap_config');
const models = require('/../../models/');
const language = require('../../services/language');
const ldapUtils = require('../../utils/ldap');

passport.use(new WindowsStrategy({
	ldap: {
		url: ldapConfig.server.url,
		bindDN: ldapConfig.server.bindDn,
		bindCredentials: ldapConfig.server.bindSecret,
		base: ldapConfig.userAuth.searchBase,
		search_query: ldapConfig.userAuth.searchFilterWindowsStrategy
	},
	usernameField: 'login',
	passwordField: 'password',
	passReqToCallback: true,
	integrated: true,
	getUserNameFromHeader: function(req) {
		// In the above apache config we set the x-forwarded-user header.
		// mod_auth_kerb uses user@domain

		return ''; // Must be remove after and get a valid username in req
		console.log(req.headers);
		return req.headers['x-forwarded-user'] ? req.headers['x-forwarded-user'].split('@')[0] : req.body.login_user;
	}
}, function(req, ldapUser, done) {

	(async() => {
		if (!ldapUser)
			throw new Error('component.ldap.invalid_credentials');

		// If ldap user exists
		let user = await models.E_user.findOne({
			where: {
				f_login: ldapUser._json[ldapConfig.userAuth.objectNameAttribute]
			},
			include: [{
				model: models.E_group,
				as: 'r_group'
			}, {
				model: models.E_role,
				as: 'r_role'
			}]
		});

		// If user doesn't exist
		ldapUser.cn = ldapUser._json[ldapConfig.userAuth.objectNameAttribute];
		ldapUser.dn = ldapUser._json.dn;
		ldapUser.sn = ldapUser._json.sn;
		ldapUser.mail = ldapUser.emails;

		ldapUser._groups = await ldapUtils.getUserGroups(ldapUser);
		ldapUser._groups = typeof ldapUser._groups === 'undefined' ? ldapUser._groups : [];

		let ldapGroupsSettings = ldapUtils.getLdapGroupsSettings();

		if (!user) {
			// Get ldap user group in local app using ldap group
			let result;
			try {
				result = await ldapUtils.getAppGroupsAndRoles(ldapUser);
			} catch (err) {
				throw new Error('component.ldap.access_denied');
			}

			let userToCreate = {
				f_enabled: 1
			};

			for (let item in ldapConfig.userAuth.ldapAttributesEqAppAttributes) {
				if (ldapUser[item])
					userToCreate[ldapConfig.userAuth.ldapAttributesEqAppAttributes[item]] = ldapUser[item];
			}

			try {
				user = await models.E_user.create(userToCreate);
			} catch (err) {
				throw new Error('component.ldap.access_denied');
			}

			if (!result.groups.length || !result.roles.length)
				throw new Error('component.ldap.authentication_failed');

			try {
				user = await ldapUtils.setUserGroupsAndRoles(user, result);
			} catch (err) {
				throw new Error('component.ldap.create_user_error');
			}

			if (!ldapUtils.haveAccess(ldapUser) && ldapGroupsSettings.give_access_to_all_groups !== 'true')
				throw new Error('component.ldap.access_denied');

			return user;
		} else {

			if (!user.f_enabled)
				throw new Error('component.ldap.account_not_enabled');

			if (!ldapUser._groups.length)
				throw new Error('component.ldap.access_denied');

			// Check if user have access
			if (!ldapUtils.haveAccess(ldapUser) && ldapGroupsSettings.give_access_to_all_groups !== 'true')
				throw new Error('component.ldap.access_denied');

			// If update_user_group_on_login is enable, always get ldap user groups and update user groups and roles in app
			if (ldapGroupsSettings.update_user_groups_on_login == 'true') {
				let result;
				try {
					result = await ldapUtils.getAppGroupsAndRoles(ldapUser);
				} catch (err) {
					throw new Error('component.ldap.authentication_failed');
				}

				if (!result.groups.length || !result.roles.length)
					throw new Error('component.ldap.access_denied');

				user = await ldapUtils.setUserGroupsAndRoles(user, result);
				return user;

			} else {
				if (user.r_group.length && user.r_role.length)
					return user;

				throw new Error('component.ldap.access_denied');
			}
		}
	})().then(user => {
		return done(null, user);
	}).catch(err => {
		console.error(language(req.session.lang_user).__(err.message))
		req.flash('error', language(req.session.lang_user).__(err.message) || language(req.session.lang_user).__('login.ldap.authentication_failed'))
		return done(null, false);
	});
}));

passport.serializeUser(function(user_id, done) {
	done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
	done(null, user_id);
});

exports.isLoggedIn = passport.authenticate('WindowsAuthentication', {
	failureRedirect: '/login',
	failureFlash: true,
	failWithError: true,
	invalidCredentials: language('fr-FR').__('component.ldap.invalid_credentials'),
	badRequestMessage: language('fr-FR').__('component.ldap.bad_request_message')
});

exports.passport = passport;