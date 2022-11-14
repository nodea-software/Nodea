process.env.NODEA_ENV = "test";

const moduleAlias = require('module-alias');
moduleAlias.addAlias('@config', __dirname + '/../../../config');
moduleAlias.addAlias('@core', __dirname + '/../../../_core');
moduleAlias.addAlias('@app', __dirname + '/../../../app');
global.__configPath = __dirname + '/../../../config';
global.__corePath = __dirname + '/../../../_core';
global.__appPath = __dirname + '/../../../app';

const fs = require('fs-extra');
const models = require('@app/models');
const Entity = require('@core/abstract_routes/entity');

// USE node app/tests/cypress/setup.js [reset]
// Write reset if you want to reset de test database and fill it with default app/sql/setup.sql data

function getCombinaisons(...args) {
	const r = [],
		max = args.length - 1;

	function helper(arr, i) {
		for (let j = 0, l = args[i].length; j < l; j++) {
			const a = arr.slice(0);
			a.push(args[i][j]);
			if (i == max)
				r.push(a);
			else
				helper(a, i + 1);
		}
	}
	helper([], 0);
	return r;
}

const query_regex = new RegExp(/data\.req\.query\.(.*?)[ ;),.\]]/g);
function getQuery(code) {
	let queries = [];
	const results = [];
	while ((queries = query_regex.exec(code)) !== null) {
		if(!results.includes(queries[1]))
			results.push(queries[1]);
	}
	return results;
}

const params_regex = new RegExp(/data\.req\.params\.(.*?)[ ;),.\]}]/g);
function getParams(code) {
	let queries = [];
	const results = [];
	while ((queries = params_regex.exec(code)) !== null) {
		if(!results.includes(queries[1]))
			results.push(queries[1]);
	}
	return results;
}

(async () => {
	const cypress = {
		user: {
			f_login: 'cypress'
		}
	};

	if(process.argv[2] == 'reset') {

		// Reset DB
		try {
			await models.sequelize.sync({force: true});
		} catch(err) {
			throw new Error('CANNOT CONNECT TO TEST DATABASE, PLEASE CHECK YOUR DATABASE AND config/database.js ON TEST ENV.');
		}

		const [adminGroup, adminRole, admin] = await Promise.all([
			models.E_group.create({
				version: 0,
				f_label: 'admin'
			}, cypress),
			models.E_role.create({
				version: 0,
				f_label: 'admin'
			}, cypress),
			models.E_user.create({
				f_login: 'admin',
				f_email: 'admin@local.fr',
				f_password: null,
				f_enabled: 0,
				version: 0
			}, cypress)
		]);

		await Promise.all([
			admin.setR_role(adminRole.id),
			admin.setR_group(adminGroup.id)
		]);

		// Apply default SQL needed for test
		const setup_path = __dirname + '/app/sql/setup.sql';
		if(fs.existsSync(setup_path)){
			const setupSQL = fs.readFileSync(setup_path, 'utf8');
			await models.sequelize.query(setupSQL);
		}
	}

	// Clean old generated test file
	fs.rmdirSync(__dirname + '/e2e/generated', {
		recursive: true
	});

	const generate_user = false;
	if(generate_user) {
		const user_promises = [];
		// Generate random user based on groups and roles in test database
		const app_groups = await models.E_group.findAll();
		const app_roles = await models.E_role.findAll();

		const groups_ids = app_groups.map(x => x.id);
		const roles_ids = app_roles.map(x => x.id);
		const all_combinaison = getCombinaisons(groups_ids, roles_ids);

		for (let i = 0; i < all_combinaison.length; i++) {
			const combinaison = all_combinaison[i];
			user_promises.push((async _ => {
				const user = await models.E_user.create({
					f_login: `user_${i}`
				}, cypress);
				await user.addR_group(combinaison[0], cypress);
				await user.addR_role(combinaison[1], cypress);
			})())
		}
		await Promise.all(user_promises);
	}

	// Prepare entity and routes list
	const routes_path = __dirname + '/../../routes';
	const routes = fs.readdirSync(routes_path).filter(file => file.indexOf('.') !== 0 && file != 'index.js' && file.slice(-3) === '.js');
	const entity_fixtures = {}, routes_fixtures = {};
	for (let i = 0; i < routes.length; i++) {
		const Route = require('@app/routes/' + routes[i]); // eslint-disable-line
		const instance = new Route();
		// if(!instance.entity)
		// 	console.log(routes[i]);
		const get_list = [];
		for (let j = 0; j < instance.registeredRoutes.length; j++) {
			const route = instance.registeredRoutes[j];
			const routeConf = instance[route]();

			// WARN: Route is directly declaring itself to express router. It should return a configuration object.
			if (!routeConf)
				continue;

			const {method, path, middlewares, func} = routeConf; // eslint-disable-line
			if(method.toLowerCase() != 'get')
				continue;

			get_list.push({
				...routeConf,
				query: getQuery(func),
				params: getParams(func)
			});
		}

		if(instance instanceof Entity)
			entity_fixtures[routes[i].slice(0, -3)] = get_list;
		else
			routes_fixtures[routes[i].slice(0, -3)] = get_list;
	}

	// Generate cypress tests files
	const users = await models.E_user.findAll();
	const test_templates = fs.readdirSync(__dirname + '/template');
	const users_fixtures = {}, template_promises = [];
	let all_cy_content = '';

	for (let i = 0; i < users.length; i++) {
		const user = users[i];
		fs.mkdirSync(__dirname + `/e2e/generated/${user.f_login}/`, {
			recursive: true
		})
		all_cy_content += `// ${user.f_login}\n`;
		template_promises.push((async _ => {
			// Reset all user
			await user.update({
				f_enabled: 0,
				f_password: null
			}, cypress);
			users_fixtures[`${user.f_login}`] = {};
			for (let j = 0; j < test_templates.length; j++) {
				let template_content = fs.readFileSync(__dirname + '/template/' + test_templates[j], 'utf8');
				template_content = template_content.replace(/__CURRENT_USER__/g, user.f_login);
				if(test_templates[j] == '03-entity.cy.js') {
					let cpt = 1;
					// Generate each entity tests file based on entity.cy.js
					for (const entity in entity_fixtures) {
						const new_content = template_content.replace(/__CURRENT_ENTITY__/g, entity);
						fs.writeFileSync(__dirname + `/e2e/generated/${user.f_login}/03-${cpt}-${entity}.cy.js`, new_content, 'utf8');
						all_cy_content += `import './${user.f_login}/03-${cpt}-${entity}.cy.js'\n`;
						cpt++;
					}
				} else {
					all_cy_content += `import './${user.f_login}/${test_templates[j]}'\n`;
					fs.writeFileSync(__dirname + `/e2e/generated/${user.f_login}/${test_templates[j]}`, template_content, 'utf8');
				}
			}
		})())
	}

	await Promise.all(template_promises);

	fs.writeFileSync(__dirname + '/fixtures/users.json', JSON.stringify(users_fixtures, null, '\t'), 'utf8');
	fs.writeFileSync(__dirname + '/fixtures/entity.json', JSON.stringify(entity_fixtures, null, '\t'), 'utf8');
	fs.writeFileSync(__dirname + '/fixtures/routes.json', JSON.stringify(routes_fixtures, null, '\t'), 'utf8');
	fs.writeFileSync(__dirname + '/e2e/generated/all.cy.js', all_cy_content, 'utf8');

	process.exit(0);

})().catch(err => {
	console.log(err)
})