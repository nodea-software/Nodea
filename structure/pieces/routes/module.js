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
}

module.exports = MODULE_NAME;