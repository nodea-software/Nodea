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
		this.router.get('/', this.middlewares.main, this.asyncRoute((req, res) => {
			const data = {};

			models.CODE_NAME_CATEGORY_MODEL.findAll().then(categories => {
				models.E_user.findAll().then(users => {

					data.categories = categories;
					data.events = [];
					data.users = users;

					res.render('CODE_NAME_LOWER/view_agenda', data);
				});
			});
		}));
	}

	get_event() {
		this.router.post('/get_event', this.middlewares.get_event, this.asyncRoute((req, res) => {
			(async () => {

				const events = await models.CODE_NAME_EVENT_MODEL.findAll({
					where: {
						f_start_date: {
							[models.$between]: [req.body.start, req.body.end]
						}
					},
					include: [{
						model: models.CODE_NAME_CATEGORY_MODEL,
						as: "r_category"
					}, {
						model: models.E_user,
						as: "r_users"
					}]
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
						eventId: events[i].id,
						title: events[i].f_title,
						start: events[i].f_start_date,
						end: events[i].f_end_date,
						allDay: events[i].f_all_day,
						idCategory: events[i].r_category.id,
						backgroundColor: events[i].r_category.f_color,
						// url: "/CODE_NAME_EVENT_URL/show?id=" + events[i].id, // Uncomment if you want to be redirected on event click
						resourceIds: resourceIds
					});
				}

				return eventsArray;
			})().then(eventsArray => {
				res.status(200).send(eventsArray)
			}).catch(err => {
				console.error(err);
				res.status(500).send(err)
			})
		}));
	}

	add_event() {
		this.router.post('/add_event', this.middlewares.add_event, this.asyncRoute(async (req, res) => {
			if(req.body.idCategory == "" || req.body.idCategory == 0)
				req.body.idCategory = null;

			const createObj = {
				version: 0,
				f_title: req.body.title,
				f_start_date: req.body.start,
				f_end_date: req.body.end,
				f_all_day: req.body.allday,
				fk_id_CODE_NAME_CATEGORY_URL_category: req.body.idCategory
			};

			const createdEvent = await models.CODE_NAME_EVENT_MODEL.create(createObj, {user: req.user});

			const users = [];
			if(req.body.idUser != null)
				users.push(req.body.idUser);
			await createdEvent.setR_users(users);

			res.json({
				success: true,
				idEvent: createdEvent.id
			});
		}));
	}

	resize_event() {
		this.router.post('/resize_event', this.middlewares.resize_event, this.asyncRoute(async (req, res) => {
			const updateObj = {
				f_start_date: req.body.start,
				f_end_date: req.body.end
			};

			await models.CODE_NAME_EVENT_MODEL.update(updateObj, {where: {id: req.body.eventId}}, {user: req.user});

			res.json({
				success: true
			});
		}));
	}

	update_event() {
		this.router.post('/update_event', this.middlewares.update_event, this.asyncRoute(async (req, res) => {
			const id_e_URL_ROUTE_event = parseInt(req.body.id);

			const e_URL_ROUTE_event = await models.CODE_NAME_EVENT_MODEL.findOne({
				where: { id: id_e_URL_ROUTE_event }
			});
			if (!e_URL_ROUTE_event)
				return res.render('common/error', {erro: 404});

			const [updateObject, updateAssociations] = model_builder.parseBody(attributes, options, req.body);

			if(isNaN(e_URL_ROUTE_event.version))
				updateObject.version = 0;
			updateObject.version++;

			// Update entity
			const updatedObject = await e_URL_ROUTE_event.update(updateObject, {user: req.user});
			// Update associations
			await Promise.all(updateAssociations.map(asso => e_URL_ROUTE_event[asso.func](asso.value)));

			res.send(updatedObject);
		}));
	}

	update_event_drop() {
		this.router.post('/update_event_drop', this.middlewares.update_event_drop, this.asyncRoute((req, res) => {
			(async () => {
				const updateObj = {
					f_start_date: req.body.start,
					f_end_date: req.body.end,
					f_all_day: typeof req.body.allDay === 'boolean' ? req.body.allDay : false
				};

				const currentEvent = await models.CODE_NAME_EVENT_MODEL.findByPk(req.body.eventId);
				await currentEvent.update(updateObj, {where: {id: req.body.eventId}}, {user: req.user});

				let users = [];
				if(req.body.idUsers != null)
					users = req.body.idUsers;
				else if (req.body.idUser != null)
					users.push(req.body.idUser);
				await currentEvent.setR_users(users)
			})().then(_ => {
				res.status(200).send(true);
			}).catch(err => {
				console.error(err);
				res.status(500).send(err);
			});
		}));
	}

	delete_event() {
		this.router.post('/delete_event', this.middlewares.delete_event, this.asyncRoute(async(req, res) => {
			const id_e_URL_ROUTE_event = parseInt(req.body.id);

			const deleteObject = await models.CODE_NAME_EVENT_MODEL.findOne({
				where: {
					id: id_e_URL_ROUTE_event
				}
			});

			await models.CODE_NAME_EVENT_MODEL.destroy({
				where: {
					id: id_e_URL_ROUTE_event
				}
			});

			res.send(true);
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