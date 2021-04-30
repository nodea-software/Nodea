const CoreApp = require('@core/routes/app');
const block_access = require('@core/helpers/access');

class App extends CoreApp {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			status: [],
			widgets: [
				block_access.isLoggedIn
			],
			change_language: [
				block_access.isLoggedIn
			],
			file_upload: [
				block_access.isLoggedIn
			],
			get_file: [
				block_access.isLoggedIn
			],
			download: [
				block_access.isLoggedIn
			],
			delete_file: [
				block_access.isLoggedIn
			]
		}
	}
}

module.exports = App;