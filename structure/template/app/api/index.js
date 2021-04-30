const fs = require('fs');
const path = require('path');
const basename = path.basename(module.filename);
const appConf = require('@config/application.json');

const Route = require('@core/abstract_routes/route');
const ApiEntity = require('@core/abstract_routes/api_entity');
const ApiRoot = require('@core/api/root');

const instances = [];

function isApiEnabled(req, res, next) {
	if (appConf.api_enabled)
		return next();
	res.status(501).json({error: 'API not enabled'});
}

function routes (app) {
	fs.readdirSync(__dirname).filter(function(file){
		return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
	}).forEach(function(file){
		const FileRoute = require('./'+file); //eslint-disable-line
		const route = new FileRoute();
		file = file.slice(0, -3);

		if (!(route instanceof Route))
			throw new Error(`API Route file '${file}' doesn't export a @core/abstract_routes/route instance`);

		let url = '/api';
		if (route instanceof ApiRoot)
			url += '/';
		else if (route instanceof ApiEntity)
			url += '/'+file.substring(2);
		else
			url += '/'+file;

		app.use(url, isApiEnabled, ...route.defaultMiddlewares, route.routes);

		instances.push(route);
	});
}

module.exports = {
	routes,
	instances
}