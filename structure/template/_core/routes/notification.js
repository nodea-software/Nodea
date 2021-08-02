const Route = require('@core/abstract_routes/route');
const models = require('@app/models');
const middlewares = require('@core/helpers/middlewares');

class CoreNotification extends Route {
	constructor(additionalRoutes) {
		const routes = [
			'load',
			'read',
			'delete_all'
		]
		super([...routes, ...additionalRoutes]);

		this.defaultMiddlewares = [middlewares.isLoggedIn];
	}

	load() {
		this.router.get('/load/:offset', ...this.middlewares.load, this.asyncRoute( async (data) => {
			data.offset = parseInt(data.req.params.offset);
			data.limit = 10;
			data.order = [["createdAt", "DESC"]];
			data.userId = data.req.user.id;

			if (await this.getHook('load', 'start', data) === false)
				return;

			data.notifications = await models.E_notification.findAll({
				include: [{
					model: models.E_user,
					as: 'r_user',
					where: {id: data.userId}
				}],
				subQuery: false,
				order: data.order,
				limit: data.limit,
				offset: data.offset
			});

			if (await this.getHook('load', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.json(data.notifications));
		}));
	}

	read() {
		this.router.get('/read/:id', ...this.middlewares.read, this.asyncRoute( async (data) => {
			data.id = parseInt(data.req.params.id);
			data.userId = data.req.user.id;

			if (await this.getHook('read', 'start', data) === false)
				return;

			// Check if user owns notification
			data.notification = await models.E_notification.findOne({
				where: {id: data.id},
				include: {
					model: models.E_user,
					as: 'r_user',
					where: {id: data.userId}
				}
			});
			if (!data.notification.r_user)
				return data.res.error(_ => data.res.render('common/error', {error: 401}));

			data.redirect = data.notification.f_url != "#" ? data.notification.f_url : data.req.headers.referer;

			data.user = await models.E_user.findByPk(data.userId);
			await data.user.removeR_notification(data.notification.id);

			if (await this.getHook('read', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	delete_all() {
		this.router.get('/delete_all', ...this.middlewares.delete_all, this.asyncRoute( async (data) => {
			data.userId = data.req.user.id;

			if (await this.getHook('delete_all', 'start', data) === false)
				return;

			data.user = await models.E_user.findByPk(data.userId)
			await data.user.setR_notification([]);

			if (await this.getHook('delete_all', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.end());
		}));
	}
}

module.exports = CoreNotification;