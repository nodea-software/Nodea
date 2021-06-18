const CoreRoot = require('@core/routes/root');
const middlewares = require('@core/helpers/middlewares');

class Root extends CoreRoot {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			root: [],
			status_comment: [
				middlewares.isLoggedIn
			]
		}
	}
}

module.exports = Root;