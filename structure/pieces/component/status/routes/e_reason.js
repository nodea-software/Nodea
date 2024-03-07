const Entity = require('@core/abstract_routes/entity');
const middlewares = require('@core/helpers/middlewares');

const options = require('@app/models/options/e_reason');
const attributes = require('@app/models/attributes/e_reason');
const helpers = require('@core/helpers');
const models = require('@app/models')

class Reason extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_reason', attributes, options, helpers, additionalRoutes);
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
					// This is mandatory to be in assoction tab from a status to create an reason
					if (data.req.query.associationSource != 'e_status') {
						data.req.session.toastr = [{
							message: 'Please create an reason from a status page.',
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
							model: models.E_reason,
							as: 'r_reasons',
							order: [["f_order", "DESC"]],
							limit: 1
						}
					})
					const reasonMax = status.r_reasons;
					data.max = reasonMax && reasonMax[0] && reasonMax[0].f_order ? reasonMax[0].f_order+1 : 1;
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
							model: models.E_reason,
							as: 'r_reasons',
							order: [["f_order", "DESC"]],
							limit: 1
						}
					})
					const reasonMax = status.r_reasons;
					data.max = reasonMax && reasonMax[0] && reasonMax[0].f_order ? reasonMax[0].f_order+1 : 1;
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
				beforeQuery: async (data) => {
					data.query.where.f_enabled = true;
					// En cours - pour le moment l'id du statut n'est pas mis sur la modale
					if (data.req.body.attrData.statut) {
						data.query.where.fk_id_status_reasons = data.req.body.attrData.statut;
						data.query.order = [["f_order", "ASC"]];
					}
				},
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
				middlewares.actionAccess(this.entity, "create"),
				middlewares.fileInfo(this.fileFields)
			],
			update_form: [
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.actionAccess(this.entity, "update"),
				middlewares.fileInfo(this.fileFields)
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

module.exports = Reason;