const CoreEntity = require('@core/abstract_routes/entity');
const enums_radios = require('@core/utils/enum_radio');
const models = require('@app/models/');

class CoreParamEntity extends CoreEntity {

	/**
	 * Represents a param entity.
	 * @constructor
	 * @param {string} e_entity - The name of the entity.
	 * @param {object} attributes - The models attributes of the entity.
	 * @param {array} options - The models options of the entity.
	 * @param {array} [additionalRoutes] - The models attributes of the entity.
	 */
	constructor(e_entity, attributes, options, helpers, additionalRoutes = []) {
		super(e_entity, attributes, options, helpers, additionalRoutes);
	}

	//
	// Routes
	//

	//
	// Disable unwanted routes for Param entity
	//
	/* eslint-disable */
	list() {}
	datalist() {}
	subdatalist() {}
	show() {}
	create_form() {}
	create() {}
	loadtab() {}
	set_status() {}
	fieldset_remove() {}
	fieldset_add() {}
	destroy() {}
	/* eslint-enable */

	// TODO: Param entity should be done using hooks. We want to avoid route code duplication

	/**
	 * GET - Display the update formulaire of a param entity
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
				data[this.e_entity] = await models[this.E_entity].create({
					id: 1
				}, data.transaction);

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
			}

			if (await this.getHook('update_form', 'afterEntityQuery', data) === false)
				return;

			for (const attrName in this.attributes)
				if (['file', 'picture'].includes(this.attributes[attrName].nodeaType) && data[this.e_entity][attrName])
					data[this.e_entity][attrName] = this.helpers.file.originalFilename(data[this.e_entity][attrName]);
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
	 * POST - Update of an param entity
	 * @namespace
	 */
	update() {
		this.router.post('/update', ...this.middlewares.update, this.asyncRoute(async(data) => {
			data.transaction = await models.sequelize.transaction();
			data.id_entity = 1;

			if (await this.getHook('update', 'start', data) === false)
				return;

			const [updateObject, updateAssociations, updateFiles] = this.helpers.model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body, data.req.files);
			data.updateObject = updateObject;
			data.updateAssociations = updateAssociations;
			data.files = data.req.files = updateFiles;

			data.updateRow = await models[this.E_entity].findOne({
				where: { id: data.id_entity },
				transaction: data.transaction
			});

			if (!data.updateRow)
				return data.res.error(_ => data.res.render('common/error', {error: 404}));

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

			this.helpers.address.updateAddressIfComponentExists(data.updateRow, this.options, data.req.body);

			data.updateObject.version = data.updateRow.version;
			if(typeof data.updateRow.version === 'undefined' || !data.updateRow.version)
				data.updateObject.version = 0;
			data.updateObject.version++;

			await data.updateRow.update(data.updateObject, {user: data.req.user, transaction: data.transaction});

			// Add associations
			await Promise.all(data.updateAssociations.map(asso => data.updateRow[asso.func](asso.value, {transaction: data.transaction})));

			data.redirect = '/' + this.entity + '/update_form?id=' + data.id_entity;
			if (typeof data.req.query.associationFlag !== 'undefined')
				data.redirect = '/' + data.req.query.associationUrl + '/update?id=' + data.req.query.associationFlag + '#' + data.req.query.associationAlias;

			data.req.session.toastr = [{
				message: 'message.update.success',
				level: "success"
			}];

			await this.getHook('update', 'beforeRedirect', data);

			data.res.success(_ => data.res.redirect(data.redirect));
		}));
	}
}

module.exports = CoreParamEntity;