const Route = require('@core/abstract_routes/route');
const middlewares = require('@core/helpers/middlewares');
const apiLoader = require('@app/api/');

class ApiDocumentation extends Route {
	constructor() {
		super(['api_documentation']);
	}

	api_documentation() {
		this.router.get('/', middlewares.isLoggedIn, middlewares.entityAccess('api_documentation'), this.asyncRoute(async ({req, res}) => {
			const apiInstances = apiLoader.instances;
			const data = {
				api_files: []
			};

			for (const file of apiInstances) {
				let fileData;
				if (file.docData && (fileData = file.docData()))
					data.api_files.push(fileData);
			}

			res.success(_ => res.render('api_documentation', data));
		}));
	}
}

module.exports = ApiDocumentation;