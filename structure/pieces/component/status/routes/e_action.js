const Entity = require('@core/abstract_routes/entity');
const block_access = require('@core/helpers/access');

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
				// start: async (data) => {},
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
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			update_form: [
				block_access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				block_access.actionAccessMiddleware(this.entity, "update")
			],
			loadtab: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				block_access.actionAccessMiddleware(this.entity, "read"),
				block_access.statusGroupAccess
			],
			search: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				block_access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				block_access.actionAccessMiddleware(this.entity, "delete")
			]
		}
	}
}

module.exports = Action;