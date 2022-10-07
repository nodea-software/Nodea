const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_status');
const attributes = require('@app/models/attributes/e_status');

const models = require('@app/models');
const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

class E_status extends Entity {
	constructor() {
		const additionalRoutes = [
			'set_default',
			'diagram',
			'diagramdata',
			'set_children_diagram',
			'remove_children_diagram',
			'set_children',
		];
		super('e_status', attributes, options, helpers, additionalRoutes);
	}

	set_default() {
		this.router.get('/set_default/:id', middlewares.actionAccess("status", "update"), this.asyncRoute(async (data) => {
			const idStatus = data.req.params.id;
			data.transaction = await models.sequelize.transaction();

			const status = await models.E_status.findOne({where: {id: idStatus}, transaction: data.transaction});
			if (!status)
				return data.error(_ => data.res.render('common/error', {
					error: 404
				}));

			// Find all entities without status
			const entityModel = status.f_entity.capitalizeFirstLetter();
			const query = {
				where: {['fk_id_status_' + status.f_field.substring(2)]: null}
			};
			const no_statuses = await models[entityModel].findAll(query);
			if (!no_statuses || !no_statuses.length)
				return data.res.success(_ => data.res.redirect('/status/show?id=' + status.id));

			const actions = await this.helpers.status.getActions(idStatus);
			const statusUpdatePromises = [];
			for (const entity of no_statuses || []) {
				statusUpdatePromises.push((async entity => {
					await this.helpers.status.executeActions(entityModel, entity.id, actions, data.transaction);

					await this.helpers.status.setStatus(entityModel.toLowerCase(), entity.id, status.f_field.substring(2), idStatus, {
						user: data.req.user,
						transaction: data.transaction
					});

					await entity.update({['fk_id_status_' + status.f_field.substring(2)]: idStatus}, {user: data.req.user, transaction: data.transaction});
				})(entity));
			}

			await Promise.all(statusUpdatePromises);

			data.res.success(_ => data.res.redirect('/status/show?id=' + status.id));
		}));
	}

	diagram() {
		this.router.get('/diagram', middlewares.actionAccess("status", "read"), this.asyncRoute(async (data) => {
			data.res.success(_ => data.res.render('e_status/diagram', {statuses: helpers.status.entityStatusFieldList()}));
		}));
	}

	diagramdata() {
		this.router.post('/diagramdata', middlewares.actionAccess("status", "read"), this.asyncRoute(async (data) => {
			const statuses = await models.E_status.findAll({
				where: {
					f_entity: data.req.body.f_entity,
					f_field: data.req.body.f_field
				},
				include: {
					model: models.E_action,
					as: 'r_actions'
				}
			});

			if (statuses.length == 0)
				return data.res.success(_ => data.res.json({
					statuses: [],
					connections: []
				}));

			// Looking for r_children association through database table
			const throughTable = options.filter(x => x.target == 'e_status' && x.as == 'r_children')[0].through;

			const query = models.sequelize.options.dialect == 'postgres'
				? 'SELECT * FROM "' + throughTable + '";'
				: 'SELECT * FROM ' + throughTable + ';';

			const connections = await models.sequelize.query(query, {
				type: models.sequelize.QueryTypes.SELECT
			});
			data.res.success(_ => data.res.json({
				statuses,
				connections
			}));
		}));
	}

	set_children_diagram() {
		this.router.post('/set_children_diagram', middlewares.actionAccess("status", "update"), this.asyncRoute(async (data) => {
			const parent = await models.E_status.findOne({
				where: { id: data.req.body.parent }
			});
			await parent.addR_children(data.req.body.child);
			data.res.success(_ => data.res.sendStatus(200));
		}));
	}

	remove_children_diagram() {
		this.router.post('/remove_children_diagram', middlewares.actionAccess("status", "update"), this.asyncRoute(async (data) => {
			const status = await models.E_status.findOne({
				where: { id: data.req.body.id }
			});

			if (!status)
				return data.res.error(_ => data.res.sendStatus(500));

			// Remove only the specified child from the parent
			if(data.req.body.child) {
				await status.removeR_children(data.req.body.child);
			} else {
				// Remove all relation about the given status ID
				// Looking for r_children association through database table
				const throughTable = options.filter(x => x.target == 'e_status' && x.as == 'r_children')[0].through;
				const query = models.sequelize.options.dialect == 'postgres'
					? `DELETE FROM "${throughTable}" WHERE fk_id_parent_status = '?' OR fk_id_child_status = '?';`
					: `DELETE FROM ${throughTable} WHERE fk_id_parent_status = ? || fk_id_child_status = ?;`

				await models.sequelize.query(query, {
					replacements: [status.id, status.id],
					type: models.sequelize.QueryTypes.DELETE
				})
			}

			data.res.success(_ => data.res.sendStatus(200));
		}));
	}

	set_children() {
		this.router.post('/set_children', middlewares.actionAccess("status", "update"), this.asyncRoute(async (data) => {
			const id_status = data.req.body.id_status;
			let statuses = data.req.body.next_status;
			if (!statuses)
				statuses = [];
			else if (typeof statuses === 'string')
				statuses = statuses === '' ? [] : [statuses];

			for (let i = 0; i < statuses.length; i++)
				statuses[i] = parseInt(statuses[i]);

			const status = await models.E_status.findOne({
				where: { id: id_status }
			})
			if (status)
				await status.setR_children(statuses);

			data.res.success(_ => data.res.end());
		}));
	}

	get hooks() {
		return {
			list: {
				// start: async(data) => {},
				// beforeRender: async(data) => {},
			},
			datalist: {
				// start: async(data) => {},
				// beforeDatatableQuery: async(data) => {},
				// afterDatatableQuery: async(data) => {},
				beforeResponse: ({preparedData, req}) => {
					for (let i = 0; i < preparedData.data.length; i++) {
						const entity = preparedData.data[i].f_entity;
						const field = preparedData.data[i].f_field;
						preparedData.data[i].f_entity = helpers.language(req.session.lang_user).__('entity.'+entity+'.label_entity');
						preparedData.data[i].f_field = helpers.language(req.session.lang_user).__('entity.'+entity+'.'+field);
					}
				}
			},
			subdatalist: {
				// start: async (data) => {},
				// beforeDatatableQuery: async (data) => {},
				// afterDatatableQuery: async (data) => {},
				// beforeResponse: async (data) => {},
			},
			show: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create_form: {
				// start: async (data) => {},
				ifFromAssociation: async(data) => {
					const status = await models.E_status.findOne({where: {id: data.associationFlag}});
					data.f_field = status.f_field;
					data.f_entity = status.f_entity;
					data.entityTrad = 'entity.'+data.f_entity+'.label_entity';
					data.fieldTrad = 'entity.'+data.f_entity+'.'+data.f_field;
				},
				beforeRender: (data) => {
					data.entities = helpers.status.entityStatusFieldList();
				}
			},
			create: {
				// start: async (data) => {},
				beforeCreateQuery: ({req, createObject}) => {
					const [entity, field] = req.body.entityStatus.split('.');
					createObject.f_entity = entity;
					createObject.f_field = field;
					// * Auto calculate text color
					createObject.f_text_color = helpers.status.getTextColor(createObject.f_color);
				},
				beforeRedirect: async({req, createObject, createdRow, transaction}) => {
					if (createObject.f_default && createObject.f_default == 'true') {
						await models.E_status.update(
							{f_default: false},
							{
								where: {f_entity: createdRow.f_entity, f_field: createdRow.f_field, id: {[models.$not]: createdRow.id}},
								user: req.user, transaction
							}
						);
					}
				},
			},
			update_form: {
				// start: async (data) => {},
				// afterEntityQuery: async(data) => {},
				beforeRender: (data) => {
					data.f_field = data.e_status.f_field;
					data.f_entity = data.e_status.f_entity;
					data.entityTrad = 'entity.'+data.f_entity+'.label_entity';
					data.fieldTrad = 'entity.'+data.f_entity+'.'+data.f_field;
				}
			},
			update: {
				// start: async (data) => {},
				beforeRedirect: async({req, updateObject, updateRow, transaction}) => {
					if (updateObject.f_default && updateObject.f_default == 'true')
						await models.E_status.update(
							{f_default: false},
							{
								where: {f_entity: updateRow.f_entity, f_field: updateRow.f_field, id: {[models.$not]: updateRow.id}},
								user: req.user, transaction
							}
						);
				}
			},
			loadtab: {
				// start: async (data) => {},
				// beforeValidityCheck: (data) => {},
				// afterValidityCheck: (data) => {},
				beforeDataQuery: async (data) => {
					if (data.alias !== 'r_children')
						return;

					const e_status = await models[this.E_entity].findOne({
						where: {id: data.id},
						include: {
							model: models.E_status,
							as: 'r_children'
						}
					});
					if (!e_status)
						return data.res.success(_ => data.res.status(404).end()) && false;

					const childrenIds = [];
					for (let i = 0; e_status.r_children && i < e_status.r_children.length; i++) {
						const child = e_status.r_children[i];
						child.translate(data.req.session.lang_user);
						child.dataValues.selected = true;
						childrenIds.push(child.id);
					}

					const where = {
						f_field: e_status.f_field,
						f_entity: e_status.f_entity
					};
					if (childrenIds.length)
						where.id = {[models.$notIn]: childrenIds};
					const otherStatuses = await models.E_status.findAll({
						where: where,
						include: [{
							model: models.E_translation,
							as: 'r_translations'
						}]
					});
					for (let i = 0; i < otherStatuses.length; i++)
						otherStatuses[i].translate(data.req.session.lang_user)
					e_status.dataValues.all_children = otherStatuses.concat(e_status.r_children);

					const entityTradKey = 'entity.'+e_status.f_entity+'.label_entity';
					e_status.f_field = 'entity.'+e_status.f_entity+'.'+e_status.f_field;
					e_status.f_entity = entityTradKey;

					this.helpers.status.translate(e_status, attributes, data.req.session.lang_user);

					data.dustData = {e_status};
				},
				// beforeRender: (data) => {},
			},
			set_status: {
				// start: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_remove: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_add: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			destroy: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			list: [
				middlewares.actionAccess(this.entity, "read")
			],
			datalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			subdatalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			show: [
				middlewares.actionAccess(this.entity, "read")
			],
			create_form: [
				middlewares.actionAccess(this.entity, "create")
			],
			create: [
				middlewares.actionAccess(this.entity, "create")
			],
			update_form: [
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.actionAccess(this.entity, "update")
			],
			loadtab: [
				middlewares.actionAccess(this.entity, "read")
			],
			set_status: [
				middlewares.actionAccess(this.entity, "read"),
				middlewares.statusGroupAccess
			],
			search: [
				middlewares.actionAccess(this.entity, "read")
			],
			fieldset_remove: [
				middlewares.actionAccess(this.entity, "delete")
			],
			fieldset_add: [
				middlewares.actionAccess(this.entity, "create")
			],
			destroy: [
				middlewares.actionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = E_status;