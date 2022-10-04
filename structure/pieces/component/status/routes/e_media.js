const Entity = require('@core/abstract_routes/entity');
const icon_list = require('@config/icon_list');

const options = require('@app/models/options/e_media');
const attributes = require('@app/models/attributes/e_media');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;
const language = helpers.language;
const status = helpers.status;

const models = require('@app/models');

const fs = require('fs-extra');
const { from } = require('@config/mail');

const TARGET_ENTITIES = [];
fs.readdirSync(__appPath + '/models/attributes/').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json' && file.substring(0, 2) == 'e_')
	.forEach(file => {
		TARGET_ENTITIES.push({
			codename: file.substring(0, file.length-5),
			tradKey: 'entity.'+file.substring(0, file.length-5)+'.label_entity'
		});
	});

function sortTargetEntities(lang_user) {
	// Copy global object to add traducted property and sort it
	const targetEntitiesCpy = [];
	for (const target of TARGET_ENTITIES) {
		targetEntitiesCpy.push({
			codename: target.codename,
			trad: language(lang_user).__(target.tradKey)
		});
	}
	targetEntitiesCpy.sort((a, b) => {
		if (a.trad.toLowerCase() > b.trad.toLowerCase()) return 1;
		if (a.trad.toLowerCase() < b.trad.toLowerCase()) return -1;
		return 0;
	});
	return targetEntitiesCpy;
}

class Media extends Entity {
	constructor() {
		const additionalRoutes = ['entity_tree', 'entity_full_tree', 'user_tree'];
		super('e_media', attributes, options, helpers, additionalRoutes);
	}

	entity_tree() {
		this.router.get('/entity_tree/:entity', this.middlewares.entity_tree, this.asyncRoute((data) => {
			const entityTree = status.entityFieldTree(data.req.params.entity);
			const entityTreeSelect = status.entityFieldForSelect(entityTree, data.req.session.lang_user);
			data.res.success(_ => data.res.json(entityTreeSelect).end());
		}));
	}

	entity_full_tree() {
		this.router.get('/entity_full_tree/:entity', this.middlewares.entity_full_tree, this.asyncRoute((data) => {
			const entityTree = status.fullEntityFieldTree(data.req.params.entity);
			const entityTreeSelect = status.entityFieldForSelect(entityTree, data.req.session.lang_user);
			data.res.success(_ => data.res.json(entityTreeSelect).end());
		}));
	}

	user_tree() {
		this.router.get('/user_tree/:entity', this.middlewares.user_tree, this.asyncRoute((data) => {
			const entityTree = status.fullEntityFieldTree(data.req.params.entity);
			const userTree = status.getUserTargetList(entityTree, data.req.session.lang_user);
			data.res.success(_ => data.res.json(userTree).end());
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
				beforeRender: async(data) => {
					const e_media = await models.E_media.findOne({where: {id: data.idEntity}, include: [{all: true}]});
					if (!e_media)
						return data.res.render('common/404', {
							message: 'Media not found'
						}) && false;

					data.e_media = e_media;
				}
			},
			create_form: {
				// start: async (data) => {},
				// ifFromAssociation: async(data) => {},
				beforeRender: (data) => {
					data.target_entities = sortTargetEntities(data.req.session.lang_user);
					data.icon_list = icon_list;
					data.from_media_mail = from;
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
				beforeRender: async(data) => {
					const e_media = await models.E_media.findOne({where: {id: data.idEntity}, include: [{all: true}]});
					if (!e_media)
						return data.res.render('common/404', {
							message: 'Media not found'
						}) && false;

					data.e_media = e_media;
					data.target_entities = sortTargetEntities(data.req.session.lang_user);
					data.icon_list = icon_list;
				}
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
				// beforeAllowedCheck: async (data) => {},
				// beforeActionsExecution: async (data) => {},
				// beforeSetStatus: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				beforeQuery: (data) => {
					if(data.req.body.attrData && data.req.body.attrData.statustarget)
						data.query.where = {
							f_target_entity: data.req.body.attrData.statustarget
						}
				}
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
			entity_tree: [
				middlewares.actionAccess("media", "read")
			],
			entity_full_tree: [
				middlewares.actionAccess("media", "read")
			],
			user_tree: [
				middlewares.actionAccess("media", "read")
			],
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
				(req, res) => { // Disabled route
					console.warn("Media create route should never be called. Form must point to its media type route");
					res.redirect('/module/home');
				}
			],
			update_form: [
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				(req, res) => { // Disabled route
					console.warn("Media update route should never be called. Form must point to its media type route");
					res.redirect('/module/home');
				}
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

module.exports = Media;

