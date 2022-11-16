const fs = require('fs-extra');
const dust = require('dustjs-linkedin');

const Route = require('@core/abstract_routes/route');
const helpers = require('@core/helpers');
const access = helpers.access;
const language = helpers.language;

// Entity that shall be ignored to build group/role menu
const ignoreEntityList = ['notification'];

class CoreAccessSettings extends Route {

	constructor(additionalRoutes = []) {
		const registeredRoutes = [
			'show_api',
			'show_group',
			'show_role',
			'enable_disable_api',
			'set_group_access',
			'set_role_access',
			...additionalRoutes
		];
		super(registeredRoutes);
	}

	show_api() {
		this.router.get('/show_api', ...this.middlewares.show_api, this.asyncRoute(async (data) => {

			if (await this.getHook('show_api', 'start', data) === false)
				return;

			try {
				const appConf = JSON.parse(fs.readFileSync(__configPath + '/application.json', 'utf8'));
				data.api_enabled = appConf.api_enabled;
			} catch (err) {
				console.error("Coudn't read config/application.json - API disabled")
				console.error(err);
				data.api_enabled = false;
			}

			if (await this.getHook('show_api', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_access_settings/show_api', data));
		}));
	}

	show_group() {
		this.router.get('/show_group', ...this.middlewares.show_group, this.asyncRoute( async (data) => {
			const values = await access.getGroupRoleList()
			data.allGroups = values.groups;

			if (await this.getHook('show_group', 'start', data) === false)
				return;

			// Build traduction key for modules and entities
			for (let i = 0; i < values.modules.length; i++) {
				values.modules[i].tradKeyModule = "module.m_" + values.modules[i].name;
				for (let j = 0; j < values.modules[i].entities.length; j++) {
					if (ignoreEntityList.includes(values.modules[i].entities[j]))
						continue;

					const possibleTradKeys = [
						"entity.e_" + values.modules[i].entities[j].name + ".label_entity",
						"component.c_" + values.modules[i].entities[j].name + ".label_component",
						"component." + values.modules[i].entities[j].name + ".label_component",
						"administration.menu." + values.modules[i].entities[j].name
					];

					values.modules[i].entities[j].tradKeyEntity = values.modules[i].entities[j].name;
					for (let k = 0; k < possibleTradKeys.length; k++) {
						if (language(data.req.session.lang_user).__(possibleTradKeys[k]) != possibleTradKeys[k]){
							values.modules[i].entities[j].tradKeyEntity = possibleTradKeys[k];
							break;
						}
					}
				}
			}

			data.modules = values.modules;
			dust.helpers.isGroupChecked = function(chunk, context, bodies, params) {
				const currentSource = params.source;
				const currentTarget = params.target;
				if (currentSource.groups.indexOf(currentTarget) != -1)
					return true;
				return false;
			}

			if (await this.getHook('show_group', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_access_settings/show_group', data));
		}));
	}

	show_role() {
		this.router.get('/show_role', ...this.middlewares.show_role, this.asyncRoute(async (data) => {
			const values = await access.getGroupRoleList();
			data.allRoles = values.roles;
			data.colspan = data.allRoles.length + 1;

			if (await this.getHook('show_role', 'start', data) === false)
				return;

			// Build traduction key for modules and entities
			for (let i = 0; i < values.modules.length; i++) {
				values.modules[i].tradKeyModule = "module.m_" + values.modules[i].name;
				for (let j = 0; j < values.modules[i].entities.length; j++) {
					if (ignoreEntityList.includes(values.modules[i].entities[j]))
						continue;

					const possibleTradKeys = [
						"entity.e_" + values.modules[i].entities[j].name + ".label_entity",
						"component.c_" + values.modules[i].entities[j].name + ".label_component",
						"component." + values.modules[i].entities[j].name + ".label_component",
						"administration.menu." + values.modules[i].entities[j].name
					];

					values.modules[i].entities[j].tradKeyEntity = values.modules[i].entities[j].name;
					for (let k = 0; k < possibleTradKeys.length; k++) {
						if (language(data.req.session.lang_user).__(possibleTradKeys[k]) != possibleTradKeys[k]){
							values.modules[i].entities[j].tradKeyEntity = possibleTradKeys[k];
							break;
						}
					}
				}
			}

			data.modules = values.modules;
			dust.helpers.isActionChecked = function(chunk, context, bodies, params) {
				const currentSource = params.source;
				const currentTarget = params.target;
				const action = params.action;
				if (currentSource.actions[action] && currentSource.actions[action].indexOf(currentTarget) != -1)
					return true;
				return false;
			}

			if (await this.getHook('show_role', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_access_settings/show_role', data));
		}));
	}

	enable_disable_api() {
		this.router.post('/enable_disable_api', ...this.middlewares.enable_disable_api, this.asyncRoute(async (data) => {

			if (await this.getHook('enable_disable_api', 'start', data) === false)
				return;

			const enable = data.req.body.enable;
			const applicationConfigPath = __configPath+'/application.json';
			const applicationConfig = JSON.parse(fs.readFileSync(applicationConfigPath, 'utf8'));
			applicationConfig.api_enabled = enable == 'true';
			fs.writeFileSync(applicationConfigPath, JSON.stringify(applicationConfig, null, '\t'), 'utf8');

			if (await this.getHook('show_role', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.status(200).end());
		}));
	}

	set_group_access() {
		this.router.post('/set_group_access', ...this.middlewares.set_group_access, this.asyncRoute(async (data) => {
			data.form = data.req.body;
			data.newModuleAccess = {};
			data.newEntityAccess = {};

			if (await this.getHook('set_group_access', 'start', data) === false)
				return;

			for (const inputName in data.form) {
				// Add each not checked input to groups list
				const parts = inputName.split('.');
				if (parts[0] == 'module') {
					if (typeof data.newModuleAccess[parts[1]] === 'undefined')
						data.newModuleAccess[parts[1]] = [];
					if (data.form[inputName] == 'on')
						data.newModuleAccess[parts[1]].push(parts[2]);
				} else if (parts[0] == 'entity') {
					if (typeof data.newEntityAccess[parts[1]] === 'undefined')
						data.newEntityAccess[parts[1]] = [];
					if (data.form[inputName] == 'on')
						data.newEntityAccess[parts[1]].push(parts[2]);
				}
			}

			access.setGroupAccess(data.newModuleAccess, data.newEntityAccess);

			if (await this.getHook('set_group_access', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect('/access_settings/show_group'));
		}));
	}

	set_role_access() {
		this.router.post('/set_role_access', ...this.middlewares.set_role_access, this.asyncRoute(async (data) => {
			data.form = data.req.body;
			data.newActionRoles = {};

			if (await this.getHook('set_role_access', 'start', data) === false)
				return;

			for (const inputName in data.form) {
				const parts = inputName.split('.');
				if (typeof data.newActionRoles[parts[0]] === 'undefined')
					data.newActionRoles[parts[0]] = {
						read: [],
						create: [],
						update: [],
						delete: []
					};
				if (data.form[inputName] == 'on')
					data.newActionRoles[parts[0]][parts[2]].push(parts[1]);
			}

			access.setRoleAccess(data.newActionRoles);

			if (await this.getHook('set_group_access', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect('/access_settings/show_role'));
		}));
	}
}

module.exports = CoreAccessSettings;