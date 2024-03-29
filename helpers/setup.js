const models = require('../models');
const globalConf = require('../config/global');
const fs = require('fs-extra');
const exec = require('child_process').exec;
const app_bundler = require("../structure/template/_core/tools/bundler");
let npm_install_in_progress = false;

exports.npm_install_in_progress = _ => npm_install_in_progress;

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
	});

	await models.Role.findOrCreate({
		where: {
			id: 2,
			name: 'user'
		}
	});

	let admin_email = globalConf.env == 'studio' ? globalConf.sub_domain + '-admin@nodea-software.com' : 'admin@local.fr';
	if(process.env.ADMIN_EMAIL)
		admin_email = process.env.ADMIN_EMAIL;

	const admin = await models.User.create({
		id: 1,
		enabled: 0,
		email: admin_email,
		firstname: "Admin",
		lastname: "Nodea",
		login: "admin",
		password: null,
		phone: null,
		version: 1
	});

	await admin.setRole(1);
}

// Install node_modules folder in workspace needed by the generated application
exports.setupWorkspaceNodeModules = _ => new Promise(resolve => {

	// Mandatory workspace folder
	if (!fs.existsSync(global.__workspacePath))
		fs.mkdirSync(global.__workspacePath);
	else if (fs.existsSync(global.__workspacePath + '/node_modules'))
		return resolve();

	// We need to reinstall node modules properly
	console.log("🪄  WORKSPACE NODE MODULES INSTALL...");
	npm_install_in_progress = true;
	fs.copySync(__dirname + '/../structure/template/package.json', global.__workspacePath + '/package.json');

	exec('npm i --omit=optional', {
		cwd: global.__workspacePath + '/'
	}, err => {
		npm_install_in_progress = false;
		if (err)
			console.error(err);
	});
	resolve();
});

// Pre-bundle JS / CSS ressources to improve app generation rapidity
exports.setupTemplateBundle = app_bundler.bundleAll;