const fs = require('fs-extra');

const models = require('@app/models');

let LOAD_ACCESS_FILE = true;
function reloadAccess(reload = true) {
	LOAD_ACCESS_FILE = reload;
}
exports.reloadAccess = reloadAccess

// Get workspace modules and entities list
// Also get workspace's groups and roles
exports.getGroupRoleList = async function() {
	const values = {};
	const promises = [models.E_group.findAll(), models.E_role.findAll()];

	const [groups, roles] = await Promise.all(promises);
	values.groups = groups || [];
	values.roles = roles || [];

	// Get access configuration
	const access = JSON.parse(fs.readFileSync(__configPath + '/access.json', 'utf8'));

	// Restructure access object for dustjs
	const modules = [];
	for (const accessModule in access) {
		access[accessModule].name = accessModule;
		modules.push(access[accessModule]);
	}

	values.modules = modules;
	return values;
}

exports.setGroupAccess = function(modules, entities) {
	const accessFileName = __configPath + '/access.json';
	const access = JSON.parse(fs.readFileSync(accessFileName, 'utf8'));

	// Loop through access.json modules
	for (const accessModule in access) {
		// Set new groups to module if needed
		if (typeof modules[accessModule] !== 'undefined')
			access[accessModule].groups = modules[accessModule];

		// Loop through access.json entities
		for (let i = 0; i < access[accessModule].entities.length; i++) {
			const entity = access[accessModule].entities[i];
			// Set new groups to entity if needed
			if (typeof entities[entity.name] !== 'undefined')
				access[accessModule].entities[i].groups = entities[entity.name];
		}
	}

	// Write back new data to file
	fs.writeFileSync(accessFileName, JSON.stringify(access, null, 4), 'utf8');

	reloadAccess();
	return 1;
}

exports.setRoleAccess = function(entities) {
	const accessFileName = __configPath + '/access.json';
	const access = JSON.parse(fs.readFileSync(accessFileName, 'utf8'));

	for (const accessModule in access) {
		for (let i = 0; i < access[accessModule].entities.length; i++) {
			if (typeof entities[access[accessModule].entities[i].name] !== 'undefined')
				access[accessModule].entities[i].actions = entities[access[accessModule].entities[i].name];
		}
	}

	// Write back new data to file
	fs.writeFileSync(accessFileName, JSON.stringify(access, null, 4), 'utf8');

	reloadAccess();
	return 1;
}

// If the user is already identified, he can't access the login page
exports.loginAccess = function(req, res, next) {
	// If user is not authenticated in the session, carry on
	if (!req.isAuthenticated())
		return next();

	res.redirect('/module/home');
};

let ACCESS;
function getAccess() {
	if (LOAD_ACCESS_FILE || !ACCESS) {
		try {
			ACCESS = JSON.parse(fs.readFileSync(__configPath + '/access.json', 'utf8'));
		} catch (e) {
			console.error(e);
			return {};
		}
		LOAD_ACCESS_FILE = false;
	}
	return ACCESS;
}

function isInBothArray(stringArray, objectArray) {
	if (stringArray.length == 0)
		return false;
	let allowedCount = 0;
	for (let j = 0; j < objectArray.length; j++) {
		let isAllowed = true;
		for (let i = 0; i < stringArray.length; i++) {
			if (stringArray[i] == objectArray[j].f_label)
				isAllowed = false;
		}
		if (isAllowed == true)
			allowedCount++;
	}

	if (allowedCount > 0)
		return false
	return true;
}
// Check if user's group have access to module
exports.moduleAccess = function (userGroups, moduleName) {
	try {
		if(userGroups.length == 0)
			return false;
		const access = getAccess();
		for (const npsModule in access)
			if (npsModule == moduleName)
				if (isInBothArray(access[npsModule].groups, userGroups))
					return true;
		return false;
	} catch (e) {
		return false;
	}
}

exports.haveGroup = function(userGroups, group) {
	for (let i = 0; i < userGroups.length; i++)
		if (userGroups[i].f_label == group)
			return true;
	return false;
}

// Check if user's group have access to entity
exports.entityAccess = function (userGroups, entityName) {
	try {
		if(userGroups.length == 0)
			return false;
		const access = getAccess();
		for (const npsModule in access) {
			const moduleEntities = access[npsModule].entities;
			for (let i = 0; i < moduleEntities.length; i++)
				if (moduleEntities[i].name == entityName) {
					// Check if group can access entity AND module to which the entity belongs
					// if (!isInBothArray(moduleEntities[i].groups, userGroups)
					// && !isInBothArray(access[npsModule].groups, userGroups)) {
					//	 return true;
					// }

					// Check if group can access entity
					if (isInBothArray(moduleEntities[i].groups, userGroups))
						return true;
				}
		}
		return false;
	} catch (e) {
		return false;
	}
}

// Check if user's role can do `action` on entity
exports.actionAccess = function actionAccess(userRoles, entityName, action) {
	try {
		if(userRoles.length == 0)
			return false;
		const access = getAccess();
		for (const npsModule in access) {
			const moduleEntities = access[npsModule].entities;
			for (let i = 0; i < moduleEntities.length; i++)
				if (moduleEntities[i].name == entityName)
					return isInBothArray(moduleEntities[i].actions[action], userRoles)
		}
		return false;
	} catch (e) {
		return false;
	}
}

exports.accessFileManagment = function() {
	if (!fs.existsSync(__configPath + '/access.lock.json') && !fs.existsSync(__configPath + '/access.json'))
		throw new Error("Missing access.json and access.lock.json file.")

	// Generate access.json file
	if (!fs.existsSync(__configPath + '/access.json'))
		fs.copySync(__configPath + '/access.lock.json', __configPath + '/access.json');

	// Generate access.lock.json file
	if (!fs.existsSync(__configPath + '/access.lock.json'))
		fs.copySync(__configPath + '/access.json', __configPath + '/access.lock.json');
	else {
		// access.lock.json exist, check if new keys to add in access.json
		const access = JSON.parse(fs.readFileSync(__configPath + '/access.json'))
		const accessLock = JSON.parse(fs.readFileSync(__configPath + '/access.lock.json'))

		const emptyEntityContent = {
			"name": "",
			"groups": ["admin"],
			"actions": {
				"read": ["admin"],
				"create": ["admin"],
				"delete": ["admin"],
				"update": ["admin"]
			}
		}

		let lockEntities, accessEntities, found;
		// Add missing things in access.json
		for (const moduleLock in accessLock) {
			// Generate new module with entities and groups if needed
			if (!access[moduleLock]) {
				console.log("access.json: NEW MODULE: " + moduleLock);
				access[moduleLock] = {};
				access[moduleLock].entities = accessLock[moduleLock].entities;
				access[moduleLock].groups = accessLock[moduleLock].groups;
				continue;
			}

			// Loop on entities to add missing ones
			lockEntities = accessLock[moduleLock].entities;
			accessEntities = access[moduleLock].entities;
			for (let i = 0; i < lockEntities.length; i++) {
				found = false;
				for (let j = 0; j < accessEntities.length; j++)
					if (lockEntities[i].name == accessEntities[j].name) {
						found = true;
						break;
					}
				if (!found) {
					// Add new entity to access
					emptyEntityContent.name = lockEntities[i].name;
					accessEntities.push(Object.assign({}, emptyEntityContent));
					console.log("access.json : NEW ENTITY " + lockEntities[i].name + " IN MODULE " + moduleLock);
				}
			}
		}

		// Remove key in access that are not in access.lock
		for (const nps_module in access) {
			// Generate new module with entities and groups if needed
			if (!accessLock[nps_module]) {
				console.log("access.json: REMOVE MODULE: " + nps_module);
				delete access[nps_module];
				continue;
			}

			// Loop on entities to remove missing ones
			lockEntities = accessLock[nps_module].entities;
			accessEntities = access[nps_module].entities;
			const idxToRemove = [];
			for (let i = 0; i < accessEntities.length; i++) {
				found = false;
				for (let j = 0; j < lockEntities.length; j++) {
					if (accessEntities[i].name == lockEntities[j].name) {
						found = true;
						break;
					}
				}
				if (!found) {
					// Remove entity from access
					idxToRemove.push(i);
					console.log("access.json : REMOVE ENTITY " + accessEntities[i].name + " IN MODULE " + nps_module);
				}
			}

			access[nps_module].entities = access[nps_module].entities.filter((val, idx) => idxToRemove.indexOf(idx) == -1)
		}

		// Write access.json with new entries
		fs.writeFileSync(__configPath + '/access.json', JSON.stringify(access, null, 4), "utf8");
	}
}