const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_page');
const attributes = require('@app/models/attributes/e_page');

const models = require('@app/models');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

class Page extends Entity {
	constructor() {
		const additionalRoutes = ['reorder'];
		super('e_page', attributes, options, helpers, additionalRoutes);
	}

	reorder() {
		this.router.get('/reorder', middlewares.actionAccess('page', 'create'), this.asyncRoute(async ({req, res}) => {
			const {id, type} = req.query;
			const targeted = await models.E_page.findOne({where: {id}});
			if (!targeted)
				return res.end();

			let nextPage;
			if (type == 'increment') {
				[nextPage] = await models.E_page.findAll({
					where: {
						fk_id_program: targeted.fk_id_program,
						f_order: {[models.Sequelize.Op.gt]: targeted.f_order}
					},
					order: [['f_order', 'ASC']],
					limit: 1
				});
			}
			else if (type == 'decrement') {
				[nextPage] = await models.E_page.findAll({
					where: {
						fk_id_program: targeted.fk_id_program,
						f_order: {[models.Sequelize.Op.lt]: targeted.f_order}
					},
					order: [['f_order', 'DESC']],
					limit: 1
				});
			}
			// Target is already last or first order
			if (!nextPage)
				return res.success(_ => res.end());

			const targetNewOrder = nextPage.f_order;
			const otherNewOrder = targeted.f_order;
			await Promise.all([
				nextPage.update({f_order: otherNewOrder}, {user: req.user}),
				targeted.update({f_order: targetNewOrder}, {user: req.user})
			]);

			res.success(_ => res.end());
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
				// ifFromAssociation: async(data) => {},
				beforeRender: async(data) => {
					const maxOrder = await models.E_page.max('f_order', {where: {fk_id_program: data.associationFlag || null}})
					data.maxOrder = (maxOrder || 0) + 1;
				}
			},
			create: {
				// start: async (data) => {},
				// beforeCreateQuery: async(data) => {},
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// start: async (data) => {},

				// afterEntityQuery: async(data) => {},
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

module.exports = Page;