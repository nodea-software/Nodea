const ldapjs = require('ldapjs');
const ldapConfig = require('../config/ldap/ldap_config');
const fs = require('fs-extra');
const globalConf = require('../config/global');
const acceptedAuthStrategies = ['ldap', 'windows_authentication'];
const models = require('../models/');

let client;
try {
	// Login
	if (globalConf.authStrategy && acceptedAuthStrategies.includes(globalConf.authStrategy.toLowerCase()) && (typeof client === 'undefined' || client && !client.connected)) {
		client = ldapjs.createClient({
			url: ldapConfig.server.url
		});
		client.on('error', function(err) {
			console.error("Failed to connect LDAP server!", err);
		});
		client.bind(ldapConfig.server.bindDn, ldapConfig.server.bindSecret, function(err) {
			if (err)
				console.error("Failed to connect to LDAP server, Invalid credentials!", err);
			else
				console.log("Connected to LDAP OK!");
		});
	}
} catch (err) {
	console.error(err);
}

function search(base, opts) {
	return new Promise((resolve, reject) => {
		if (client.connected) {
			const entries = [];
			client.search(base, opts, function(err, res) {
				if (err)
					return reject(err);
				res.on('searchEntry', function(entry) {
					const object = entry.object;
					if (object)
						entries.push(object);
				});
				res.on('error', function(err) {
					console.error(err)
					resolve(entries);
				});
				res.on('end', function() {
					return resolve(entries);
				});
			});
		} else
			reject({
				err: 'LDAP connexion not alive'
			});
	});
}

exports.getGroups = function() {
	return search(ldapConfig.group.searchBase, {
		scope: 'sub',
		filter: ldapConfig.group.searchFilter,
		sizeLimit: ldapConfig.paged.sizeLimit,
		paged: true
	});
};

exports.getUserGroups = function(user) {
	return search(ldapConfig.group.searchBase, {
		scope: 'sub',
		filter: '(&' + ldapConfig.group.searchFilter + '(' + ldapConfig.group.memberAttribute + '=' + user.dn + '))'
	});
};

exports.getAppGroupsAndRoles = function(ldapUser) {
	const ldapGroups = ldapUser._groups;
	const ldapGroupsSettings = JSON.parse(fs.readFileSync(__dirname + '/../config/ldap/ldap_groups_settings.json'));
	const accessAttribute = ldapConfig.accessAttribute || 'f_label';
	const groupNameAttribute = ldapConfig.group.objectNameAttribute || 'cn';
	const result = {
		groups: [],
		roles: [],
		ldapGroupsAndThereDescriptions: []
	};

	for (const ldapGroup in ldapGroups) {
		const currentGroup = ldapGroups[ldapGroup];
		const settingGroup = ldapGroupsSettings.ldap_groups[currentGroup[groupNameAttribute]];

		// Current group not in ldap_groups_settings.json
		if (!settingGroup)
			continue;

		// Access to all or only current group access
		if (ldapGroupsSettings.give_access_to_all_groups !== 'true' && !settingGroup.access)
			continue;

		for (const groupEntry in settingGroup.app_groups) {
			const currentAppGroup = settingGroup.app_groups[groupEntry];
			console.log(currentAppGroup)
			if (!result.groups.includes(currentAppGroup[accessAttribute]))
				result.groups.push(currentAppGroup[accessAttribute]);
		}

		for (const roleEntry in settingGroup.app_roles) {
			const currentAppRole = settingGroup.app_roles[roleEntry];
			console.log(currentAppRole)
			if (!result.roles.includes(currentAppRole[accessAttribute]))
				result.roles.push(currentAppRole[accessAttribute]);
		}

		result.ldapGroupsAndThereDescriptions.push(settingGroup);
	}
	return result;
};

// Check if user have access to login
exports.haveAccess = ldapUser => {
	const ldapUserGroups = ldapUser._groups;
	const ldapGroupsSettings = JSON.parse(fs.readFileSync(__dirname + '/../config/ldap/ldap_groups_settings.json'));
	const groupNameAttribute = ldapConfig.group.objectNameAttribute || 'cn';

	for (const ldapGroup in ldapUserGroups) {
		const currendLdapGroup = ldapUserGroups[ldapGroup];
		const groupEntry = ldapGroupsSettings.ldap_groups[currendLdapGroup[groupNameAttribute]];

		if (typeof groupEntry === 'undefined') {
			console.warn('Missing group (' + currendLdapGroup[groupNameAttribute] + ') definition in ldap_groups_settings.json');
			continue;
		}

		if (groupEntry.access)
			return true;
	}
	return false;
}

exports.getLdapGroupsSettings = function() {
	const ldapGroupsSettings = JSON.parse(fs.readFileSync(__dirname + '/../config/ldap/ldap_groups_settings.json'));
	if (typeof ldapGroupsSettings.ldap_groups === 'undefined')
		ldapGroupsSettings.ldap_groups = {};
	return ldapGroupsSettings;
};

exports.setUserGroupsAndRoles = async(user, options) => {

	const accessAttribute = ldapConfig.accessAttribute;
	const where = {};

	// Groups
	where[accessAttribute] = {
		[models.$in]: options.groups
	};
	const appGroups = await models.E_group.findAll({
		where
	});
	user.r_group = appGroups;

	// Roles
	where[accessAttribute] = {
		[models.$in]: options.roles
	};
	const appRoles = await models.E_role.findAll({
		where
	});
	user.r_role = appRoles;

	// Update
	await user.setR_group(appGroups);
	await user.setR_role(appRoles);

	user.dataValues.r_group = appGroups;
	user.dataValues.r_role = appGroups;

	return user;
};