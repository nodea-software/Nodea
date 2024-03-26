const fs = require('fs-extra');
const moment = require("moment");
const qrcode = require("yaqrcode");
const dayjs = require('dayjs');

const language = require('./language');
const file_helper = require('@core/helpers/file');
const enums_radios = require('@core/utils/enum_radio');

const models = require('@app/models');

function addressHelper(){
	if (!this.address_helper)
		this.address_helper = require('./address'); // eslint-disable-line
	return this.address_helper;
}

module.exports = {
	getOverlayFile: function (sourceEntity, alias, file) {
		return fs.existsSync(`${__appPath}/views/${sourceEntity}/${alias}/${file}.dust`)
			? `${sourceEntity}/${alias}/${file}`
			: `overlay/${file}`;
	},
	getTabData: async function (data){
		const dustData = {};
		const tabInfo = {
			entity: data.entity,
			e_entity: data.e_entity,
			entityId: data.id,
			model: data.E_entity,
			option: data.option,
			lang_user: data.req.session.lang_user,
			e_subentity: data.option.target,
			subentity: data.option.target.substring(2)
		};

		switch (tabInfo.option.structureType) {
			case 'hasOne': {
				dustData.tabType = 'has_one';
				dustData.e_subentity = tabInfo.e_subentity
				dustData.subentity = tabInfo.subentity

				const entity = await models[tabInfo.model].findOne({
					where: {
						id: tabInfo.entityId
					},
					include: {
						model: models[tabInfo.option.target.capitalizeFirstLetter()],
						as: tabInfo.option.as,
						include: {all: true}
					}
				});
				if (!entity)
					throw new Error('Cannot find entity object.')

				dustData.sourceEntity = entity;
				dustData.data = entity[tabInfo.option.as];
				dustData.isEmpty = !dustData.data || dustData.data instanceof Array && dustData.data.length == 0;

				if (dustData.isEmpty)
					break;

				dustData.isEmpty = false;
				dustData.hideTab = true;
				dustData.enum_radio = enums_radios.translated(tabInfo.option.target, tabInfo.lang_user, tabInfo.options);
				dustData.componentAddressConfig = addressHelper().getMapsConfigIfComponentAddressExists(tabInfo.option.target);
				await this.getPicturesBuffers(dustData.data, tabInfo.option.target);

				// Fetch status children to be able to switch status
				// Apply getR_children() on each current status
				const subentityOptions = require('@app/models/options/' + tabInfo.option.target); // eslint-disable-line
				const statusChildrenPromises = [];
				for (let i = 0; i < subentityOptions.length; i++) {
					if (subentityOptions[i].target.indexOf('e_status') !== 0)
						continue;

					statusChildrenPromises.push((async statusAlias => {
						dustData.data[statusAlias].r_children = await dustData.data[statusAlias].getR_children({
							include: [{
								model: models.E_group,
								as: "r_accepted_group"
							}]
						});
					})(subentityOptions[i].as));
				}
				await Promise.all(statusChildrenPromises);

				break;
			}
			case 'hasMany':
				dustData.tabType = 'has_many';
				// Status history specific behavior. Replace history_model by history_table to open view
				if (tabInfo.option.target.indexOf('e_history_') == 0)
					tabInfo.option.noCreateBtn = true;
				dustData.tableUrl = `/${tabInfo.entity}/subdatalist?subentityAlias=${tabInfo.option.as}&subentityModel=${tabInfo.option.target}&sourceId=${tabInfo.entityId}&paginate=true`;
				dustData.e_subentity = tabInfo.e_subentity
				dustData.subentity = tabInfo.subentity
				break;

			case 'hasManyPreset':
				dustData.tabType = 'has_many_preset';
				dustData.entity = tabInfo.entity
				dustData.alias = tabInfo.option.as
				dustData.entityId = tabInfo.entityId
				dustData.e_subentity = tabInfo.e_subentity
				dustData.subentity = tabInfo.subentity
				dustData.tableUrl = `/${tabInfo.entity}/subdatalist?subentityAlias=${tabInfo.option.as}&subentityModel=${tabInfo.option.target}&sourceId=${tabInfo.entityId}&paginate=false`;
				dustData.usingField = (tabInfo.option.usingField || [{value: 'id'}]).map(field => field.value).join(', ');
				break;

			default:
				throw new Error('Cannot find assocation structureType');
		}
		return dustData;
	},
	// Process entity data after beeing fetched from DB
	postProcessEntityData: async function (entity, options = {}) {
		const lang = options.lang || 'fr-FR';

		const defaultProcessors = {
			date: (entityName, entity, attribute) => {
				const format = lang == 'fr-FR' ? 'DD/MM/YYYY' : 'YYYY-MM-DD';
				entity.set(attribute, {
					value: entity[attribute],
					converted: dayjs(entity[attribute]).format(format)
				}, {
					raw: true // Model instance is waiting for date on this field, need to force raw true to convert to object
				});
			},
			datetime: (entityName, entity, attribute) => {
				const format = lang == 'fr-FR' ? 'DD/MM/YYYY HH:mm' : 'YYYY-MM-DD HH:mm';
				entity.set(attribute, {
					value: entity[attribute],
					converted: dayjs(entity[attribute]).format(format)
				}, {
					raw: true // Model instance is waiting for date on this field, need to force raw true to convert to object
				});
			},
			enum: (entityName, entity, attribute) => {
				entity[attribute] = {
					value: entity[attribute],
					translation: enums_radios.translateFieldValue(entityName, attribute, entity[attribute], lang)
				};
			},
			boolean: (entityName, entity, attribute) => {
				let boolTrad;
				if (lang == 'fr-FR')
					boolTrad = entity[attribute] == true ? 'Oui' : 'Non';
				else
					boolTrad = entity[attribute] == true ? 'Yes' : 'No';
				entity[attribute] = {
					value: entity[attribute],
					translation: boolTrad
				}
			},
			file: (entityName, entity, attribute) => {
				entity[attribute] = file_helper.originalFilename(entity[attribute]);
			},
			picture: async (entityName, entity) => {
				await this.getPicturesBuffers(entity, entityName);
			},
			qrcode: (entityName, entity, attribute) => {
				entity[attribute] = {
					value: entity[attribute],
					buffer: qrcode(entity[attribute])
				}
			}
		}

		let entityName, attributes;
		try {
			entityName = entity.constructor.name.toLowerCase();
			// eslint-disable-next-line global-require
			attributes = require(`@app/models/attributes/${entityName}.json`);
		} catch(err) {
			console.warn("Couldn't post process entity "+entityName);
			return;
		}
		for (const attribute in attributes) {
			const attributeDef = attributes[attribute];
			const nodeaType = attributeDef.nodeaType;

			if (!entity[attribute])
				continue;
			if (options[nodeaType] === false)
				continue;

			const processor = typeof options[nodeaType] === 'function' ? options[nodeaType] : defaultProcessors[nodeaType];
			if (processor){
				// eslint-disable-next-line no-await-in-loop
				await processor(entityName, entity, attribute, attributeDef);
			}
		}

		const childrenPromises = [];
		const includes = entity._options.includeNames;
		for (const include of includes || []) {
			if (!entity[include])
				continue;
			const children = Array.isArray(entity[include]) ? entity[include] : [entity[include]];
			for (const child of children)
				childrenPromises.push(this.postProcessEntityData(child));
		}

		await Promise.all(childrenPromises);
	},
	prepareDatalistResult: async function (entityName, attributes, options, data, lang_user) {
		const thumbnailPromises = [];

		// Replace data enum value by translated value for datalist
		const enumsTranslation = enums_radios.translated(entityName, lang_user, options);
		for (let i = 0; i < data.data.length; i++) {

			// Tranlate enums / radios
			enums_radios.translateRow(data.data[i], entityName, enumsTranslation, true);
			// Translate alias using field too
			enums_radios.translateUsingField(data.data[i], options, enumsTranslation, true);

			for (const field in data.data[i]) {
				// Fetch thumbnails buffers
				// Get attribute value
				const value = data.data[i][field];
				if (typeof attributes[field] != 'undefined' && attributes[field].nodeaType == 'picture' && value != null) {
					const filePath = `thumbnail/${value}`;
					(thumbnailTask => {
						thumbnailPromises.push((async _ => {
							const buffer = await file_helper.readBuffer(thumbnailTask.filePath);
							data.data[thumbnailTask.i][thumbnailTask.field] = {
								value: thumbnailTask.value,
								buffer: buffer
							};
						})());
					})({value, field, i, filePath});
				}
			}
		}

		await Promise.all(thumbnailPromises);

		return data;
	},
	optimizedFindOne: async function (modelName, idObj, options, forceOptions = []) {
		// Split SQL request if too many inclusion
		const includePromises = [], includes = forceOptions, includeMaxlength = 5;
		for (let i = 0; i < options.length; i++)
			if (options[i].structureType == 'relatedTo' ||
				options[i].structureType == 'relatedToMultiple' ||
				options[i].structureType == 'relatedToMultipleCheckbox' ||
				options[i].component == 'address') {
				const opt = {
					model: models[options[i].target.capitalizeFirstLetter()],
					as: options[i].as
				};
				// Include status children
				if (options[i].target == 'e_status')
					opt.include = {model: models.E_status, as: 'r_children', include: [{model: models.E_group, as: "r_accepted_group"}]};
				includes.push(opt);
			}

		// Do a first query to get entity with all its fields and first `includeMaxLength`'nth includes
		includePromises.push(models[modelName].findOne({where: {id: idObj}, include: includes.splice(0, includeMaxlength)}));

		// While `includes` array isn't empty, query for `includeMaxLength` and delete from array
		// Fetch only attribute `id` since attributes doesn't change from one query to another
		while (includes.length > 0) {
			const limitedInclude = includes.splice(0, includeMaxlength);
			includePromises.push(models[modelName].findOne({where: {id: idObj}, attributes: ['id'], include: limitedInclude}));
		}

		const resolvedData = await Promise.all(includePromises);

		// Build final object by copying all 'r_' || 'c_' relations
		const mainObject = resolvedData[0];
		for (let i = 1; i < resolvedData.length; i++)
			for (const alias in resolvedData[i])
				if (alias.substring(0, 2) == "r_" || alias.substring(0, 2) == "c_") {
					mainObject[alias] = resolvedData[i][alias];
					mainObject.dataValues[alias] = resolvedData[i].dataValues[alias];
				}
		return mainObject;
	},
	getLoadOnStartData: async function (data, options) {
		// Check in given options if there is associations data (loadOnStart param) that we need to push in our data object
		const toLoadPromises = options
			// Only option with loadOnStart = true have to be loaded
			.filter(option => option.loadOnStart === true)
			.map(option => (async _ => {
				const results = await models[option.target.capitalizeFirstLetter()].findAll({raw: true})

				for (let i = 0; i < results.length; i++)
					enums_radios.translateRow(results[i], option.target, data.enum_radio);

				// Change alias name to avoid conflict
				data[option.as + "_all"] = results;
			})());
		await Promise.all(toLoadPromises);
	},
	error: function (err, req, res, redirect, entity) {
		let isKnownError = false;
		const toasts = [];
		const ajax = req.query.ajax || req.baseUrl.indexOf('/api') === 0 || false;
		const data = {
			code: 500,
			message: err.message || null
		};

		try {
			let lang = "fr-FR";
			if (typeof req.session.lang_user !== "undefined")
				lang = req.session.lang_user;

			const __ = language(lang).__;

			//Sequelize validation error
			if (err.name == "SequelizeValidationError") {
				for (const validationError of err.errors) {
					const fieldTrad = __(`entity.${entity}.${validationError.path}`);
					const message = __(validationError.message, [fieldTrad]);
					toasts.push({level: 'error', message: message});
				}
				data.code = 400;
				isKnownError = true;
			}
			// Unique value constraint error
			else if (typeof err.parent !== "undefined" && (err.parent.errno == 1062 || err.parent.code == 23505)) {
				const message = __('message.unique') + " " + __("entity." + entity + "." + err.errors[0].path);
				toasts.push({level: 'error', message: message});
				data.code = 400;
				isKnownError = true;
			}
			else
				toasts.push({level: 'error', message: __('error.500.title')});

		} finally {
			if (!isKnownError)
				console.error(err);

			if (ajax)
				res.status(data.code).send(toasts);
			else {
				req.session.toastr = toasts;
				if (isKnownError)
					res.redirect(redirect || '/');
				else
					res.status(data.code).render('common/error', data);
			}
		}
	},
	getPicturesBuffers: async (entity, modelName, isThumbnail) => {
		try {
			if (!entity)
				return false;

			const attributes = JSON.parse(fs.readFileSync(__appPath + '/models/attributes/' + modelName + '.json'));

			const promises = [];
			for (const key in entity.dataValues) {
				if (!attributes[key] || attributes[key].nodeaType != 'picture')
					continue;

				if (!entity.dataValues[key] || entity.dataValues[key] === "")
					continue;

				promises.push((async (key) => {
					const value = entity.dataValues[key];
					const path = isThumbnail ? 'thumbnail/' + value : value;
					const buffer = await file_helper.readBuffer(path);

					entity.dataValues[key] = {
						value,
						buffer
					};
				})(key));
			}

			await Promise.all(promises);
			return true;
		} catch(err) {
			console.error(err);
			return false;
		}
	},
	removeFiles: async (entity, attributes) => {
		const deletePromises = [];
		// Remove all the files and pictures associated to an entity row
		for (const attribute in attributes) {
			const type = attributes[attribute].nodeaType;
			if (!['file', 'picture'].includes(type))
				continue;
			if (!entity[attribute] || entity[attribute] === "")
				continue;
			deletePromises.push(file_helper.remove(entity[attribute]));

			// TODO: delete thumbnail
			if (type == 'picture')
				deletePromises.push(file_helper.remove('thumbnail/'+entity[attribute]));
		}

		await Promise.all(deletePromises);
	},
	findInclude: function (includes, searchType, toFind) {
		let type = '';
		switch (searchType) {
			case "model":
				type = 'model';
				break;
			case "as":
				type = 'as';
				break;
			default:
				type = 'model';
				break;
		}
		for (let i = 0; i < includes.length; i++) {
			const include = includes[i];
			const name = type == 'model' ? include[type].name : include.as;
			if (name == toFind)
				return include;
		}
	},
	search: {
		generateWhere: (search, searchField) => {
			const where = {};
			if (search == '%%')
				return where;

			if (searchField.length == 1)
				return where[search[0]] = {[models.$like]: search};

			const $or = [];
			for (let i = 0; i < searchField.length; i++) {
				if (searchField[i] == "id")
					continue;
				const searchProp = searchField[i].indexOf(".") != -1 ? "$" + searchField[i] + "$" : searchField[i];
				$or.push({[searchProp]: {[models.$like]: search.toLowerCase()}});
			}
			where[models.$or] = $or;
			return where;
		},
		formatValue: (attributes, results, lang, entity) => {
			// Format value like date / datetime / etc...
			for (const field in attributes) {
				for (let i = 0; i < results.rows.length; i++)
					for (const fieldSelect in results.rows[i])
						if (fieldSelect == field && results.rows[i][fieldSelect] && results.rows[i][fieldSelect] != "")
							switch (attributes[field].nodeaType) {
								case "date":
									results.rows[i][fieldSelect] = moment(results.rows[i][fieldSelect]).format(lang == "fr-FR" ? "DD/MM/YYYY" : "YYYY-MM-DD")
									break;
								case "datetime":
									results.rows[i][fieldSelect] = moment(results.rows[i][fieldSelect]).format(lang == "fr-FR" ? "DD/MM/YYYY HH:mm" : "YYYY-MM-DD HH:mm")
									break;
								case "enum":
									results.rows[i][fieldSelect] = enums_radios.translateFieldValue(entity, fieldSelect, results.rows[i][fieldSelect], lang);
									break;
								default:
									continue;
							}
			}
		}
	}
};