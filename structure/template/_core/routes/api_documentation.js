const Route = require('@core/abstract_routes/route');
const apiLoader = require('@app/api/');

class CoreApiDocumentation extends Route {
	constructor() {
		super(['api_documentation']);
	}

	api_documentation() {
		this.router.get('/', ...this.middlewares.api_documentation, this.asyncRoute(async data => {
			const apiInstances = apiLoader.instances;
			const obj = {
				api_files: []
			};

			for (const file of apiInstances) {
				let fileData;
				if (file.docData && (fileData = file.docData()))
					obj.api_files.push(fileData);
			}

			data.res.success(_ => data.res.render('api_documentation', obj));
		}));
	}
}

module.exports = CoreApiDocumentation;