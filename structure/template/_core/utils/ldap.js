const ldapjs = require("ldapjs");
const ldapConfig = require("@config/ldap");
const fs = require("fs-extra");
const globalConf = require("@config/global");
const acceptedAuthStrategies = ["ldap", "windows_authentication"];
const models = require("@app/models");
const { randomUUID } = require("crypto");

let client;
try {
	// Login
	if (
		globalConf.authStrategy &&
		acceptedAuthStrategies.includes(globalConf.authStrategy.toLowerCase()) &&
		(typeof client === "undefined" || (client && !client.connected))
	) {
		client = ldapjs.createClient({
			url: ldapConfig.server.url,
		});
		client.on("error", function (err) {
			console.error("Failed to connect LDAP server!", err);
		});
		client.bind(ldapConfig.server.bindDn, ldapConfig.server.bindSecret, function (err) {
			if (err) console.error("Failed to connect to LDAP server, Invalid credentials!", err);
			else console.log("Connected to LDAP OK!");
		});
	}
} catch (err) {
	console.error(err);
}

const search = (base, opts) =>
	new Promise((resolve, reject) => {
		if (!client.connected) return reject(new Error("LDAP connection is not alive"));
		const entries = [];
		client.search(base, opts, (err, res) => {
			if (err) return reject(err);
			res.on("searchEntry", (entry) => {
				if (entry.object) entries.push(entry.object);
			});
			res.on("error", (err) => reject(err));
			res.on("end", () => resolve(entries));
		});
	});

exports.getGroups = async () => {
	try {
		const groups = await search(ldapConfig.group.searchBase, {
			scope: "sub",
			filter: ldapConfig.group.searchFilter,
			sizeLimit: ldapConfig.paged.sizeLimit,
			paged: true,
		});
		groups.forEach((group) => {
			group.uuid = randomUUID();
		});
		return groups;
	} catch (error) {
		return [];
	}
};

exports.getUserGroups = function (user) {
	return search(ldapConfig.group.searchBase, {
		scope: "sub",
		filter: "(&" + ldapConfig.group.searchFilter + "(" + ldapConfig.group.memberAttribute + "=" + user.dn + "))",
	});
};

exports.getAppGroupsAndRoles = function (ldapUser) {
	try {
		const settings = JSON.parse(fs.readFileSync(__dirname + "/../../config/ldap/ldap_groups_settings.json"));
		const { ldap_groups, give_access_to_all_groups: access } = settings;

		const accessAttribute = ldapConfig.accessAttribute;

		const groups = new Set();
		const roles = new Set();

		for (const group of ldapUser._groups || []) {
			const ldapGroupName = group?.[ldapConfig.group.nameField];

			const entries = ldap_groups.find((e) => e.name === ldapGroupName);
			if (entries.length === 0) continue;

			const hasAccess = entries.access || access;
			if (!hasAccess) continue;

			(entries.app_groups || []).forEach((g) => groups.add(g[accessAttribute]));
			(entries.app_roles || []).forEach((r) => roles.add(r[accessAttribute]));
		}

		return {
			groups: [...groups],
			roles: [...roles],
		};
	} catch (e) {
		throw new Error(`L'utilisateur ${ldapUser?.[ldapConfig.userAuth.loginField] || "inconnu"} n'a pas de groupe ou de role associé.`);
	}
};

// Check if user have access to login
exports.haveAccess = (ldapUser) => {
	const ldapUserGroups = ldapUser._groups;
	const ldapGroupsSettings = JSON.parse(fs.readFileSync(__dirname + "/../../config/ldap/ldap_groups_settings.json"));
	const groupNameAttribute = ldapConfig.group.nameField;

	if (ldapGroupsSettings.give_access_to_all_groups) return true;

	for (const ldapGroup in ldapUserGroups) {
		const currentLdapGroup = ldapUserGroups[ldapGroup];
		const groupEntry = ldapGroupsSettings.ldap_groups.find((e) => e.name === currentLdapGroup[groupNameAttribute]);

		if (typeof groupEntry === "undefined") {
			console.warn("Missing group (" + currentLdapGroup[groupNameAttribute] + ") definition in ldap_groups_settings.json");
			continue;
		}

		if (groupEntry.access) return true;
	}
	return false;
};

exports.getLdapGroupsSettings = function () {
	const ldapGroupsSettings = JSON.parse(fs.readFileSync(__dirname + "/../../config/ldap/ldap_groups_settings.json"));
	if (typeof ldapGroupsSettings.ldap_groups === "undefined") ldapGroupsSettings.ldap_groups = {};
	return ldapGroupsSettings;
};

exports.setUserGroupsAndRoles = async function (user, { groups = [], roles = [] }, transaction = null) {
	try {
		const accessAttribute = ldapConfig.accessAttribute;

		const groupWhere = groups.length ? { [accessAttribute]: { [models.$in]: groups } } : { id: 0 };
		const roleWhere = roles.length ? { [accessAttribute]: { [models.$in]: roles } } : { id: 0 };

		// Requêtes en parallèle (plus performant)
		const [appGroups, appRoles] = await Promise.all([models.E_group.findAll({ where: groupWhere }), models.E_role.findAll({ where: roleWhere })]);

		await Promise.all([user.setR_group(appGroups, { transaction }), user.setR_role(appRoles, { transaction })]);

		// Recharger l'utilisateur avec ses relations
		return await user.reload({
			include: [
				{ model: models.E_group, as: "r_group" },
				{ model: models.E_role, as: "r_role" },
			],
			transaction,
		});
	} catch (e) {
		throw new Error(`L'utilisateur ${user.f_login} n'a pas de groupe ou de role associé.`);
	}
};
