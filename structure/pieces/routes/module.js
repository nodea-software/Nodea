const CoreModule = require('@core/routes/module');

class MODULE_NAME extends CoreModule {

	/**
	 * Represents a entity.
	 * @constructor
	 * @param {array} [additionalRoutes] - The models attributes of the entity.
	 */
	constructor(additionalRoutes = []) {
		const registeredRoutes = [
			'main',
			...additionalRoutes
		];
		super("MODULE_NAME", registeredRoutes);
	}

	// main() {
	// 	this.router.get(`/${this.moduleName}`, this.asyncRoute(async(data) => {
	// 		data.res.success(_ => data.res.render(`modules/m_${this.moduleName}`));
	// 	}));
	// }
}

module.exports = MODULE_NAME;