const globalConfig = require('@config/global');
const Route = require('@core/abstract_routes/route');
const enums_radios = require('@core/utils/enum_radio');

// Select2 pagination size
const SELECT_PAGE_SIZE = 10;

// Models
const models = require('@app/models/');

/**
 * An object providing association function and its parameter.
 * @memberof CoreEntity
 * @typedef {object} associationObject
 * @property {string} func - Sequelize alias function (Ex: setR_user) used to create association in database
 * @property {number|number[]} value - Parameter of alias function. Id or array of ids to associate
 * @example
 * const association = {func: 'setR_user', value: [42, 84]};
 * await entityInstance[association.func](association.value);
 */

/**
 * File object built from multer data in `model_builder.parseBody()`
 * @memberof CoreEntity
 * @typedef {object} fileObject
 * @property {boolean} isPicture - If file is for a picture field
 * @property {boolean} isModified - True when any modification occur client side. Used to know if a previous version need to be deleted
 * @property {string} attribute - Field attribute of the file
 * @property {string} finalPath - Secured and formated filepath
 * @property {buffer} [buffer] - If there is no buffer, the file as been removed from form data and needs to be deleted on disk
 * @property {function} [func=undefined] - Function called in `res.success()` with the fileObject as parameter. Default function that write or remove file to/from disk is added in '/create' and '/update' routes. Provide your own to change how file is handled
 */

/**
 * <p>Abstract class extended by entity route classes found in /app/routes</p>
 * <p>CoreEntity methods present in the `registeredRoutes` array and `additionalRoutes` parameter will be provided as route definition to expressjs</p>
 * <p>Behavior of route methods can be altered by using its hooks from the child class, or by overriding the method</p>
 */

class CoreEntity extends Route {

	/**
	 * @constructor
	 * @param {string} e_entity - The name of the entity.
	 * @param {object} attributes - The models attributes of the entity.
	 * @param {array} options - The models options of the entity.
	 * @param {object} helpers - Helpers modules found in `/_core/helpers`.
	 * @param {array} [additionalRoutes] - Additional routes implemented in CoreEntity child class.
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

		this.fileFields = [];
		for (const fieldName in this.attributes) {
			const field = this.attributes[fieldName];
			if (['file', 'picture'].includes(field.nodeaType))
				this.fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
		}

		this.defaultMiddlewares.push(
			helpers.middlewares.isLoggedIn,
			helpers.middlewares.entityAccess(this.entity)
		);
	}

	//
	// Routes
	//

	/**
	 * GET - Render the entity's list file
	 * @namespace CoreEntity#list
	 */
	list() {
		this.router.get('/list', ...this.middlewares.list, this.asyncRoute(async(data) => {
			data.tableUrl = `/${this.entity}/datalist`;
			data.renderFile = `${this.e_entity}/list`;

			/**
		     * Called at route start
		     * @function CoreEntity#list#start
		     * @memberof CoreEntity#list
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {string} data.tableUrl - Url for the ajax datalist
		     * @param {string} data.renderFile - Dust file to render
		     */
			if (await this.getHook('list', 'start', data) === false)
				return;

			/**
		     * Called before rendering
		     * @function CoreEntity#list#beforeRender
		     * @memberof CoreEntity#list
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {string} data.tableUrl - Url for the ajax datalist
		     * @param {string} data.renderFile - Dust file to render
		     */
			if (await this.getHook('list', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * POST - Ajax route use by the datalist
	 * @namespace CoreEntity#datalist
	 */
	datalist() {
		this.router.post('/datalist', ...this.middlewares.datalist, this.asyncRoute(async(data) => {
			data.speInclude = null;
			data.speWhere = null;
			data.tableInfo = data.req.body;

			/**
		     * Called at route start
		     * @function CoreEntity#datalist#start
		     * @memberof CoreEntity#datalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     */
			if (await this.getHook('datalist', 'start', data) === false)
				return;

			/**
		     * Called before datatable query build and execution
		     * @function CoreEntity#datalist#beforeDatatableQuery
		     * @memberof CoreEntity#datalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     */
			if (await this.getHook('datalist', 'beforeDatatableQuery', data) === false)
				return;

			data.rawData = await this.helpers.datatable(this.E_entity, data.tableInfo, data.speInclude, data.speWhere);

			/**
		     * Called after datatable query execution, before post processing of results
		     * @function CoreEntity#datalist#afterDatatableQuery
		     * @memberof CoreEntity#datalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     * @param {string} data.rawData - Result of the datatable query as raw data
		     */
			if (await this.getHook('datalist', 'afterDatatableQuery', data) === false)
				return;

			data.preparedData = await this.helpers.entity.prepareDatalistResult(this.e_entity, this.attributes, this.options, data.rawData, data.req.session.lang_user)

			/**
		     * Called before json response
		     * @function CoreEntity#datalist#beforeResponse
		     * @memberof CoreEntity#datalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     * @param {string} data.rawData - Result of the datatable query as raw data
		     * @param {string} data.preparedData - Post processed data of datatable query results. This is the data sent as response
		     */
			if (await this.getHook('datalist', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.send(data.preparedData).end());
		}));
	}

	/**
	 * POST - Ajax route use by the datalist in tab (like has many tab)
	 * @namespace CoreEntity#subdatalist
	 */
	subdatalist() {
		this.router.post('/subdatalist', ...this.middlewares.subdatalist, this.asyncRoute(async(data) => {
			data.speWhere = [];
			data.speInclude = [];
			data.tableInfo = {...data.req.body, ...data.req.query};

			/**
		     * Called at route start
		     * @function Core#CoreEntity#subdatalist#start
		     * @memberof CoreEntity#subdatalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {string} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     */
			if (await this.getHook('subdatalist', 'start', data) === false)
				return;

			/**
		     * Called before datatable query build and execution
		     * @function CoreEntity#subdatalist#beforeDatatableQuery
		     * @memberof CoreEntity#subdatalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {string} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     */
			if (await this.getHook('subdatalist', 'beforeDatatableQuery', data) === false)
				return;

			data.rawData = await this.helpers.datatable(this.E_entity, data.tableInfo, data.speInclude, data.speWhere, true);

			/**
		     * Called after datatable query execution, before post processing of results
		     * @function CoreEntity#subdatalist#afterDatatableQuery
		     * @memberof CoreEntity#subdatalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     * @param {object} data.rawData - Result of the datatable query as raw data
		     */
			if (await this.getHook('subdatalist', 'afterDatatableQuery', data) === false)
				return;

			data.preparedData = await this.helpers.entity.prepareDatalistResult(data.req.query.subentityModel, this.attributes, this.options, data.rawData, data.req.session.lang_user);

			/**
		     * Called before json response
		     * @function CoreEntity#subdatalist#beforeResponse
		     * @memberof CoreEntity#subdatalist
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
		     * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
		     * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
		     * @param {object} data.tableInfo - Table information from client
		     * @param {object} data.rawData - Result of the datatable query as raw data
		     * @param {object} data.preparedData - Post processed data of datatable query results. This is the data sent as response
		     */
			if (await this.getHook('subdatalist', 'beforeResponse', data) === false)
				return;

			data.res.success(_ => data.res.send(data.preparedData).end());
		}));
	}

	/**
	 * GET - Route that display row information of an entity
	 * @namespace CoreEntity#show
	 */
	show() {
		this.router.get('/show', ...this.middlewares.show, this.asyncRoute(async(data) => {
			data.idEntity = data.req.query.id;
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = this.e_entity + '/show';
			// TODO: Check if hideButton is still useful
			/* If we arrive from an associated tab, hide the create and the list button */
			data.hideButton = data.req.query.hideButton !== 'undefined';

			/**
		     * Called at route start
		     * @function CoreEntity#show#start
		     * @memberof CoreEntity#show
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {number} data.idEntity - Id of entity to show
			 * @param {boolean} data.hideButton - Wether to hide buttons or not
			 */
			if (await this.getHook('show', 'start', data) === false)
				return;

			/**
		     * Called before querying data of entity to show
		     * @function CoreEntity#show#beforeEntityQuery
		     * @memberof CoreEntity#show
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {number} data.idEntity - Id of entity to show
			 * @param {boolean} data.hideButton - Wether to hide buttons or not
			 */
			if (await this.getHook('show', 'beforeEntityQuery', data) === false)
				return;

			// TODO: use data.entityData instead of data[this.e_entity] to normalize content of data object between entities
			data[this.e_entity] = await this.helpers.entity.optimizedFindOne(this.E_entity, data.idEntity, this.options);

			/**
		     * Called after querying data of entity to show
		     * @function CoreEntity#show#afterEntityQuery
		     * @memberof CoreEntity#show
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {number} data.idEntity - Id of entity to show
			 * @param {boolean} data.hideButton - Wether to hide buttons or not
			 * @param {object} data."e_entity" - Entity row to show
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
				data.entityData = data[this.e_entity].get({plain: true});
			}

			/**
		     * Called before show file rendering
		     * @function CoreEntity#show#beforeRender
		     * @memberof CoreEntity#show
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {number} data.idEntity - Id of entity to show
			 * @param {boolean} data.hideButton - Wether to hide buttons or not
			 * @param {object} data."e_entity" - Entity row to show
			 * @param {object} data.entityData - ajax request only - Equals to data."e_entity" whitout sequelize wrapping
			 * @param {string} [data.subentity] - ajax request only - entity name without prefix
			 * @param {string} [data.e_subentity] - ajax request only - entity name with prefix
			 */
			if (await this.getHook('show', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * GET - Display the creation form of an entity
	 * @namespace CoreEntity#create_form
	 */
	create_form() {
		this.router.get('/create_form', ...this.middlewares.create_form, this.asyncRoute(async(data) => {
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = `${this.e_entity}/create`;

			/**
		     * Called at route start
		     * @function CoreEntity#create_form#start
		     * @memberof CoreEntity#create_form
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 */
			if (await this.getHook('create_form', 'start', data) === false)
				return;

			// Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
			await this.helpers.entity.getLoadOnStartData(data, this.options);

			if (typeof data.req.query.associationFlag !== 'undefined') {
				data.associationFlag = data.req.query.associationFlag;
				data.associationSource = data.req.query.associationSource;
				data.associationUrl = data.req.query.associationUrl;
				data.associationForeignKey = data.req.query.associationForeignKey;
				data.associationAlias = data.req.query.associationAlias;
				if (data.req.query.ajax) {
					data.renderFile = this.helpers.entity.getOverlayFile(data.associationSource, data.associationAlias, 'create_form');
					data.subentity = this.entity;
					data.action = `/${this.entity}/create`;
					data.method = 'post';
					data.fieldsFile = `${this.e_entity}/create_fields`;
				}

				/**
			     * In case the creation form was called from an entity tab, it means that we've got to associate the created entity to a parent
			     * @function CoreEntity#create_form#ifFromAssociation
			     * @memberof CoreEntity#create_form
			     * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {object} data.enum_radio - Entity enum fields translations
				 * @param {string} data.renderFile - Dust file to render
			     * @param {integer} data.associationFlag - ID of the entity that ask for a creation formulaire of the current entity
			     * @param {string} data.associationSource - Entity name that ask for a creation formulaire of the current entity
			     * @param {string} data.associationUrl - The url string of the entity source
			     * @param {integer} data.associationForeignKey - The concerned foreign key between the two entities
			     * @param {string} data.associationAlias - Alias that represent the relation between the two entities
 				 * @param {string} data.subentity=this.entity - ajax request only - Name of entity without prefix
				 * @param {string} data.action=/this.entity/create - ajax request only - Action of create form
				 * @param {string} data.method=post - ajax request only - Method of create form
				 * @param {string} data.fieldsFile=this.e_entity/create_fields - ajax request only - Fields file to insert into the form
			     */
				if (await this.getHook('create_form', 'ifFromAssociation', data) === false)
					return;
			}

			/**
		     * Called before render of data.renderFile
		     * @function CoreEntity#create_form#beforeRender
		     * @memberof CoreEntity#create_form
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
		     * @param {integer} data.associationFlag - ID of the entity that ask for a creation formulaire of the current entity
		     * @param {string} data.associationSource - Entity name that ask for a creation formulaire of the current entity
		     * @param {string} data.associationUrl - The url string of the entity source
		     * @param {integer} data.associationForeignKey - The concerned foreign key between the two entities
		     * @param {string} data.associationAlias - Alias that represent the relation between the two entities
			 * @param {string} data.subentity=this.entity - ajax request only - Name of entity without prefix
			 * @param {string} data.action=/this.entity/create - ajax request only - Action of create form
			 * @param {string} data.method=post - ajax request only - Method of create form
			 * @param {string} data.fieldsFile=this.e_entity/create_fields - ajax request only - Fields file to insert into the form
		     */
			if (await this.getHook('create_form', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * POST - Creation of an entity row
	 * @namespace CoreEntity#create
	 */
	create() {
		this.router.post('/create', ...this.middlewares.create, this.asyncRoute(async(data) => {
			data.transaction = await models.sequelize.transaction();

			/**
		     * Called at route start
		     * @function CoreEntity#create#start
		     * @memberof CoreEntity#create
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 */
			if (await this.getHook('create', 'start', data) === false)
				return;

			const [createObject, createAssociations, createFiles] = this.helpers.model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body, data.req.files);
			data.createObject = createObject;
			data.createAssociations = createAssociations;
			data.files = createFiles;

			/**
		     * Called before entity creation in database
		     * @function CoreEntity#create#beforeCreateQuery
		     * @memberof CoreEntity#create
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 * @param {object} data.createObject - Parsed form values used to create row in database
			 * @param {CoreEntity.associationObject[]} data.createAssociations - Associations array
			 * @param {CoreEntity.fileObject[]} data.files - Array of files parsed from body
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

				const modelName = data.req.query.associationAlias.capitalizeFirstLetter();
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

			// Add default write to disk function to file if none set through hooks
			// These functions will be executed on route success before transaction commit
			for (const file of data.files)
				if (!file.func && file.buffer)
					file.func = async file => {
						await this.helpers.file.write(file.finalPath, file.buffer);
						if (file.isPicture)
							await this.helpers.file.writeThumbnail('thumbnail/'+file.finalPath, file.buffer);
					}
			// Add associations
			await Promise.all(data.createAssociations.map(asso => data.createdRow[asso.func](asso.value, {transaction: data.transaction})));

			await this.helpers.address.setAddressIfComponentExists(data.createdRow, this.options, data.req.body, data.transaction);
			const statusToastrs = await this.helpers.status.setInitialStatus(data.createdRow, this.E_entity, this.attributes, {transaction: data.transaction, user: data.req.user}) || [];

			if (statusToastrs.length)
				data.req.session.toastr = [...data.req.session.toastr, ...statusToastrs];

			/**
		     * Called before redirection to data.redirect
		     * @function CoreEntity#create#beforeRedirect
		     * @memberof CoreEntity#create
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 * @param {object} data.createObject - Parsed form values used to create row in database
			 * @param {CoreEntity.associationObject[]} data.createAssociations - Associations array
			 * @param {CoreEntity.fileObject[]} data.files - Array of files parsed from body
			 */
			if (await this.getHook('create', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * GET - Display the update form of an entity
	 * @namespace CoreEntity#update_form
	 */
	update_form() {
		this.router.get('/update_form', ...this.middlewares.update_form, this.asyncRoute(async(data) => {
			data.idEntity = data.req.query.id;
			data.enum_radio = enums_radios.translated(this.e_entity, data.req.session.lang_user, this.options);
			data.renderFile = `${this.e_entity}/update`;

			/**
		     * Called at route start
		     * @function CoreEntity#update_form#start
		     * @memberof CoreEntity#update_form
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of entity to update
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 */
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

			/**
		     * Called before querying entity to update
		     * @function CoreEntity#update_form#afterEntityQuery
		     * @memberof CoreEntity#update_form
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of entity to update
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {object} data."e_entity" - Entity row to update
			 */
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
		     * Called before render of data.renderFile
		     * @function CoreEntity#update_form#beforeRender
		     * @memberof CoreEntity#update_form
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of entity to update
			 * @param {object} data.enum_radio - Entity enum fields translations
			 * @param {string} data.renderFile - Dust file to render
			 * @param {object} data."e_entity" - Entity row to update
			 */
			if (await this.getHook('update_form', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data));
		}));
	}

	/**
	 * POST - Update of an entity row
	 * @namespace CoreEntity#update
	 */
	update() {
		this.router.post('/update', ...this.middlewares.update, this.asyncRoute(async(data) => {
			data.transaction = await models.sequelize.transaction();
			data.idEntity = parseInt(data.req.body.id);

			/**
		     * Called at route start
		     * @function CoreEntity#update#start
		     * @memberof CoreEntity#update
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 * @param {number} data.idEntity - Id of entity to update
			 */
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

			/**
		     * Called before entity update in database
		     * @function CoreEntity#update#beforeUpdate
		     * @memberof CoreEntity#update
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 * @param {object} data.updateObject - Parsed form values used to update row in database
			 * @param {CoreEntity.associationObject[]} data.updateAssociations - Associations array
			 * @param {CoreEntity.fileObject[]} data.files - Array of files parsed from body
			 */
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

			/**
		     * Called before redirecting to data.redirect
		     * @function CoreEntity#update#beforeRedirect
		     * @memberof CoreEntity#update
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 * @param {object} data.updateObject - Parsed form values used to update row in database
			 * @param {CoreEntity.associationObject[]} data.updateAssociations - Associations array
			 * @param {CoreEntity.fileObject[]} data.files - Array of files parsed from body
			 */
			if (await this.getHook('update', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * GET - Default route called to load entity tabs from show page
	 * @namespace CoreEntity#loadtab
	 */
	loadtab() {
		this.router.get('/loadtab/:id/:alias', ...this.middlewares.loadtab, this.asyncRoute(async(data) => {
			data.alias = data.req.params.alias;
			data.id = data.req.params.id;
			data.isAllowed = false;

			/**
		     * Called at route start
		     * @function CoreEntity#loadtab#start
		     * @memberof CoreEntity#loadtab
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of source entity
			 * @param {string} data.alias - Alias of relation between source entity and tab entity
			 * @param {boolean} data.isAllowed=false - Boolean to block tab loading. Set it to true to skip default verifications
			 */
			if (await this.getHook('loadtab', 'start', data) === false)
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

			/**
		     * Called before checking access rights to this tab for logged user
		     * @function CoreEntity#loadtab#beforeValidityCheck
		     * @memberof CoreEntity#loadtab
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of source entity
			 * @param {string} data.alias - Alias of relation between source entity and tab entity
			 * @param {boolean} data.isAllowed=false - Boolean to block tab loading. Set it to true to skip default access rights verifications
			 */
			if (await this.getHook('loadtab', 'beforeValidityCheck', data) === false)
				return;

			// Check access rights to subentity
			if (!data.isAllowed && !this.helpers.access.entityAccess(data.req.user.r_group, data.option.target.substring(2)))
				return data.res.error(_ => data.res.status(403).end());
			data.isAllowed = true;

			/**
		     * Called after checking access rights, if allowed
		     * @function CoreEntity#loadtab#afterValidityCheck
		     * @memberof CoreEntity#loadtab
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of source entity
			 * @param {string} data.alias - Alias of relation between source entity and tab entity
			 * @param {boolean} data.isAllowed - Now true because we're after validity check
			 */
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
			data.dustData = null;

			/**
		     * Called before querying data of tab
		     * @function CoreEntity#loadtab#beforeDataQuery
		     * @memberof CoreEntity#loadtab
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of source entity
			 * @param {string} data.alias - Alias of relation between source entity and tab entity
			 * @param {boolean} data.isAllowed - Now true because we're after validity check
			 * @param {string} data.E_entity - Entity model name
			 * @param {string} data.e_entity - Prefixed entity name
			 * @param {string} data.entity - Entity name
			 * @param {object} [data.dustData] - Data provided to rendered data.renderFile. If data.dustData as no value, tab's default value will be loaded using `helpers.entity.getTabData()`. Set your data to avoid execution of default.
			 */
			if (await this.getHook('loadtab', 'beforeDataQuery', data) === false)
				return;

			if (!data.dustData)
				data.dustData = await this.helpers.entity.getTabData(data);

			/**
		     * Called before rendering data.renderFile
		     * @function CoreEntity#loadtab#beforeRender
		     * @memberof CoreEntity#loadtab
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.idEntity - Id of source entity
			 * @param {string} data.alias - Alias of relation between source entity and tab entity
			 * @param {boolean} data.isAllowed - Now true because we're after validity check
			 * @param {string} data.E_entity - Entity model name
			 * @param {string} data.e_entity - Prefixed entity name
			 * @param {string} data.entity - Entity name
			 * @param {object} [data.dustData] - Data provided to rendered data.renderFile.
			 */
			if (await this.getHook('loadtab', 'beforeRender', data) === false)
				return;

			data.res.success(_ => data.res.render(data.renderFile, data.dustData));
		}));
	}

	/**
	 * GET - Change the status of an entity
	 * @namespace CoreEntity#set_status
	 */
	set_status() {
		this.router.get('/set_status/:entity_id/:status/:id_new_status', ...this.middlewares.set_status, this.asyncRoute(async(data) => {
			data.redirect = data.req.headers.referer;
			data.idEntity = data.req.params.entity_id;
			data.statusName = data.req.params.status.substring(2); // TODO: no need for s_ prefix from client
			data.idNewStatus = data.req.params.id_new_status;
			data.isAllowed = false;

			/**
		     * Called at route start
		     * @function CoreEntity#set_status#start
		     * @memberof CoreEntity#set_status
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.redirect - Redirection route when status is set
			 * @param {number} data.idEntity - Id of source entity
			 * @param {number} data.idNewStatus - Id of target status
			 * @param {string} data.statusName - Status's name
			 * @param {boolean} data.isAllowed=false - Boolean to block status change. Set it to true to skip default verifications
			 */
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

			/**
		     * Called before calling `helpers.status.isAllowed()`
		     * @function CoreEntity#set_status#beforeAllowedCheck
		     * @memberof CoreEntity#set_status
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.redirect - Redirection route when status is set
			 * @param {number} data.idEntity - Id of source entity
			 * @param {number} data.idNewStatus - Id of target status
			 * @param {string} data.statusName - Status's name
			 * @param {boolean} data.isAllowed=false - Boolean to block status change. Set it to true to skip default verifications
			 * @param {object} data.entity - Entity on which status is to be set, with its current status included
			 */
			if (await this.getHook('set_status', 'beforeAllowedCheck', data) === false)
				return;

			const currentStatusId = data.entity['fk_id_status_'+data.statusName];
			if (data.isAllowed === false && await this.helpers.status.isAllowed(currentStatusId, data.idNewStatus) === false) {
				data.req.session.toastr = [{level: 'error', message: 'component.status.error.illegal_status'}];
				return data.res.error(_ => data.res.redirect(data.redirect));
			}

			data.actions = await this.helpers.status.getActions(data.idNewStatus);

			/**
		     * Called before executing target status actions. Alter `data.actions` to add/remove actions
		     * @function CoreEntity#set_status#beforeActionsExecution
		     * @memberof CoreEntity#set_status
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.redirect - Redirection route when status is set
			 * @param {number} data.idEntity - Id of source entity
			 * @param {number} data.idNewStatus - Id of target status
			 * @param {string} data.statusName - Status's name
			 * @param {boolean} data.isAllowed=false - Boolean to block status change. Set it to true to skip default verifications
			 * @param {object} data.entity - Entity on which status is to be set, with its current status included
			 * @param {object[]} data.actions - Target status actions fetched from `helpers.status.getActions()`
			 */
			if (await this.getHook('set_status', 'beforeActionsExecution', data) === false)
				return;

			await this.helpers.status.executeActions(this.E_entity, data.idEntity, data.actions, data.transaction);

			/**
		     * Called before setting target status using `helpers.status.setStatus()`
		     * @function CoreEntity#set_status#beforeSetStatus
		     * @memberof CoreEntity#set_status
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.redirect - Redirection route when status is set
			 * @param {number} data.idEntity - Id of source entity
			 * @param {number} data.idNewStatus - Id of target status
			 * @param {string} data.statusName - Status's name
			 * @param {boolean} data.isAllowed=false - Boolean to block status change. Set it to true to skip default verifications
			 * @param {object} data.entity - Entity on which status is to be set, with its current status included
			 * @param {object[]} data.actions - Target status actions fetched from `helpers.status.getActions()`
			 */
			if (await this.getHook('set_status', 'beforeSetStatus', data) === false)
				return;

			await this.helpers.status.setStatus(this.e_entity, data.idEntity, data.statusName, data.idNewStatus, {
				user: data.req.user,
				comment: data.req.query.comment,
				transaction: data.transaction
			});

			/**
		     * Called before redirecting to `data.redirect`
		     * @function CoreEntity#set_status#beforeRedirect
		     * @memberof CoreEntity#set_status
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {number} data.redirect - Redirection route when status is set
			 * @param {number} data.idEntity - Id of source entity
			 * @param {number} data.idNewStatus - Id of target status
			 * @param {string} data.statusName - Status's name
			 * @param {boolean} data.isAllowed=false - Boolean to block status change. Set it to true to skip default verifications
			 * @param {object} data.entity - Entity on which status is to be set, with its current status included
			 * @param {object[]} data.actions - Target status actions fetched from `helpers.status.getActions()`
			 */
			if (await this.getHook('set_status', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}

	/**
	 * POST - Search route of entity. Mainly used by ajax selects
	 * @namespace CoreEntity#search
	 */
	search() {
		this.router.post('/search', ...this.middlewares.search, this.asyncRoute(async(data) => {
			data.search = '%' + (data.req.body.search || '') + '%';
			data.searchField = data.req.body.searchField;
			data.limit = SELECT_PAGE_SIZE;
			data.offset = (data.req.body.page - 1) * data.limit;

			/**
			 * Called to search entity results paginated and / or filtered. This route is used by ajax select
			 * @function CoreEntity#search#start
			 * @memberof CoreEntity#search
			 * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.search - The search filter wrapped in '%' char. If no filter is provided `data.search` will equals to '%%'
			 * @param {string[]} data.searchField - The field on which the search filter is to be applied
			 * @param {number} data.limit=SELECT_PAGE_SIZE - Limit the number of results. Defaults to `SELECT_PAGE_SIZE` global
			 * @param {number} data.offset - The offset of search results. Equals to page number * `data.limit`
			 */
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

			/**
			 * Before the Sequelize query, usefull to customize default query behaviour
			 * @function CoreEntity#search#beforeQuery
			 * @memberof CoreEntity#search
			 * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {object} data.query - Query object that will be used in Sequelize query, customizable
			 */
			if (await this.getHook('search', 'beforeQuery', data) === false)
				return;

			// If you need to show fields in the select that are in an other associate entity, you have to include those entity here
			// query.include = [{model: models.E_myentity, as: "r_myentity"}]
			data.results = await models[this.E_entity].findAndCountAll(data.query);

			data.results.more = data.results.count > data.req.body.page * SELECT_PAGE_SIZE;

			// Format value like date / datetime / etc...
			this.helpers.entity.search.formatValue(this.attributes, data.results, data.req.session.lang_user, this.e_entity);

			/**
		     * Called before json response
		     * @function CoreEntity#search#beforeResponse
		     * @memberof CoreEntity#search
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.search - The search filter wrapped in '%' char. If no filter is provided `data.search` will equals to '%%'
			 * @param {string[]} data.searchField - The field on which the search filter is to be applied
			 * @param {number} data.limit=SELECT_PAGE_SIZE - Limit the number of results. Defaults to `SELECT_PAGE_SIZE` global
			 * @param {number} data.offset - The offset of search results. Equals to page number * `data.limit`
			 * @param {object} data.results - Search result sent to response
			 */
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
	 * @namespace CoreEntity#destroy
	 */
	destroy() {
		this.router.post('/delete', ...this.middlewares.destroy, this.asyncRoute(async(data) => {
			data.idEntity = parseInt(data.req.body.id);

			/**
		     * Called to delete an entity row in database
		     * @function CoreEntity#destroy#start
		     * @memberof CoreEntity#destroy
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.idEntity - Id of entity to delete
			 */
			if (await this.getHook('destroy', 'start', data) === false)
				return;

			/**
		     * Called before fetching row to delete
		     * @function CoreEntity#destroy#beforeEntityQuery
		     * @memberof CoreEntity#destroy
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.idEntity - Id of entity to delete
			 */
			if (await this.getHook('destroy', 'beforeEntityQuery', data) === false)
				return;

			data.deleteObject = await models[this.E_entity].findOne({
				where: {id: data.idEntity}
			});

			if (!data.deleteObject)
				return data.res.error(_ => data.res.render('common/404', {
					message: 'Entity row not found'
				}));

			/**
		     * Called before deleting row in database
		     * @function CoreEntity#destroy#beforeEntityQuery
		     * @memberof CoreEntity#destroy
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.idEntity - Id of entity to delete
			 * @param {object} data.deleteObject - Instance of entity to delete
			 */
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

			/**
		     * Called before redirecting to `data.redirect`
		     * @function CoreEntity#destroy#beforeEntityQuery
		     * @memberof CoreEntity#destroy
		     * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
			 * @param {string} data.idEntity - Id of entity to delete
			 * @param {object} data.deleteObject - Instance of entity to delete
			 * @param {string} data.redirect - Where to redirect the response
			 */
			if (await this.getHook('destroy', 'beforeRedirect', data) === false)
				return;

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}
}

module.exports = CoreEntity;