const passport = require("passport");
const LDAPStrategy = require("passport-ldapauth");
const ldapConfig = require("@config/ldap");
const models = require("@app/models");
const ldapUtils = require("@core/utils/ldap");
const { writeConnectionLog } = require("@core/helpers/connection_log");
const language = require("@core/helpers/language");
const lang = require("@config/application").lang;
const __ = language(lang).__;
const dayjs = require("dayjs");

passport.use(
	new LDAPStrategy(
		{
			server: {
				url: ldapConfig.server.url,
				bindDN: ldapConfig.server.bindDn,
				bindCredentials: ldapConfig.server.bindSecret,
				searchBase: ldapConfig.userAuth.searchBase,
				searchFilter: ldapConfig.userAuth.searchFilter,
				groupSearchBase: ldapConfig.group.searchBase,
				groupSearchFilter: ldapConfig.group.searchFilterUserGroups /**if set, system will automatically get user groups **/,
			},
			usernameField: ldapConfig.userAuth.fields.usernameField,
			passwordField: ldapConfig.userAuth.fields.passwordField,
			passReqToCallback: true, // allows us to pass back the entire request to the callback,
		},
		async function (req, ldapUser, done) {
			let user = null;
			const login = ldapUser[ldapConfig.userAuth.loginField];
			const transaction = await models.sequelize.transaction();

			try {
				user = await models.E_user.findOne({
					where: {
						f_login: login,
					},
					include: [
						{
							model: models.E_group,
							as: "r_group",
						},
						{
							model: models.E_role,
							as: "r_role",
						},
					],
				});

				const settings = ldapUtils.getLdapGroupsSettings();

				if (!ldapUtils.haveAccess(ldapUser)) {
					throw new Error(__("component.ldap.access_denied"));
				}

				if (!user) {
					const { groups, roles } = ldapUtils.getAppGroupsAndRoles(ldapUser);
					const userToCreate = {
						f_enabled: 1,
						f_last_connection: dayjs(),
					};
					const { ldapAttributesEqAppAttributes } = ldapConfig.userAuth;
					Object.entries(ldapAttributesEqAppAttributes).forEach(([ldapAttr, appAttr]) => {
						if (ldapUser?.[ldapAttr]) {
							userToCreate[appAttr] = ldapUser[ldapAttr];
						}
					});
					user = await models.E_user.create(userToCreate, { transaction });
					user = await ldapUtils.setUserGroupsAndRoles(user, { groups, roles }, transaction);
				}

				if (!user.f_enabled) {
					throw new Error(`User ${user.f_login} account not enabled`);
				}

				if (settings.update_user_groups_on_login) {
					const { groups, roles } = ldapUtils.getAppGroupsAndRoles(ldapUser);
					user = await ldapUtils.setUserGroupsAndRoles(user, { groups, roles }, transaction);
				}
				user.f_last_connection = dayjs();
				await user.save({ transaction });
				await transaction.commit();
				return done(null, user);
			} catch (err) {
				const message = err.message || __("component.ldap.authentication_failed");
				const log = `LOGIN ERROR => ${message} [login: ${login}]`;
				writeConnectionLog(log);
				req.session.toastr = [{ level: "error", message }];
				await transaction.rollback();
				return done(null, false);
			}
		}
	)
);

passport.serializeUser(function (user_id, done) {
	done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
	done(null, user_id);
});

exports.isLoggedIn = passport.authenticate("ldapauth", {
	failureRedirect: "/login",
	failureFlash: true,
	failWithError: true,
	invalidCredentials: __("component.ldap.invalid_credentials"),
	badRequestMessage: __("component.ldap.bad_request_message"),
});

exports.passport = passport;
