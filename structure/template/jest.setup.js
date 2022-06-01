process.env.NODEA_ENV = "test";

const moduleAlias = require('module-alias');
moduleAlias.addAlias('@config', __dirname + '/config');
moduleAlias.addAlias('@core', __dirname + '/_core');
moduleAlias.addAlias('@app', __dirname + '/app');

const fs = require('fs-extra');
const models = require('@app/models');

module.exports = async () => {

	// Reset DB
	try {
		await models.sequelize.sync({force: true});
	} catch(err) {
		throw new Error('CANNOT CONNECT TO TEST DATABASE, PLEASE CHECK YOUR DATABASE AND config/database.js ON TEST ENV.');
	}

	const system = {
		user: {
			f_login: 'system'
		}
	};

	const [adminGroup, adminRole, admin] = await Promise.all([
		models.E_group.create({
			version: 0,
			f_label: 'admin'
		}, system),
		models.E_role.create({
			version: 0,
			f_label: 'admin'
		}, system),
		models.E_user.create({
			f_login: 'admin',
			f_email: 'admin@local.fr',
			f_password: null,
			f_enabled: 0,
			version: 0
		}, system)
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
};