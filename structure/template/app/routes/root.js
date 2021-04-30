const CoreRoot = require('@core/routes/root');
const block_access = require('@core/helpers/access');

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
				block_access.isLoggedIn
			]
		}
	}
}

module.exports = Root;