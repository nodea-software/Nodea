const CoreApiDocumentation = require('@core/routes/api_documentation.js');
const middlewares = require('@core/helpers/middlewares');

class ApiDocumentation extends CoreApiDocumentation {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			api_documentation: [
				middlewares.isLoggedIn,
				middlewares.entityAccess('api_documentation')
			]
		}
	}
}

module.exports = ApiDocumentation;