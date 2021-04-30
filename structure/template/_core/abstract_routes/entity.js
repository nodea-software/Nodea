const globalConfig = require('@config/global');
const Route = require('@core/abstract_routes/route');
const enums_radios = require('@core/utils/enum_radio');

// Select2 pagination size
const SELECT_PAGE_SIZE = 10;

// Models
const models = require('@app/models/');

class CoreEntity extends Route {

	/**
	 * Represents an entity.
	 * @constructor
	 * @param {string} e_entity - The name of the entity.
	 * @param {object} attributes - The models attributes of the entity.
	 * @param {array} options - The models options of the entity.
	 * @param {array} [additionalRoutes] - The models attributes of the entity.
	 */
	constructor(e_entity, attributes, options, helpers, additionalRoutes = []) {
		const registeredRoutes = [
			'list',
			'datalist',
			'subdatalist',
			'show',
			'create_form',
			'create',
			'update_form',
			'update',
			'loadtab',
			'set_status',
			'search',
			'fieldset_remove',
			'fieldset_add',
			'destroy',
			...additionalRoutes
		];
		super(registeredRoutes);

		if (!e_entity)
			throw new Error("No entity name specified");

		this.entity = e_entity.substring(2);
		this.e_entity = e_entity;
		this.E_entity = e_entity.capitalizeFirstLetter();

		this.attributes = attributes;
		this.options = options;
		this.helpers = helpers;

		this.defaultMiddlewares.push(
			helpers.access.isLoggedIn,
			helpers.access.entityAccessMiddleware(this.entity)
		);
	}

	//
	// Routes
	//

	/**
	 * GET- Get the entity list view
	 * @namespace
	 */
	list() {
		this.router.get('/list', ...this.middlewares.list, this.asyncRoute(async(data) => {
			data.tableUrl = `/${this.entity}/datalist`;

			if (await this.getHook('list', 'start', data) === false)
				return;

			/**
		     * Just before rendering de list.dust file
		     *
		     * @event Entity#list#beforeRender
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {string} data.tableUrl - Url for the datalist
		     */
			if (await this.getHook('list', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(this.e_entity + '/list', data));
		}));
	}

	/**
	 * POST - Ajax route use by the datalist
	 * @namespace
	 */
	datalist() {
		this.router.post('/datalist', ...this.middlewares.datalist, this.asyncRoute(async(data) => {
			data.speInclude = null;
			data.speWhere = null;

			if (await this.getHook('datalist', 'start', data) === false)
				return;

			/**
		     * Before retrieving data from the database for the datalist
		     *
		     * @event Entity#datalist#beforeDatatableQuery
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {string} data.speInclude - Use to inject association inclusion in datalist query
		     * @param {string} data.speWhere - Use to inject WHERE condition
		     */
			if (await this.getHook('datalist', 'beforeDatatableQuery', data) === false)
				return;

			data.rawData = await this.helpers.datatable(this.E_entity, data.req.body, data.speInclude, data.speWhere);

			/**
		     * Before sending the prepared data to the datalist
		     *
		     * @event Entity#datalist#afterDatatableQuery
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {string} data.rawData - Data just retrieve from database
		     */
			if (await this.getHook('datalist', 'afterDatatableQuery', data) === false)
				return;

			data.preparedData = await this.helpers.entity.prepareDatalistResult(this.e_entity, this.attributes, this.options, data.rawData, data.req.session.lang_user)

			/**
		     * Just before sending the prepared data to the datalist
		     *
		     * @event Entity#datalist#beforeResponse
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {string} data.preparedData - Data that are prepared to be display in the datalist
		     */
			if (await this.getHook('datalist', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.send(data.preparedData).end());
		}));
	}

	/**
	 * POST - Ajax route use by the datalist in tab (like has many tab)
	 * @namespace
	 */
	subdatalist() {
		this.router.post('/subdatalist', ...this.middlewares.subdatalist, this.asyncRoute(async(data) => {
			data.speWhere = [];
			data.speInclude = [];

			if (await this.getHook('datalist', 'start', data) === false)
				return;

			if (await this.getHook('subdatalist', 'beforeDatatableQuery', data) === false)
				return;

			const rawData = await this.helpers.datatable(this.E_entity, {...data.req.body, ...data.req.query}, data.speInclude, data.speWhere, true);

			if (await this.getHook('subdatalist', 'afterDatatableQuery', data) === false)
				return;

			const preparedData = await this.helpers.entity.prepareDatalistResult(data.req.query.subentityModel, this.attributes, this.options, rawData, data.req.session.lang_user);

			if (await this.getHook('subdatalist', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.send(preparedData).end());
		}));
	}

	/**
	 * GET - Route that display row information of an entity
	 * @namespace
	 */
	show() {
		this.router.get('/show', ...this.middlewares.show, this.asyncRoute(async(data) => {
			data.idEntity = data.req.query.id;
			data.tab = data.req.query.tab;
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = this.e_entity + '/show';

			if (await this.getHook('show', 'start', data) === false)
				return;

			/* If we arrive from an associated tab, hide the create and the list button */
			if (typeof data.req.query.hideButton !== 'undefined')
				data.hideButton = data.req.query.hideButton;

			if (await this.getHook('show', 'beforeEntityQuery', data) === false)
				return;

			data[this.e_entity] = await this.helpers.entity.optimizedFindOne(this.E_entity, data.idEntity, this.options);

			/**
		     * After the entity request in database
		     *
		     * @event Entity#show#afterEntityQuery
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.e_entity - Entity row data
		     */
			if (await this.getHook('show', 'afterEntityQuery', data) === false)
				return;

			if (!data[this.e_entity])
				return data.res.error(_ => data.res.render('common/404', {
					message: 'Entity row not found'
				}));

			await this.helpers.entity.getPicturesBuffers(data[this.e_entity], this.e_entity);
			this.helpers.status.translate(data[this.e_entity], this.attributes, data.req.session.lang_user);
			data.componentAddressConfig = this.helpers.address.getMapsConfigIfComponentAddressExists(this.e_entity);
			enums_radios.translateUsingField(data[this.e_entity], this.options, data.enum_radio);

			// Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
			await this.helpers.entity.getLoadOnStartData(data, this.options);

			if (data.req.query.ajax) {
				data.renderFile = this.helpers.entity.getOverlayFile(data.req.query.associationSource, data.req.query.associationAlias, 'show');
				data.subentity = this.entity;
				data.e_subentity = this.e_entity;
				data.tabType = 'show';
				data.entityData = data[this.e_entity].get({plain: true});
			}

			/**
		     * Before rendering show.dust
		     *
		     * @event Entity#show#beforeRender
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.e_entity - e_entity to be replace with your current entity name, contain the row to be shown
		     * @param {object} data.componentAddressConfig - The configuration for potential component address
		     */
			if (await this.getHook('show', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * GET - Display the creation formulaire of an entity
	 * @namespace
	 */
	create_form() {
		this.router.get('/create_form', ...this.middlewares.create_form, this.asyncRoute(async(data) => {
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = `${this.e_entity}/create`;

			if (await this.getHook('create_form', 'start', data) === false)
				return;

			if (typeof data.req.query.associationFlag !== 'undefined') {
				data.associationFlag = data.req.query.associationFlag;
				data.associationSource = data.req.query.associationSource;
				data.associationUrl = data.req.query.associationUrl;
				data.associationForeignKey = data.req.query.associationForeignKey;
				data.associationAlias = data.req.query.associationAlias;
				if (data.req.query.ajax) {
					data.renderFile = this.helpers.entity.getOverlayFile(data.associationSource, data.associationAlias, 'create_form');
					data.subentity = this.entity;
					data.tabType = 'create_form';
					data.action = `/${this.entity}/create`;
					data.method = 'post';
					data.fieldsFile = `${this.e_entity}/create_fields`;
				}

				/**
			     * In case the creation form was called from an entity tab, it mean that it's an association creation
			     *
			     * @event Entity#create_form#ifFromAssociation
			     * @param {object} data
			     * @param {object} data.req - Request
			     * @param {object} data.res - Response
			     * @param {object} data.enum_radio - Contain key and translation for enums and radios
			     * @param {integer} data.associationFlag - ID of the entity that ask for a creation formulaire of the current entity
			     * @param {string} data.associationSource - Entity name that ask for a creation formulaire of the current entity
			     * @param {string} data.associationUrl - The url string of the entity source
			     * @param {integer} data.associationForeignKey - The concerned foreign key between the two entities
			     * @param {string} data.associationAlias - Alias that represent the relation between the two entities
			     */
				if (await this.getHook('create_form', 'ifFromAssociation', data) === false)
					return;
			}

			// Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
			await this.helpers.entity.getLoadOnStartData(data, this.options);

			/**
		     * Before rendering the creation form
		     *
		     * @event Entity#create_form#beforeRender
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.enum_radio - Contain key and translation for enums and radios
		     * @param {integer} [data.associationFlag] - ID of the entity that ask for a creation formulaire of the current entity
		     * @param {string} [data.associationSource] - Entity name that ask for a creation formulaire of the current entity
		     * @param {string} [data.associationUrl] - The url string of the entity source
		     * @param {integer} [data.associationForeignKey] - The concerned foreign key between the two entities
		     * @param {string} [data.associationAlias] - Alias that represent the relation between the two entities
		     */
			if (await this.getHook('create_form', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * POST - Creation of an entity row
	 * @namespace
	 */
	create() {
		this.router.post('/create', ...this.middlewares.create, this.asyncRoute(async(data) => {
			data.transaction = await models.sequelize.transaction();

			if (await this.getHook('create', 'start', data) === false)
				return;

			const [createObject, createAssociations, createFiles] = this.helpers.model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body, data.req.files);
			data.createObject = createObject;
			data.createAssociations = createAssociations;
			data.files = data.req.files = createFiles;

			for (const file of data.files)
				if (file.buffer)
					file.func = async file => {
						await this.helpers.file.write(file.finalPath, file.buffer);
						if (file.isPicture)
							await this.helpers.file.writeThumbnail('thumbnail/'+file.finalPath, file.buffer);
					}

			/**
		     * Before creating the row in the database
		     *
		     * @event Entity#create#beforeCreateQuery
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.createObject - The object that will be used to create the row in database
		     */
			if (await this.getHook('create', 'beforeCreateQuery', data) === false)
				return;

			data.createdRow = await models[this.E_entity].create(data.createObject, {
				user: data.req.user,
				transaction: data.transaction
			});

			data.redirect = '/' + this.entity + '/show?id=' + data.createdRow.id;
			data.req.session.toastr = [{
				message: 'message.create.success',
				level: "success"
			}];

			// If created from an association, register created row on source entity
			if (typeof data.req.query.associationFlag !== 'undefined' && data.req.query.associationFlag !== "") {
				data.redirect = '/' + data.req.query.associationUrl + '/show?id=' + data.req.query.associationFlag + '#' + data.req.query.associationAlias;

				const association = await models[data.req.query.associationSource.capitalizeFirstLetter()].findOne({
					where: { id: data.req.query.associationFlag }
				});

				if (!association)
					throw new Error("Association not found.");

				const modelName = data.req.query.associationAlias.charAt(0).toUpperCase() + data.req.query.associationAlias.slice(1).toLowerCase();
				if (typeof association['add' + modelName] !== 'undefined') {
					await association['add' + modelName](data.createdRow.id, {transaction: data.transaction});

					if (globalConfig.env == "tablet") {
						// Write add association to synchro journal
						this.helpers.entity.synchro.writeJournal({
							verb: "associate",
							id: data.req.query.associationFlag,
							target: this.e_entity,
							entityName: data.req.query.associationSource,
							func: 'add' + modelName,
							ids: data.createdRow.id
						});
					}

				} else {
					const obj = {};
					obj[data.req.query.associationForeignKey] = data.createdRow.id;
					await association.update(obj, {
						user: data.req.user,
						transaction: data.transaction
					});
				}
			}

			// Add associations
			await Promise.all(data.createAssociations.map(asso => data.createdRow[asso.func](asso.value, {transaction: data.transaction})));

			await this.helpers.address.setAddressIfComponentExists(data.createdRow, this.options, data.req.body, data.transaction);
			const statusToastrs = await this.helpers.status.setInitialStatus(data.createdRow, this.E_entity, this.attributes, {transaction: data.transaction, user: data.req.user}) || [];

			if (statusToastrs.length)
				data.req.session.toastr = [...data.req.session.toastr, ...statusToastrs];

			/**
		     * Before the redirection
		     *
		     * @event Entity#create#beforeRedirect
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.createObject - The object used to create the row in database
		     * @param {object} data.createdRow - The created row in database
		     */
			if (await this.getHook('create', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * GET - Display the update formulaire of an entity
	 * @namespace
	 */
	update_form() {
		this.router.get('/update_form', ...this.middlewares.update_form, this.asyncRoute(async(data) => {

			data.idEntity = data.req.query.id;
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = `${this.e_entity}/update`;

			if (await this.getHook('update_form', 'start', data) === false)
				return;

			data[this.e_entity] = await this.helpers.entity.optimizedFindOne(this.E_entity, data.idEntity, this.options);
			if (!data[this.e_entity])
				return data.res.error(_ => {
					data.req.session.toastr = [{level: 'error', message: 'error.404.title'}];
					data.res.render('common/404', {
						message: 'Entity row not found'
					});
				});

			if (await this.getHook('update_form', 'afterEntityQuery', data) === false)
				return;

			if (typeof data.req.query.associationFlag !== 'undefined') {
				data.associationFlag = data.req.query.associationFlag;
				data.associationSource = data.req.query.associationSource;
				data.associationForeignKey = data.req.query.associationForeignKey;
				data.associationAlias = data.req.query.associationAlias;
				data.associationUrl = data.req.query.associationUrl;
				if (data.req.query.ajax) {
					data.renderFile = this.helpers.entity.getOverlayFile(data.associationSource, data.associationAlias, 'update_form');
					data.tabType = 'update_form';
					data.subentity = this.entity;
					data.e_subentity = this.e_entity;
					data.action = `/${this.entity}/update`;
					data.method = 'post';
					data.entityData = data[this.e_entity].get({plain: true});
				}
				if (await this.getHook('update_form', 'ifFromAssociation', data) === false)
					return;
			}

			data[this.e_entity].dataValues.enum_radio = data.enum_radio;
			enums_radios.translateUsingField(data[this.e_entity], this.options, data.enum_radio);

			// Update some data before show, e.g get picture binary
			// TODO: No picture preview in update_form at the moment
			// await this.helpers.entity.getPicturesBuffers(data[this.e_entity], this.e_entity, false);

			// Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
			await this.helpers.entity.getLoadOnStartData(data.req.query.ajax ? data[this.e_entity].dataValues : data, this.options);

			/**
		     * Before rendering the update form
		     *
		     * @event Entity#update_form#beforeRender
		     * @param {object} data
		     * @param {object} data.req - Request
		     * @param {object} data.res - Response
		     * @param {object} data.e_entity - Contain key and translation for enums and radios
		     */
			if (await this.getHook('update_form', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * POST - Update of an entity row
	 * @namespace
	 */
	update() {
		this.router.post('/update', ...this.middlewares.update, this.asyncRoute(async(data) => {
			data.transaction = await models.sequelize.transaction();
			data.idEntity = parseInt(data.req.body.id);

			if (await this.getHook('update', 'start', data) === false)
				return;

			const [updateObject, updateAssociations, updateFiles] = this.helpers.model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body, data.req.files);
			data.updateObject = updateObject;
			data.updateAssociations = updateAssociations;
			data.files = data.req.files = updateFiles;

			data.updateRow = await models[this.E_entity].findOne({
				where: { id: data.idEntity },
				transaction: data.transaction
			});

			if (!data.updateRow)
				return data.res.error(_ => data.res.render('common/404', {
					message: 'Entity row not found'
				}));

			for (const file of data.files || []) {
				// Store old path of modified file before entity update
				if (file.isModified && data.updateRow[file.attribute])
					file.previousPath = data.updateRow[file.attribute];
				file.func = async file => {
					// New file
					if (file.buffer) {
						await this.helpers.file.write(file.finalPath, file.buffer);
						if (file.isPicture)
							await this.helpers.file.writeThumbnail('thumbnail/'+file.finalPath, file.buffer);
					}
					// Replaced or removed file
					if (file.previousPath) {
						await this.helpers.file.remove(file.previousPath);
						if (file.isPicture)
							await this.helpers.file.remove('thumbnail/'+file.previousPath);
					}
				}
			}

			this.helpers.address.updateAddressIfComponentExists(data.updateRow, this.options, data.req.body, data.transaction);

			data.updateObject.version = data.updateRow.version;
			if(typeof data.updateRow.version === 'undefined' || !data.updateRow.version)
				data.updateObject.version = 0;
			data.updateObject.version++;

			if (await this.getHook('update', 'beforeUpdate', data) === false)
				return;

			await data.updateRow.update(data.updateObject, {user: data.req.user, transaction: data.transaction});

			// Add associations
			await Promise.all(data.updateAssociations.map(asso => data.updateRow[asso.func](asso.value, {transaction: data.transaction})));

			data.redirect = '/' + this.entity + '/show?id=' + data.idEntity;
			if (typeof data.req.query.associationFlag !== 'undefined')
				data.redirect = '/' + data.req.query.associationUrl + '/show?id=' + data.req.query.associationFlag + '#' + data.req.query.associationAlias;

			data.req.session.toastr = [{
				message: 'message.update.success',
				level: "success"
			}];

			if (await this.getHook('update', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * GET - Trigger when clicking on show tab, load ajax for tabs
	 * @namespace
	 */
	loadtab() {
		this.router.get('/loadtab/:id/:alias', ...this.middlewares.loadtab, this.asyncRoute(async(data) => {
			data.alias = data.req.params.alias;
			data.id = data.req.params.id;

			if (await this.getHook('loadtab', 'start', data) === false)
				return;

			if (await this.getHook('loadtab', 'beforeValidityCheck', data) === false)
				return;

			// Find tab option
			for (let i = 0; i < this.options.length; i++)
				if (this.options[i].as == data.alias) {
					data.option = this.options[i];
					break;
				}
			if (!data.option)
				return data.res.error(_ => data.res.status(404).end());
			data.renderFile = `${__appPath}/views/${this.e_entity}/${data.option.as}/tab`;

			// Check access rights to subentity
			if (!this.helpers.access.entityAccess(data.req.user.r_group, data.option.target.substring(2)))
				return data.res.error(_ => data.res.status(403).end());

			if (await this.getHook('loadtab', 'afterValidityCheck', data) === false)
				return;

			if (typeof data.req.query.associationFlag !== 'undefined') {
				const association = {
					associationFlag: data.req.query.associationFlag,
					associationSource: data.req.query.associationSource,
					associationForeignKey: data.req.query.associationForeignKey,
					associationAlias: data.req.query.associationAlias,
					associationUrl: data.req.query.associationUrl
				}
				data.associationHref = Object.entries(association).map(asso => `${asso[0]}=${asso[1]}`).join('&');
			}

			data.E_entity = this.E_entity;
			data.e_entity = this.e_entity;
			data.entity = this.entity;

			if (await this.getHook('loadtab', 'beforeDataQuery', data) === false)
				return;

			if (!data.dustData)
				data.dustData = await this.helpers.entity.getTabData(data);

			if (await this.getHook('loadtab', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data.dustData));
		}));
	}

	/**
	 * GET - Changing the status of an entity
	 * @namespace
	 */
	set_status() {
		this.router.get('/set_status/:entity_id/:status/:id_new_status', ...this.middlewares.set_status, this.asyncRoute(async(data) => {
			data.redirect = data.req.headers.referer;
			data.idEntity = data.req.params.entity_id;
			data.statusName = data.req.params.status.substring(2); // TODO: no need for s_ prefix from client
			data.idNewStatus = data.req.params.id_new_status;
			data.isAllowed = false;

			if (await this.getHook('set_status', 'start', data) === false)
				return;

			data.entity = await models[this.E_entity].findOne({
				where: {id: data.idEntity},
				include: {
					model: models.E_status,
					as: 'r_'+data.statusName
				}
			});
			if (!data.entity) {
				data.req.session.toastr = [{level: 'error', message: 'error.404.title'}];
				return data.res.error(_ => data.res.redirect(data.redirect));
			}

			if (await this.getHook('set_status', 'beforeAllowedCheck', data) === false)
				return;

			const currentStatusId = data.entity['fk_id_status_'+data.statusName];
			if (data.isAllowed === false && await this.helpers.status.isAllowed(currentStatusId, data.idNewStatus) === false) {
				data.req.session.toastr = [{level: 'error', message: 'component.status.error.illegal_status'}];
				return data.res.error(_ => data.res.redirect(data.redirect));
			}

			data.actions = await this.helpers.status.getActions(data.idNewStatus);

			if (await this.getHook('set_status', 'beforeActionsExecution', data) === false)
				return;

			await this.helpers.status.executeActions(this.E_entity, data.idEntity, data.actions, data.transaction);

			if (await this.getHook('set_status', 'beforeSetStatus', data) === false)
				return;

			await this.helpers.status.setStatus(this.e_entity, data.idEntity, data.statusName, data.idNewStatus, {
				user: data.req.user,
				comment: data.req.query.comment,
				transaction: data.transaction
			});

			if (await this.getHook('set_status', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * POST - Search route use by the select2
	 * @namespace
	 */
	search() {
		this.router.post('/search', ...this.middlewares.search, this.asyncRoute(async(data) => {
			data.search = '%' + (data.req.body.search || '') + '%';
			data.searchField = data.req.body.searchField;
			data.limit = SELECT_PAGE_SIZE;
			data.offset = (data.req.body.page - 1) * data.limit;

			if (await this.getHook('search', 'start', data) === false)
				return;

			// ID is always needed
			if (data.searchField.indexOf("id") == -1)
				data.searchField.push('id');

			data.query = {
				raw: true,
				attributes: data.req.body.searchField,
				offset: data.offset,
				limit: data.limit,
				where: {}
			};

			data.query.where = this.helpers.entity.search.generateWhere(data.search, data.searchField);

			// Example customwhere in select2, please respect " and ' syntax: data-customwhere='{"myField": "myValue"}'
			// Note that customwhere feature do not work with related to many field if the field is a foreignKey !
			this.helpers.entity.search.handleCustomWhere(data.query.where, data.req.body.customwhere);

			// If you need to show fields in the select that are in an other associate entity, you have to include those entity here
			// query.include = [{model: models.E_myentity, as: "r_myentity"}]
			data.results = await models[this.E_entity].findAndCountAll(data.query);

			data.results.more = data.results.count > data.req.body.page * SELECT_PAGE_SIZE;

			// Format value like date / datetime / etc...
			this.helpers.entity.search.formatValue(this.attributes, data.results, data.req.session.lang_user, this.e_entity);

			if (await this.getHook('search', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.json(data.results));
		}));
	}

	fieldset_add() {
		this.router.post('/fieldset/:alias/add', ...this.middlewares.fieldset_add, this.asyncRoute(async(data) => {
			data.alias = data.req.params.alias;
			data.idEntity = parseInt(data.req.body.idEntity);

			if (await this.getHook('fieldset_add', 'start', data) === false)
				return;

			const entity = await models[this.E_entity].findOne({
				where: {id: data.idEntity},
				transaction: data.transaction
			});
			if (!entity)
				return data.res.error(_ => data.res.status(404).end());

			let toAdd;
			if (typeof(toAdd = data.req.body.ids) === 'undefined') {
				data.req.session.toastr.push({
					message: 'message.create.failure',
					level: "error"
				});
				return data.res.redirect('/' + this.entity + '/show?id=' + data.idEntity + "#" + data.alias);
			}

			await entity['add' + data.alias.capitalizeFirstLetter()](toAdd, {transaction: data.transaction});

			if (await this.getHook('fieldset_add', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.sendStatus(200).end());
		}));
	}

	fieldset_remove() {
		this.router.post('/fieldset/:alias/remove', ...this.middlewares.fieldset_remove, this.asyncRoute(async(data) => {
			data.alias = data.req.params.alias;
			data.idEntity = parseInt(data.req.body.idEntity);
			data.id_to_remove = parseInt(data.req.body.idRemove);

			if (await this.getHook('fieldset_remove', 'start', data) === false)
				return;

			const entity = await models[this.E_entity].findOne({
				where: {id: data.idEntity},
				transaction: data.transaction
			});
			if (!entity)
				return data.res.error(_ => data.res.status(404).end());

			// Get all associations
			await entity['remove' + data.alias.capitalizeFirstLetter()](data.id_to_remove, {transaction: data.transaction});

			if(globalConfig.env == "tablet"){
				let target = "";
				for (let i = 0; i < this.options.length; i++)
					if (this.options[i].as == data.alias)
					{target = this.options[i].target; break;}

				this.helpers.entity.synchro.writeJournal({
					verb: "associate",
					id: data.idEntity,
					target: target,
					entityName: this.e_entity,
					func: 'remove' + data.alias.capitalizeFirstLetter(),
					ids: data.id_to_remove
				});
			}

			if (await this.getHook('fieldset_remove', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.sendStatus(200).end());
		}));
	}

	/**
	 * POST - Destroying an entity row
	 * @namespace
	 */
	destroy() {
		this.router.post('/delete', ...this.middlewares.destroy, this.asyncRoute(async(data) => {
			data.idEntity = parseInt(data.req.body.id);

			if (await this.getHook('destroy', 'start', data) === false)
				return;

			await this.getHook('destroy', 'beforeEntityQuery', data);

			data.deleteObject = await models[this.E_entity].findOne({
				where: {id: data.idEntity}
			});

			if (!data.deleteObject)
				return data.res.error(_ => data.res.render('common/404', {
					message: 'Entity row not found'
				}));

			if (await this.getHook('destroy', 'beforeDestroy', data) === false)
				return;

			await data.deleteObject.destroy({transaction: data.transaction});

			data.req.session.toastr = [{
				message: 'message.delete.success',
				level: "success"
			}];

			data.redirect = '/' + this.entity + '/list';
			if (typeof data.req.query.associationFlag !== 'undefined')
				data.redirect = '/' + data.req.query.associationUrl + '/show?id=' + data.req.query.associationFlag + '#' + data.req.query.associationAlias;

			await this.helpers.entity.removeFiles(data.deleteObject, this.attributes);

			if (await this.getHook('destroy', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}
}

module.exports = CoreEntity;