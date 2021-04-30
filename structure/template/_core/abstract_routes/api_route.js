const Route = require('@core/abstract_routes/route');

class ApiRoute extends Route {
	constructor(additionalRoutes) {
		const routes = [
			...additionalRoutes
		]
		super(routes);
	}

	asyncRoute(fn) {
		return (...args) => {
			const fnReturn = fn(...args);
			const res = args[1];
			return Promise.resolve(fnReturn).catch(error => {
				console.error(error);
				res.status(500).json({error});
			});
		}
	}

	docData() {
		console.warn("WARN: ApiRoute virtual `docData()` called. Provide your documentation definition by implementing `docData()` on your ApiRoute subclass.")
	}
}

module.exports = ApiRoute;