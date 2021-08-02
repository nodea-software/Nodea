const Route = require('@core/abstract_routes/route');
const middlewares = require('@core/helpers/middlewares');

class CoreModule extends Route {

	/**
	 * Represents a entity.
	 * @constructor
	 * @param {array} [additionalRoutes] - The models attributes of the entity.
	 */
	constructor(moduleName, additionalRoutes = []) {
		const registeredRoutes = [
			'main',
			...additionalRoutes
		];
		super(registeredRoutes);
		this.moduleName = moduleName.toLowerCase();

		this.defaultMiddlewares = [middlewares.isLoggedIn];
	}

	//
	// Routes
	//

	main() {
		this.router.get(`/${this.moduleName}`, this.asyncRoute(async(data) => {
			data.res.success(_ => data.res.render(`modules/m_${this.moduleName}`));
		}));
	}
}

module.exports = CoreModule;