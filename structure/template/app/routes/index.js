const fs = require('fs-extra');
const path = require('path');
const basename = path.basename(module.filename);

const Route = require('@core/abstract_routes/route');
const Module = require('@core/routes/module');
const Entity = require('@core/abstract_routes/entity');
const Login = require('@core/routes/login');
const Root = require('@core/routes/root');

// TODO => Voir si on peut éviter ça
const Tracking = require('@core/routes/tracking');

module.exports = app => {
	fs.readdirSync(__dirname)
		.filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
		.forEach(file => {
			const FileRoute = require('./' + file); // eslint-disable-line
			const route = new FileRoute();
			file = file.slice(0, -3);

			if (!(route instanceof Route))
				throw new Error(`Route file '${file}' doesn't export @core/abstract_routes/route class`);

			let url;
			if (route instanceof Module)
				url = '/module';
			else if (route instanceof Entity || route instanceof Tracking || file.startsWith('c_'))
				url = '/' + file.substring(2);
			else if (route instanceof Login || route instanceof Root)
				url = '/';
			else
				url = '/' + file;

			app.use(url, ...route.defaultMiddlewares, route.routes);
		});
}