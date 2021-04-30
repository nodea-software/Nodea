const Route = require('@core/abstract_routes/route');
const fs = require('fs-extra');

const component_helper = require('@core/helpers/address');
const translate = require('@core/helpers/language');

class CoreAddressSettings extends Route {
	constructor(additionalRoutes) {
		super([
			'config',
			'save',
			'info_address_maps_ajax',
			...additionalRoutes
		]);
	}

	//
	// Routes
	//

	config() {
		this.router.get('/config', ...this.middlewares.config, this.asyncRoute(async (data) => {
			data.address_settings = component_helper.buildComponentAddressConfig(data.req.session.lang_user);

			if (await this.getHook('config', 'start', data) === false)
				return;

			if (await this.getHook('config', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render('e_address_settings/config', {
				address_settings: data.address_settings
			}));
		}));
	}

	save() {
		this.router.post('/save', ...this.middlewares.save, this.asyncRoute(async (data) => {
			data.config = JSON.parse(fs.readFileSync(__configPath+ '/address_settings.json'));

			if (await this.getHook('save', 'start', data) === false)
				return;

			let i = 0;
			for (const item in data.config.entities) {
				data.config.entities[item].enableMaps = data.req.body.enableMaps[i];
				data.config.entities[item].navigation = data.req.body.navigation[i];
				data.config.entities[item].zoomBar = data.req.body.zoomBar[i];
				data.config.entities[item].mousePosition = data.req.body.mousePosition[i];
				let entity = item.replace('e_', '');
				entity = entity.charAt(0).toUpperCase() + entity.slice(1);
				for (const pos in data.config.entities[item].mapsPosition) {
					if (pos !== data.req.body["mapsPosition" + entity])
						data.config.entities[item].mapsPosition[pos] = false;
					else
						data.config.entities[item].mapsPosition[pos] = true;
				}
				i++;
			}
			fs.writeFileSync(__configPath + '/address_settings.json', JSON.stringify(data.config, null, 4));
			data.req.session.toastr = [{
				message: 'message.update.success',
				level: "success"
			}];

			if (await this.getHook('save', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect('/address_settings/config'));
		}));
	}

	info_address_maps_ajax() {
		this.router.get('/info_address_maps_ajax', ...this.middlewares.info_address_maps_ajax, this.asyncRoute(async (data) => {
			data.message = translate(data.req.session.lang_user).__("component.address_settings.info_address_maps");

			if (await this.getHook('info_address_maps_ajax', 'start', data) === false)
				return;

			if (await this.getHook('info_address_maps_ajax', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.status(200).json({
				message: data.message
			}));
		}));
	}
}

module.exports = CoreAddressSettings;