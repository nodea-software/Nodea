const models = require('../models');
const globalConf = require('../config/global');
const fs = require('fs-extra');
const exec = require('child_process').exec;
const app_bundler = require("../structure/template/_core/tools/bundler");

// Setup the default admin user for Nodea generator
exports.setupAdmin = async function() {

	const user_count = await models.User.count();

	if(user_count > 0)
		return;

	console.log('👓 SETUP ADMIN USER...');

	await models.Role.findOrCreate({
		where: {
			id: 1,
			name: 'admin'
		}
	})

	await models.Role.findOrCreate({
		where: {
			id: 2,
			name: 'user'
		}
	})

	const admin = await models.User.create({
		id: 1,
		enabled: 0,
		email: globalConf.env == 'studio' ? globalConf.sub_domain + '-admin@nodea-software.com' : 'admin@local.fr',
		firstname: "Admin",
		lastname: "Nodea",
		login: "admin",
		password: null,
		phone: null,
		version: 1
	})

	await admin.setRole(1);
}

// Install node_modules folder in workspace needed by the generated application
exports.setupWorkspaceNodeModules = _ => new Promise((resolve, reject) => {

	// Mandatory workspace folder
	if (!fs.existsSync(global.__workspacePath))
		fs.mkdirSync(global.__workspacePath);
	else if (fs.existsSync(global.__workspacePath + '/node_modules'))
		return resolve();

	// We need to reinstall node modules properly
	console.log("🪄  WORKSPACE NODE MODULES INSTALL...");
	fs.copySync(__dirname + '/../structure/template/package.json', global.__workspacePath + '/package.json');

	exec('npm install', {
		cwd: global.__workspacePath + '/'
	}, err => {
		if (err) {
			console.error(err)
			return reject(err);
		}
		resolve();
	});

});

// Pre-bundle JS / CSS ressources to improve app generation rapidity
exports.setupTemplateBundle = app_bundler.bundleAll;