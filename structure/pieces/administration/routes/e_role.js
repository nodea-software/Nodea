const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_role');
const attributes = require('@app/models/attributes/e_role');

const helpers = require('@core/helpers');
const access = helpers.access;

const upload = require('multer');
const multer = upload();

const fs = require('fs-extra');

class E_role extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_role', attributes, options, helpers, additionalRoutes);
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
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				start: async (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/role/list'));
						return false;
					}
				},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				start: async (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/role/list'));
						return false;
					}
				},
				beforeUpdate: async(data) => {
					data.labelChanged = false;
					if(data.updateObject.f_label != data.updateRow.f_label)
						data.labelChanged = data.updateRow.f_label;
				},
				beforeRedirect: async(data) => {
					if(!data.labelChanged)
						return;

					const access = JSON.parse(fs.readFileSync(__configPath + '/access.json'));
					const actions = ['read', 'create', 'update', 'delete'];

					for(const appModule in access) {
						for (const entity of access[appModule].entities) {
							for (const action of actions) {
								entity.actions[action] = entity.actions[action].map(x => {
									if(x == data.labelChanged)
										return data.updateRow.f_label
									return x;
								});
							}
						}
					}

					fs.writeFileSync(__configPath + '/access.json', JSON.stringify(access, null, 4), "utf8");
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
				// beforeAllowedCheck: async (data) => {},
				// beforeActionsExecution: async (data) => {},
				// beforeSetStatus: async (data) => {},
				// beforeRedirect: async (data) => {}
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
				start: async (data) => {
					if(data.idEntity == 1) {
						if(data.req.query.ajax) {
							data.res.success(_ => data.res.status(403).send(helpers.language(data.req.session.lang_user).__('administration.user.cannot_delete_admin')));
						}
						else {
							data.req.session.toastr = [{
								message: 'administration.user.cannot_delete_admin',
								level: 'error'
							}]
							data.res.redirect('/role/list')
						}
						return false;
					}
				},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			list: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				access.actionAccessMiddleware(this.entity, "create"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.newmipsType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			update_form: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				access.actionAccessMiddleware(this.entity, "update"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.newmipsType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			loadtab: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				access.actionAccessMiddleware(this.entity, "read"),
				access.statusGroupAccess
			],
			search: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				access.actionAccessMiddleware(this.entity, "delete")
			]
		}
	}
}

module.exports = E_role;