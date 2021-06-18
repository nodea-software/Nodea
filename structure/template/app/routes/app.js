const CoreApp = require('@core/routes/app');
const middlewares = require('@core/helpers/middlewares');

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
				middlewares.isLoggedIn
			],
			change_language: [
				middlewares.isLoggedIn
			],
			file_upload: [
				middlewares.isLoggedIn
			],
			get_file: [
				middlewares.isLoggedIn
			],
			download: [
				middlewares.isLoggedIn
			],
			delete_file: [
				middlewares.isLoggedIn
			]
		}
	}
}

module.exports = App;