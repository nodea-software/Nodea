const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_media_mail');
const attributes = require('@app/models/attributes/e_media_mail');
const helpers = require('@core/helpers');
const block_access = helpers.access;
const status = helpers.status;

const models = require('@app/models')

class MediaMail extends Entity {
	constructor() {
		const additionalRoutes = ['entity_tree'];
		super('e_media_mail', attributes, options, helpers, additionalRoutes);
	}

	entity_tree() {
		this.router.get('/entityTree', block_access.isLoggedIn, this.asyncRoute(async (req, res) => {
			res.json(status.entityFieldTree('e_media_mail'));
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
				// beforeRender: async(data) => {}
			},
			create: {
				// start: async (data) => {},
				// beforeCreateQuery: async(data) => {},
				beforeRedirect: async(data) => {
					const {req, createdRow, transaction} = data;
					const media = await models.E_media.create({
						f_type: 'mail',
						f_name: req.body.f_name,
						f_target_entity: req.body.f_target_entity,
						fk_id_media_mail: createdRow.id
					}, {user: req.user, transaction});
					data.redirect = '/media/show?id='+media.id;
				}
			},
			update_form: {
				// start: async (data) => {},

				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				start: async (data) => {
					data.idEntity = data.req.body.id_media_mail;
				},
				beforeRedirect: async(data) => {
					const {req, res, updateRow, transaction} = data;
					const mediaMail = updateRow;
					const e_media = await models.E_media.findOne({where: {fk_id_media_mail: mediaMail.id}});
					if (!e_media)
						return res.success(_ => res.redirect('/module/home')) && false;
					const newTargetEntity = req.body.f_target_entity;
					if (newTargetEntity && e_media.f_target_entity !== newTargetEntity)
						await e_media.update({f_target_entity: newTargetEntity}, {user: req.user, transaction});
					data.redirect = '/media/show?id='+e_media.id;
				}
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
				// beforeAllowedCheck: async (data) => {},
				// beforeActionsExecution: async (data) => {},
				// beforeSetStatus: async (data) => {},
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
				beforeDestroy: async(data) => {
					const deleteId = data.deleteObject.id;
					try {
						await models.E_media.destroy({
							where: {fk_id_media_mail: deleteId},
							transaction: data.transaction
						});
					} catch(err) {
						console.error("MediaMail: Couldn't delete associated Media - id="+deleteId);
						console.error(err);
					}
				},
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

module.exports = MediaMail;