const CoreNotification = require('@core/routes/notification');

class Notification extends CoreNotification {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {
			load: {
				// start: async data => {}
				// beforeResponse: async data => {}
			},
			read: {
				// start: async data => {}
				// beforeRedirect: async data => {}
			},
			delete_all: {
				// start: async data => {}
				// beforeResponse: async data => {}
			}
		};
	}

	get middlewares() {
		return {
			load: [],
			read: [],
			delete_all: []
		}
	}
}

module.exports = Notification;