const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_media_sms');
const attributes = require('@app/models/attributes/e_media_sms');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

const models = require('@app/models');

class MediaSms extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_media_sms', attributes, options, helpers, additionalRoutes);
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
						f_type: 'sms',
						f_name: req.body.f_name,
						f_target_entity: req.body.f_target_entity,
						fk_id_media_sms: createdRow.id
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
				start: (data) => {
					data.idEntity = data.req.body.id_media_sms;
				},
				beforeRedirect: async(data) => {
					const {req, res, updateRow, transaction} = data;
					const mediaSms = updateRow;
					const e_media = await models.E_media.findOne({where: {fk_id_media_sms: mediaSms.id}});
					if (!e_media)
						return res.error(_ => res.redirect('/module/home')) && false;
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
							where: {fk_id_media_sms: deleteId},
							transaction: data.transaction
						});
					} catch(err) {
						console.error("MediaSms: Couldn't delete associated Media - id="+deleteId);
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

module.exports = MediaSms;