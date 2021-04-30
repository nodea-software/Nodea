const Route = require('@core/abstract_routes/route');
const models = require('@app/models');
const helpers = require('@core/helpers');
const block_access = helpers.access;

class Chat extends Route {

	constructor() {
		super([
			'user_search',
			'channel_search'
		]);
	}

	//
	// Routes
	//

	user_search() {
		this.router.post('/user_search', this.middlewares.user_search, this.asyncRoute(async(req, res) => {
			const results = await models.E_user.findAll({
				where: {
					f_login: {
						[models.$like]: '%' + req.body.search + '%'
					}
				}
			});

			const data = [];
			for (let i = 0; i < results.length; i++)
				data.push({
					id: results[i].id,
					text: results[i].f_login
				});
			res.status(200).send(data);
		}));
	}

	channel_search() {
		this.router.post('/channel_search', this.middlewares.channel_search, this.asyncRoute(async (req, res) => {
			const results = await models.E_channel.findAll({
				where: {
					f_type: 'public',
					f_name: {
						[models.$like]: '%' + req.body.search + '%'
					}
				}
			});

			const data = [];
			for (let i = 0; i < results.length; i++)
				data.push({
					id: results[i].id,
					text: results[i].f_name
				});

			res.status(200).send(data);
		}));
	}

	get middlewares() {
		return {
			user_search: [
				block_access.isLoggedIn
			],
			channel_search: [
				block_access.isLoggedIn
			]
		}
	}
}

module.exports = Chat;