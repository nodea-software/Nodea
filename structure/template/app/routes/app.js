const CoreApp = require('@core/routes/app');
const middlewares = require('@core/helpers/middlewares');

class App extends CoreApp {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {
			widgets: {
				// start: async (data) => {},
				// beforeSend: async (data) => {}
			}
		}
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
			get_file: [
				middlewares.isLoggedIn
			],
			download: [
				middlewares.isLoggedIn
			],
			translate: [
				middlewares.isLoggedIn
			]
		}
	}
}

module.exports = App;