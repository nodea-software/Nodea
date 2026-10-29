const { env } = require("@config/global");

const authStrategy = {
	develop: {
		server: {
			url: "ldap://host.docker.internal:3890",
			bindDn: "cn=admin,dc=newmips,dc=run",
			bindSecret: "admin",
		},
		userAuth: {
			scope: "sub",
			searchBase: "ou=user,ou=default,ou=app,dc=newmips,dc=run",
			fields: {
				usernameField: "login",
				passwordField: "password",
			},
			ldapAttributesEqAppAttributes: {
				uid: "f_login",
				sn: "f_nom",
				givenName: "f_prenom",
				mail: "f_email",
			},
			loginField: "uid",
			searchFilter: "(uid={{username}})",
		},
		group: {
			searchFilter: "(objectClass=groupOfNames)",
			searchFilterUserGroups: "(&(objectClass=groupOfNames)(member={{dn}}))",
			objectClass: ["posixGroup", "groupOfUniqueNames", "groupOfNames"],
			searchBase: "ou=group,ou=default,ou=app,dc=newmips,dc=run",
			nameField: "cn",
			memberAttribute: "member",
		},
		paged: {
			sizeLimit: 0,
			pagePause: true,
		},
		accessAttribute: "f_label" /*means we use group or role f_label to check user group and role. We can use also use id */,
	},
	test: {
		server: {
			url: "",
			bindDn: "",
			bindSecret: "#",
		},
		userAuth: {
			scope: "sub",
			searchBase: "",
			fields: {
				usernameField: "login_user",
				passwordField: "password_user",
			},
			ldapAttributesEqAppAttributes: {
				givenName: "f_prenom",
				sn: "f_nom",
				mail: "f_email",
				sAMAccountName: "f_login",
			},
			loginField: "sAMAccountName",
			searchFilter: "(&(objectClass=user)(sAMAccountName={{username}}))",
			searchFilterWindowsStrategy: "(&(objectClass=user)(sAMAccountName={0}))",
		},
		group: {
			searchFilterUserGroups: "(&(objectClass=group)(member={{dn}}))",
			searchFilter: "(&(objectClass=group))",
			/**simple group list filter **/
			searchBase: "",
			nameField: "cn",
			memberAttribute: "member",
		},
		paged: {
			sizeLimit: 0,
			pagePause: true,
		},
		accessAttribute: "f_label" /*means we use group or role f_label to check user group and role. We can use also use id */,
	},
	production: {
		server: {
			url: "",
			bindDn: "",
			bindSecret: "",
		},
		userAuth: {
			scope: "sub",
			searchBase: "",
			fields: {
				usernameField: "login_user",
				passwordField: "password_user",
			},
			ldapAttributesEqAppAttributes: {
				givenName: "f_prenom",
				sn: "f_nom",
				mail: "f_email",
				sAMAccountName: "f_login",
			},
			loginField: "sAMAccountName",
			searchFilter: "(&(objectClass=user)(sAMAccountName={{username}}))",
			searchFilterWindowsStrategy: "(&(objectClass=user)(sAMAccountName={0}))",
		},
		group: {
			searchFilterUserGroups: "(&(objectClass=group)(sAMAccountType=)(member={{dn}}))",
			searchFilter: "(&(objectClass=group)(sAMAccountType=))",
			/**simple group list filter **/
			searchBase: "",
			nameField: "cn",
			memberAttribute: "member",
		},
		paged: {
			sizeLimit: 0,
			pagePause: true,
		},
		accessAttribute: "f_label" /*means we use group or role f_label to check user group and role. We can use also use id */,
	},
	studio: {
		server: {
			url: "",
			bindDn: "",
			bindSecret: "",
		},
		userAuth: {
			scope: "sub",
			searchBase: "",
			fields: {
				usernameField: "login_user",
				passwordField: "password_user",
			},
			ldapAttributesEqAppAttributes: {
				givenName: "f_prenom",
				sn: "f_nom",
				mail: "f_email",
				sAMAccountName: "f_login",
			},
			loginField: "sAMAccountName",
			searchFilter: "(&(objectClass=user)(sAMAccountName={{username}}))",
			searchFilterWindowsStrategy: "(&(objectClass=user)(sAMAccountName={0}))",
		},
		group: {
			searchFilterUserGroups: "(&(objectClass=group)(sAMAccountType=)(member={{dn}}))",
			searchFilter: "(&(objectClass=group)(sAMAccountType=))",
			/**simple group list filter **/
			searchBase: "",
			nameField: "cn",
			memberAttribute: "member",
		},
		paged: {
			sizeLimit: 0,
			pagePause: true,
		},
		accessAttribute: "f_label" /*means we use group or role f_label to check user group and role. We can use also use id */,
	},
	cloud: {
		server: {
			url: "",
			bindDn: "",
			bindSecret: "",
		},
		userAuth: {
			scope: "sub",
			searchBase: "",
			fields: {
				usernameField: "login_user",
				passwordField: "password_user",
			},
			ldapAttributesEqAppAttributes: {
				givenName: "f_prenom",
				sn: "f_nom",
				mail: "f_email",
				sAMAccountName: "f_login",
			},
			loginField: "sAMAccountName",
			searchFilter: "(&(objectClass=user)(sAMAccountName={{username}}))",
			searchFilterWindowsStrategy: "(&(objectClass=user)(sAMAccountName={0}))",
		},
		group: {
			searchFilterUserGroups: "(&(objectClass=group)(sAMAccountType=)(member={{dn}}))",
			searchFilter: "(&(objectClass=group)(sAMAccountType=))",
			/**simple group list filter **/
			searchBase: "",
			nameField: "cn",
			memberAttribute: "member",
		},
		paged: {
			sizeLimit: 0,
			pagePause: true,
		},
		accessAttribute: "f_label" /*means we use group or role f_label to check user group and role. We can use also use id */,
	},
};
module.exports = authStrategy[env];
