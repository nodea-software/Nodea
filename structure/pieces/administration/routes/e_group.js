const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_group');
const attributes = require('@app/models/attributes/e_group');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

const fs = require('fs-extra');

class E_group extends Entity {
	constructor() {
		const additionalRoutes = [];
		super('e_group', attributes, options, helpers, additionalRoutes);
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
				start: (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/group/list'));
						return false;
					}
				},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				start: (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/group/list'));
						return false;
					}
				},
				beforeUpdate: (data) => {
					data.labelChanged = false;
					if(data.updateObject.f_label != data.updateRow.f_label)
						data.labelChanged = data.updateRow.f_label;
				},
				beforeRedirect: (data) => {
					if(!data.labelChanged)
						return;

					// eslint-disable-next-line no-undef
					const access = JSON.parse(fs.readFileSync(__configPath + '/access.json'));

					for(const appModule in access) {
						if(access[appModule].groups.includes(data.labelChanged))
							access[appModule].groups = access[appModule].groups.map(x => {
								if(x == data.labelChanged)
									return data.updateRow.f_label
								return x;
							});

						for (const entity of access[appModule].entities) {
							entity.groups = entity.groups.map(x => {
								if(x == data.labelChanged)
									return data.updateRow.f_label
								return x;
							});
						}
					}

					// eslint-disable-next-line no-undef
					fs.writeFileSync(global.__configPath + '/access.json', JSON.stringify(access, null, '\t'), "utf8");
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
				start: (data) => {
					if(data.idEntity == 1) {
						if(data.req.query.ajax)
							data.res.success(_ => data.res.status(403).send(helpers.language(data.req.session.lang_user).__('administration.user.cannot_delete_admin')));
						else {
							data.req.session.toastr = [{
								message: 'administration.user.cannot_delete_admin',
								level: 'error'
							}]
							data.res.redirect('/group/list')
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

module.exports = E_group;