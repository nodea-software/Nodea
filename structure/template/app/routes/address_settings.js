const CoreAddressSettings = require('@core/routes/address_settings');

class AddressSettings extends CoreAddressSettings {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes)
	}

	get hooks() {
		return {
			config: {
				// start: async data => {},
				// beforeRender: async data => {},
			},
			save: {
				// start: async data => {},
				// beforeRedirect: async data => {},
			},
			info_address_maps_ajax: {
				// start: async data => {},
				// beforeResponse: async data => {},
			}
		}
	}

	get middlewares() {
		return {
			config: [],
			save: [],
			info_address_maps_ajax: []
		}
	}
}

module.exports = AddressSettings;