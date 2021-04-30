const CoreApiRoot = require('@core/api/root');

class ApiRoot extends CoreApiRoot {
	constructor() {
		const routes = []
		super(routes);
	}

	get hooks() {
		return {
			getToken: {
				//beforeSuccess: _ => {}
			}
		}
	}

	docData() {
		return null;
	}
}

module.exports = ApiRoot;