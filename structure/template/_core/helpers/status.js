const fs = require('fs-extra');
const language = require('./language');
const model_builder = require('./model_builder');
const models = require('@app/models');

module.exports = {
	isAllowed: async (sourceId, targetId, userGroups = false) => {
		const status = await models.E_status.findOne({
			where: {id: sourceId},
			include: {
				model: models.E_status,
				as: 'r_children',
				where: {id: targetId},
				required: true,
				include: {
					model: models.E_group,
					as: 'r_accepted_group'
				}
			}
		})
		if (!status)
			return false;

		const targetStatus = status.r_children[0];
		if (!targetStatus.r_accepted_group.length || !userGroups)
			return true;

		for (const targetGrp of targetStatus.r_accepted_group)
			for (const userGrp of userGroups)
				if (userGrp.id === targetGrp.id)
					return true;
		return false;
	},
	getActions: async (statusId) => {
		const status = await models.E_status.findOne({
			where: {id: statusId},
			include: {
				model: models.E_action,
				as: 'r_actions',
				include: {
					model: models.E_media,
					as: 'r_media',
					include: [{
						model: models.E_media_mail,
						as: 'r_media_mail'
					}, {
						model: models.E_media_notification,
						as: 'r_media_notification'
					}, {
						model: models.E_media_task,
						as: 'r_media_task'
					}, {
						model: models.E_media_sms,
						as: 'r_media_sms'
					}]
				}
			}
		});
		return status && status.r_actions || [];
	},
	executeActions: async (modelName, idEntity, actions, transaction, customValues = {}) => {
		if (!actions || !actions.length)
			return;
		let usedFields = [];
		for (const action of actions)
			if (action.r_media)
				usedFields = [...usedFields, ...action.r_media.getFieldsToInclude()];

		const include = model_builder.getIncludeFromFields(models, modelName, usedFields);
		const mediaData = await models[modelName].findOne({
			where: {id: idEntity},
			include,
			transaction
		});

		// Add custom values to media data
		for (const key in customValues)
			if (Object.hasOwnProperty.call(customValues, key))
				mediaData[key] = customValues[key];

		const mediaExecutionPromises = [];
		for (const action of actions)
			if (action.r_media)
				mediaExecutionPromises.push(action.r_media.execute(mediaData));

		await Promise.allSettled(mediaExecutionPromises);
	},
	setStatus: async function (entityName, entityId, statusName, statusId, optionnals = {}) {
		const historyModel = 'E_history_' + entityName.substring(2) + '_' + statusName;
		const statusFk = "fk_id_status_" + statusName;
		const userID = optionnals.user ? optionnals.user.id : null;
		// Create history record for this status field
		const createObject = {
			f_comment: optionnals.comment || "",
			fk_id_reason: optionnals.reasonID || "",
			fk_id_user_modified_by: userID
		};

		createObject[statusFk] = statusId;
		createObject["fk_id_" + entityName.substring(2) + "_history_" + statusName] = entityId;

		await models[entityName.capitalizeFirstLetter()].update({
			[statusFk]: statusId
		}, {
			where: {id: entityId},
			transaction: optionnals.transaction
		});
		await models[historyModel].create(createObject, {user: optionnals.user, transaction: optionnals.transaction});
	},
	setInitialStatus: async function (entity, modelName, attributes, optionnals = {}) {
		const self = this;

		// Special object, no status available
		if (!models[modelName])
			return;
		// Look for s_status fields
		const statusFields = self.statusFieldList(attributes);
		if (statusFields.length == 0)
			return;

		const initStatusPromise = [];
		for (let i = 0; i < statusFields.length; i++) {
			const field = statusFields[i];

			initStatusPromise.push((async (fieldIn) => {
				const [status, created] = await models.E_status.findOrCreate({
					where: {
						f_entity: modelName.toLowerCase(),
						f_field: fieldIn,
						f_default: true
					},
					defaults: {
						f_entity: modelName.toLowerCase(),
						f_field: fieldIn,
						f_name: 'Initial',
						f_default: true,
						f_color: '#999999',
						f_text_color: '#000000'
					},
					transaction: optionnals.transaction,
					user: optionnals.user
				});

				if (!created && !optionnals.noActions) {
					const actions = await self.getActions(status.id);
					await self.executeActions(modelName, entity.id, actions, optionnals.transaction)
				}

				await self.setStatus(modelName.toLowerCase(), entity.id, fieldIn.substring(2), status.id, {
					user: optionnals.user,
					transaction: optionnals.transaction
				});
			})(field));
		}

		await Promise.all(initStatusPromise);
	},
	// Build entity tree with fields and ONLY belongsTo associations
	entityFieldTree:  (entity, alias) => {
		const genealogy = [];
		// Create inner function to use genealogy globaly
		function loadTree(entity, alias) {
			const fieldTree = {
				entity: entity,
				alias: alias || entity,
				fields: [],
				email_fields: [],
				phone_fields: [],
				file_fields: [],
				children: []
			}

			let entityFields, entityAssociations;
			try {
				entityFields = JSON.parse(fs.readFileSync(__appPath + '/models/attributes/' + entity + '.json'));
				entityAssociations = JSON.parse(fs.readFileSync(__appPath + '/models/options/' + entity + '.json'));
			} catch (e) {
				console.error(e);
				return fieldTree;
			}

			// Building field array
			for (const field in entityFields) {
				if (entityFields[field].nodeaType == "email")
					fieldTree.email_fields.push(field);
				if (entityFields[field].nodeaType == "phone")
					fieldTree.phone_fields.push(field);
				if (entityFields[field].nodeaType == "file" || entityFields[field].nodeaType == "picture")
					fieldTree.file_fields.push(field);
				fieldTree.fields.push(field);
			}

			// Check if current entity has already been built in this branch of the tree to avoid infinite loop
			if (genealogy.indexOf(entity) != -1)
				return fieldTree;
			genealogy.push(entity);

			// Building children array
			for (let i = 0; i < entityAssociations.length; i++)
				if (entityAssociations[i].relation == 'belongsTo' && entityAssociations[i].target != entity)
					fieldTree.children.push(loadTree(entityAssociations[i].target, entityAssociations[i].as));

			return fieldTree;
		}
		return loadTree(entity, alias);
	},
	// Build entity tree with fields and ALL associations
	fullEntityFieldTree:  (entity, alias = entity) => {
		const genealogy = [];
		// Create inner function to use genealogy globaly
		function loadTree(entity, alias, depth = 0) {
			const fieldTree = {
				entity: entity,
				alias: alias,
				fields: [],
				email_fields: [],
				phone_fields: [],
				file_fields: [],
				children: []
			}
			let entityFields, entityAssociations;
			try {
				entityFields = JSON.parse(fs.readFileSync(__appPath + '/models/attributes/'+entity+'.json'));
				entityAssociations = JSON.parse(fs.readFileSync(__appPath + '/models/options/'+entity+'.json'));
			} catch (e) {
				console.error(e);
				return fieldTree;
			}

			// Building field array
			for (const field in entityFields) {
				if (entityFields[field].nodeaType == "email")
					fieldTree.email_fields.push(field);
				if (entityFields[field].nodeaType == "phone")
					fieldTree.phone_fields.push(field);
				if (entityFields[field].nodeaType == "file" || entityFields[field].nodeaType == "picture")
					fieldTree.file_fields.push(field);
				fieldTree.fields.push(field);
			}

			// Check if current entity has already been built in this branch of the tree to avoid infinite loop
			for (const [idx, genealogyBranch] of genealogy.entries())
				if (genealogyBranch.entity == entity) {
					// Keep smallest depth
					if (genealogyBranch.depth > depth)
						genealogy.splice(idx, 1);
					else
						return fieldTree;
				}

			genealogy.push({
				entity: entity,
				depth: depth
			});

			// Building children array
			for (let i = 0; i < entityAssociations.length; i++) {
				// Do not include history & status table in field list
				if(entityAssociations[i].target.indexOf("e_history_e_") == -1 && entityAssociations[i].target.indexOf("e_status") == -1 && entityAssociations[i].structureType !== 'auto_generate')
					fieldTree.children.push(loadTree(entityAssociations[i].target, entityAssociations[i].as, depth+1));
			}

			return fieldTree;
		}
		return loadTree(entity, alias);
	},
	// Build array of fields for media sms/notification/email insertion <select>
	entityFieldForSelect: function(entityTree, lang) {
		const __ = language(lang).__;
		const separator = ' > ';
		const options = [];
		function dive(obj, codename, parent, parentTraduction = "") {
			let traduction;
			// Top level. Entity traduction Ex: 'Ticket'
			if (!parent)
				traduction = __('entity.'+obj.entity+'.label_entity');
			// Child level. Parent traduction with child entity alias Ex: 'Ticket > Participants' OR 'Ticket > Participants > Adresse'
			else
				traduction = parentTraduction + separator + __('entity.'+parent.entity+'.'+obj.alias);

			for (let j = 0; j < obj.fields.length; j++) {
				if (obj.fields[j].indexOf('f_') != 0)
					continue;
				options.push({
					codename: !codename ? obj.fields[j] : codename+'.'+obj.fields[j],
					traduction: traduction + separator + __('entity.'+obj.entity+'.'+obj.fields[j]), // Append field to traduction Ex: 'Ticket > Participants > Adresse > Ville'
					target: obj.entity,
					isEmail: obj.email_fields.indexOf(obj.fields[j]) != -1,
					isPhone: obj.phone_fields.indexOf(obj.fields[j]) != -1,
					isFile: obj.file_fields.indexOf(obj.fields[j]) != -1
				});
			}

			for (let i = 0; i < obj.children.length; i++)
				dive(obj.children[i], !codename ? obj.children[i].alias : codename+'.'+obj.children[i].alias, obj, traduction);
		}

		// Build options array
		dive(entityTree);

		// Sort options array
		// loopCount is used to avoid "Maximum call stack exedeed" error with large arrays.
		// Using setTimeout (even with 0 milliseconds) will end the current call stack and create a new one.
		// Even with 0 milliseconds timeout execution can be realy slower, so we reset call stack once every 1000 lap
		function stackProtectedRecursion(sortFunc, ...args) {
			if (!this.loopCount)
				this.loopCount = 0;
			this.loopCount++;
			if (this.loopCount % 1000 === 0) {
				this.loopCount = 0;
				return setTimeout(() => {sortFunc(...args);}, 0);
			}
			return sortFunc(...args);
		}
		function swap(arr, i, j) {
			const tmp = arr[j];
			arr[j] = arr[i];
			arr[i] = tmp;
		}
		function sort(array, idx = 0) {
			if (idx < 0) idx = 0;
			if (!array || !array[idx+1])
				return;

			const first = array[idx].traduction.split(separator);
			const second = array[idx+1].traduction.split(separator);

			// Swap because of depth difference
			if (first.length > second.length) {
				swap(array, idx, idx+1);
				idx--;
			}
			else if (first.length == second.length) {
				// Dive depth until mismatch
				const initialIdx = idx;
				for (let i = 0; i < first.length; i++) {
					if (first[i] > second[i]) {
						swap(array, idx, idx+1);
						idx--;
						break;
					}
					else if (first[i] < second[i]) {
						idx++;
						break;
					}
				}
				// Avoid infinite loop if both traduction are equal
				if (initialIdx == idx)
					idx++;
			}
			else
				idx++;

			stackProtectedRecursion(sort, array, idx);
		}
		sort(options);

		return options;
	},
	// Build sequelize formated include object from tree
	buildIncludeFromTree: function (entityTree) {
		const includes = [];
		for (let i = 0; entityTree.children && i < entityTree.children.length; i++) {
			const include = {};
			const child = entityTree.children[i];
			include.as = child.alias;
			include.model = models[child.entity.charAt(0).toUpperCase() + child.entity.toLowerCase().slice(1)];
			if (child.children && child.children.length != 0)
				include.include = this.buildIncludeFromTree(child);

			includes.push(include);
		}
		return includes;
	},
	// Build array of user target for media_notification insertion <select>
	getUserTargetList: (entityTree, lang) => {
		const __ = language(lang).__;
		entityTree.topLevel = true;
		const userList = [];
		function dive(obj, parent = null) {
			if (obj.entity == "e_user") {
				userList.push({
					traduction: __("entity."+parent.entity+"."+obj.alias),
					field: "{" + (parent == null || parent.topLevel ? obj.alias : parent.alias+'.'+obj.alias) + "}"
				});
			}
			else
				for (let i = 0; i < obj.children.length; i++)
					dive(obj.children[i], obj)
		}
		dive(entityTree);
		return userList;
	},
	entityStatusFieldList: function() {
		const self = this;
		const entities = [];
		fs.readdirSync(__appPath + '/models/attributes').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json').forEach(file => {
			const entityName = file.slice(0, -5);
			const attributesObj = JSON.parse(fs.readFileSync(__appPath + '/models/attributes/'+file));
			const statuses = self.statusFieldList(attributesObj);
			if (statuses.length > 0) {
				for (let i = 0; i < statuses.length; i++)
					statuses[i] = {status: statuses[i], statusTrad: 'entity.'+entityName+'.'+statuses[i]};
				entities.push({entity: entityName, entityTrad: 'entity.'+entityName+'.label_entity', statuses: statuses});
			}
		});

		// return value example: [{
		//	 entity: 'e_test',
		//	 entityTrad: 'entity.e_test.label_entity',
		//	 statuses: [{
		//		 status: 's_status',
		//		 statusTrad: 'entity.e_test.s_status'
		//	 }]
		// }];
		return entities;
	},
	statusFieldList: (attributes) => {
		const list = [];
		for (const prop in attributes)
			if (prop.indexOf('s_') == 0)
				list.push(prop);
		return list;
	},
	translate:  function (entity, attributes, lang) {
		const self = this;
		const statusList = self.statusFieldList(attributes);

		for (let i = 0; i < statusList.length; i++) {
			const statusAlias = 'r_'+statusList[i].substring(2);
			if (!entity[statusAlias] || !entity[statusAlias].r_translations)
				continue;
			for (let j = 0; j < entity[statusAlias].r_translations.length; j++) {
				if (entity[statusAlias].r_translations[j].f_language == lang) {
					entity[statusAlias].f_name = entity[statusAlias].r_translations[j].f_value;
					break;
				}
			}
		}
	},
	getTextColor: function (color) {
		const wht = '#ffffff';
		const blk = '#000000';

		function hexToRgb(hexValue) {
			const hex = hexValue.substring(1).match(/.{1,2}/g);
			const rgb = [
				parseInt(hex[0], 16),
				parseInt(hex[1], 16),
				parseInt(hex[2], 16)
			];
			return rgb;
		}

		const luminance = (r, g, b) => {
			const [lumR, lumG, lumB] = [r, g, b].map(component => {
				const proportion = component / 255;

				return proportion <= 0.03928
					? proportion / 12.92
					: Math.pow((proportion + 0.055) / 1.055, 2.4);
			});

			return 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB;
		}

		const contrastRatio = (luminance1, luminance2) => {
			const lighterLum = Math.max(luminance1, luminance2);
			const darkerLum = Math.min(luminance1, luminance2);

			return (lighterLum + 0.05) / (darkerLum + 0.05);
		}

		const backColorLum = luminance(...hexToRgb(color));
		const whiteLum = luminance(255, 255, 255);
		const blackLum = luminance(0, 0, 0);
		const ratioW = contrastRatio(whiteLum, backColorLum);
		const ratioB = contrastRatio(blackLum, backColorLum);

		return ratioW > ratioB ? wht : blk;
	}
}
