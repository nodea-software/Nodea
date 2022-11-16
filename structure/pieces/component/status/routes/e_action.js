const Entity = require('@core/abstract_routes/entity');
const middlewares = require('@core/helpers/middlewares');

const options = require('@app/models/options/e_action');
const attributes = require('@app/models/attributes/e_action');
const helpers = require('@core/helpers');
const models = require('@app/models')

class Action extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_action', attributes, options, helpers, additionalRoutes);
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
				// beforeResponse: async(data) => {}
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
				start: (data) => {
					// This is mandatory to be in assoction tab from a status to create an action
					if (data.req.query.associationSource != 'e_status') {
						data.req.session.toastr = [{
							message: 'Please create an action from a status page.',
							level: 'error'
						}];
						data.res.error(_ => data.res.redirect('/status/list'));
						return false;
					}
				},
				ifFromAssociation: async(data) => {
					const idStatus = data.req.query.associationFlag;
					const status = await models.E_status.findOne({
						where: {id: idStatus},
						include: {
							model: models.E_action,
							as: 'r_actions',
							order: [["f_order", "DESC"]],
							limit: 1
						}
					})
					const actionMax = status.r_actions;
					data.max = actionMax && actionMax[0] && actionMax[0].f_order ? actionMax[0].f_order+1 : 1;
					data.status_target = status.f_entity;
				},
				// beforeRender: async(data) => {}
			},
			create: {
				// start: async (data) => {},
				// beforeCreateQuery: async(data) => {},
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// start: async (data) => {},
				// afterEntityQuery: async(data) => {},
				ifFromAssociation: async(data) => {
					if (data.req.query.associationSource != 'e_status')
						return;
					const idStatus = data.req.query.associationFlag;
					const status = await models.E_status.findOne({
						where: {id: idStatus},
						include: {
							model: models.E_action,
							as: 'r_actions',
							order: [["f_order", "DESC"]],
							limit: 1
						}
					})
					const actionMax = status.r_actions;
					data.max = actionMax && actionMax[0] && actionMax[0].f_order ? actionMax[0].f_order+1 : 1;
					data.status_target = status.f_entity;
				},
				// beforeRender: async(data) => {}
			},
			update: {
				// start: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			loadtab: {
				// start: async (data) => {},
				// beforeValidityCheck: (data) => {},
				// afterValidityCheck: (data) => {},
				// beforeDataQuery: (data) => {},
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

module.exports = Action;