const Route = require('@core/abstract_routes/route');

const models = require('@app/models');
const attributes = require('@app/models/attributes/e_URL_ROUTE_event');
const options = require('@app/models/options/e_URL_ROUTE_event');

const helpers = require('@core/helpers');
const block_access = helpers.access;
const model_builder = helpers.model_builder;
const entity_helper = helpers.entity;

class Agenda extends Route {

	constructor() {
		super([
			'main',
			'get_event',
			'add_event',
			'resize_event',
			'update_event',
			'update_event_drop',
			'delete_event'
		]);
	}

	//
	// Routes
	//

	main() {
		this.router.get('/', this.middlewares.main, this.asyncRoute(async (data) => {
			const categories = await models.CODE_NAME_CATEGORY_MODEL.findAll({}, {
				transaction: data.transaction
			});

			const users = await models.E_user.findAll({}, {
				transaction: data.transaction
			});

			data.res.success(_ => data.res.render('CODE_NAME_LOWER/view_agenda', {
				categories: categories,
				users: users,
				events: []
			}));
		}));
	}

	get_event() {
		this.router.post('/get_event', this.middlewares.get_event, this.asyncRoute(async(data) => {

			const events = await models.CODE_NAME_EVENT_MODEL.findAll({
				where: {
					f_start_date: {
						[models.$between]: [data.req.body.start, data.req.body.end]
					}
				},
				include: [{
					model: models.CODE_NAME_CATEGORY_MODEL,
					as: "r_category"
				}, {
					model: models.E_user,
					as: "r_users"
				}]
			}, {
				transaction: data.transaction
			});

			const eventsArray = [];
			for (let i = 0; i < events.length; i++) {
				if (events[i].r_category == null) {
					events[i].r_category = {
						f_color: "#CCCCCC"
					};
				}
				const resourceIds = [];
				for (let j = 0; j < events[i].r_users.length; j++) {
					resourceIds.push(events[i].r_users[j].id);
				}
				eventsArray.push({
					id: events[i].id,
					title: events[i].f_title,
					start: events[i].f_start_date,
					end: events[i].f_end_date,
					allDay: events[i].f_all_day,
					idCategory: events[i].r_category.id,
					backgroundColor: events[i].r_category.f_color,
					borderColor: events[i].r_category.f_color,
					// url: "/CODE_NAME_EVENT_URL/show?id=" + events[i].id, // Uncomment if you want to be redirected on event click
					resourceIds: resourceIds
				});
			}

			data.res.success(_ => data.res.status(200).send(eventsArray));
		}));
	}

	add_event() {
		this.router.post('/add_event', this.middlewares.add_event, this.asyncRoute(async (data) => {

			if(data.req.body.idCategory == '' || data.req.body.idCategory == 0)
				data.req.body.idCategory = null;

			const createObj = {
				version: 0,
				f_title: data.req.body.title,
				f_start_date: data.req.body.start,
				f_end_date: data.req.body.end,
				f_all_day: data.req.body.allday,
				fk_id_CODE_NAME_CATEGORY_URL_category: data.req.body.idCategory
			};

			const createdEvent = await models.CODE_NAME_EVENT_MODEL.create(createObj, {
				user: data.req.user,
				transaction: data.transaction
			});

			let users = [];
			if (data.req.body.resourceIds && data.req.body.resourceIds.length != 0)
				users = data.req.body.resourceIds.map(x => parseInt(x));

			await createdEvent.setR_users(users, {
				transaction: data.transaction
			});

			data.res.success(_ => data.res.status(200).send(createdEvent));
		}));
	}

	resize_event() {
		this.router.post('/resize_event', this.middlewares.resize_event, this.asyncRoute(async (data) => {
			const updateObj = {
				f_start_date: data.req.body.start,
				f_end_date: data.req.body.end
			};

			await models.CODE_NAME_EVENT_MODEL.update(updateObj, {
				where: {
					id: data.req.body.id
				}
			}, {
				user: data.req.user,
				transaction: data.transaction
			});

			data.res.success(_ => data.res.status(200).json({
				success: true
			}));
		}));
	}

	update_event() {
		this.router.post('/update_event', this.middlewares.update_event, this.asyncRoute(async (data) => {
			const id_e_URL_ROUTE_event = parseInt(data.req.body.id);

			const e_URL_ROUTE_event = await models.CODE_NAME_EVENT_MODEL.findOne({
				where: {
					id: id_e_URL_ROUTE_event
				}
			}, {
				transaction: data.transaction
			});

			if (!e_URL_ROUTE_event)
				throw new Error('404 - Not found');

			const [updateObject, updateAssociations] = model_builder.parseBody('e_URL_ROUTE_event', attributes, options, data.req.body);

			if (isNaN(e_URL_ROUTE_event.version))
				updateObject.version = 0;
			updateObject.version++;

			// Update entity
			const updatedObject = await e_URL_ROUTE_event.update(updateObject, {
				user: data.req.user,
				transaction: data.transaction
			});

			// Update associations
			await Promise.all(updateAssociations.map(asso => e_URL_ROUTE_event[asso.func](asso.value)));

			data.res.success(_ => data.res.send(updatedObject));
		}));
	}

	update_event_drop() {
		this.router.post('/update_event_drop', this.middlewares.update_event_drop, this.asyncRoute(async (data) => {

			const updateObj = {
				f_start_date: data.req.body.start,
				f_end_date: data.req.body.end,
				f_all_day: typeof data.req.body.allDay === 'boolean' ? data.req.body.allDay : false
			};

			const currentEvent = await models.CODE_NAME_EVENT_MODEL.findByPk(data.req.body.id, {
				transaction: data.transaction
			});

			await currentEvent.update(updateObj, {
				user: data.req.user,
				transaction: data.transaction
			});

			let users = [];
			if (data.req.body.resourceIds && data.req.body.resourceIds.length != 0)
				users = data.req.body.resourceIds.map(x => x.id);

			await currentEvent.setR_users(users, {
				transaction: data.transaction
			})

			data.res.success(_ => data.res.status(200).send(true));
		}));
	}

	delete_event() {
		this.router.post('/delete_event', this.middlewares.delete_event, this.asyncRoute(async(data) => {
			const id_e_URL_ROUTE_event = parseInt(data.req.body.id);

			const deleteObject = await models.CODE_NAME_EVENT_MODEL.findOne({
				where: {
					id: id_e_URL_ROUTE_event
				}
			}, {
				transaction: data.transaction
			});

			await models.CODE_NAME_EVENT_MODEL.destroy({
				where: {
					id: id_e_URL_ROUTE_event
				}
			}, {
				transaction: data.transaction
			});

			data.res.success(_ => data.res.send(true));
			entity_helper.removeFiles("e_URL_ROUTE_event", deleteObject, attributes);
		}));
	}

	get middlewares() {
		return {
			main: [
				block_access.isLoggedIn
			],
			get_event: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", "read")
			],
			add_event: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", "create")
			],
			resize_event: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", "create")
			],
			update_event: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", "update")
			],
			update_event_drop: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", 'update')
			],
			delete_event: [
				block_access.actionAccessMiddleware("URL_ROUTE_event", "delete")
			]
		}
	}
}

module.exports = Agenda;