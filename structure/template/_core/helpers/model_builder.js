const bcrypt = require('bcrypt');
const validators = require('@core/models/validators')
const file_helper = require('@core/helpers/file');

// TODO: This should't be needed. Prototype additions not defined here for some reason...
require('@core/utils/string_prototype');

// Parse each entity's fields and check if validation is required
// Get validator and modify attributes object so sequelize can handle validation
exports.attributesValidation = (attributes) => {
	for (let field in attributes) {
		field = attributes[field];
		let validation;
		if (field.validate == true && (validation = validators(field)))
			field.validate = validation;
		else
			delete field.validate;
	}
}

// PARAMETERS:
//  models: require('models/')
//  headEntity: The entity on which include will be used.
//			  Ex: 'e_user'
//  fieldsArray: An array of the relations that will be used and need to be included.
//  It can either be a string representing the relation's path, or an object{path: '', options:{}} where options can have any sequelize valid options
//			  Ex: [
//				'r_project.r_ticket',
//				'r_user.r_children.r_parent',
//				{
//					path: 'r_user.r_children.r_grandparent',
//					options: {
//						required: true,
//						where: {id: 42},
//						attributes: ['id', 'f_name']
//					}
//				}]
// RETURN:
//  Returns a sequelize valid include object.
//			  Ex: [{model: E_project, as:'r_project'}, {model: E_user, as:'r_user', include: [{model: E_user, as:'r_children'}]}}]
exports.getIncludeFromFields = (models, headEntity, fieldsArray) => {
	const upperLevelInclude = [];

	function buildInclude(currentEntity, include, depths, options = false) {
		const entityOptions = require('@app/models/options/' + currentEntity.toLowerCase()); // eslint-disable-line

		for (let j = 0; j < entityOptions.length; j++) {
			if (entityOptions[j].as == depths[0]) {
				// If include for current depth exists, fill the same object
				for (let i = 0; i < include.length; i++)
					if (include[i].as == depths[0]) {
						if (depths.length == 1)
							include[i] = {...include[i], ...options};
						return buildInclude(entityOptions[j].target, include[i].include, depths.slice(1), options);
					}

				// Uppercase target's first letter to build model name. This is necessary because of component `C`_adresse
				const modelPrefix = entityOptions[j].target.charAt(0).toUpperCase() + '_';
				// If include for current depth doesn't exists, create it and send include array to recursive buildInclude
				let depthInclude = {
					model: models[modelPrefix + entityOptions[j].target.slice(2)],
					as: depths[0],
					include: [],
					duplicating: false
				}
				if (depths.length == 1)
					depthInclude = {...depthInclude, ...options};
				else
					buildInclude(entityOptions[j].target, depthInclude.include, depths.slice(1), options);
				return include.push(depthInclude)
			}
		}
	}

	for (let i = 0; i < fieldsArray.length; i++) {
		const current = fieldsArray[i];

		if(!current || current == '')
			continue;

		let depths, options;
		if (typeof current === 'string')
			depths = current.split('.');
		else if (current.path) {
			depths = current.path.split('.');
			options = current.options;
		}
		else {
			console.error('Invalid include parameter');
			console.error(current);
			continue;
		}

		buildInclude(headEntity, upperLevelInclude, depths, options);
	}

	return upperLevelInclude;
}

// Used by filter_datatable and `/subdatalist` to build search query object
exports.formatSearch = (column, searchValue, type) => {
	let formatedSearch = {};
	const models = require('@app/models'); // eslint-disable-line
	const dialect = models.sequelize.options.dialect;

	switch(type){
		case 'datetime':
			if (searchValue.indexOf(' ') != -1)
				formatedSearch[models.$between] = [searchValue, searchValue];
			else
				formatedSearch[models.$between] = [searchValue + ' 00:00:00', searchValue + ' 23:59:59'];
			break;
		case 'date':
			formatedSearch[models.$between] = [searchValue + ' 00:00:00', searchValue + ' 23:59:59'];
			break;
		case 'boolean':
			switch(searchValue){
				case 'null':
					formatedSearch = null;
					break;
				case 'checked':
					formatedSearch = true;
					break;
				case 'unchecked':
					formatedSearch = false;
					break;
				default:
					formatedSearch = null;
					break;
			}
			break;
		case 'currency':
			if(dialect == 'postgres') {
				formatedSearch = {
					[models.$iLike]: '%' + searchValue + '%'
				};
			} else {
				formatedSearch = models.Sequelize.where(models.Sequelize.col(column), {
					[models.$like]: searchValue + '%'
				});
			}
			break;
		default:
			formatedSearch = {
				[models.$like]: '%' + searchValue + '%'
			};
			break;
	}

	let field = column;
	const searchLine = {};
	if (field.indexOf('.') != -1)
		field = `$${field}$`;

	searchLine[field] = formatedSearch;
	return searchLine;
}

// Parse html form body to extract known fields and associations
// PARAMETERS:
//	attributes: entity attributes
//	options: entity options
//	body: request body
// RETURN:
//	Returns an array of three values [fieldObject, associationArray, fileArray] :
//		fieldObject: Entity create/update object built from body
//		associationArray: An array of association that need to be updated. Contains alias function, association ids, and association option
//			[{func: "setR_user", data: [42, 84], option: relationOption}]
//		fileArray: Array of file to create/delete
//			[{...multer.file, isPicture: bool, isModified: bool, attribute: string, finalPath: string}]
exports.parseBody = (e_entity, attributes, options, body, multerFiles = []) => {
	const object = {}, associations = [], files = [];

	for (const attribute in attributes) {
		// Files
		if (["file", "picture"].includes(attributes[attribute].nodeaType)) {
			const file = {
				isPicture: attributes[attribute].nodeaType === 'picture',
				isModified: body[attribute + '_modified'] && body[attribute + '_modified'] === "true",
				attribute
			};
			// No file in body for this attribute, but file input changed. File has been removed
			if (!multerFiles || !multerFiles[attribute] && file.isModified) {
				files.push(file);
				object[attribute] = null;
			}
			// File in body for this attribute, create file's final path
			else if (multerFiles[attribute]) {
				const [filePath, filename] = file_helper.createPathAndName(e_entity, multerFiles[attribute][0].originalname);
				const finalPath = filePath + filename;
				files.push({
					...file,
					...multerFiles[attribute][0],
					finalPath
				});
				object[attribute] = finalPath;
			}
		}

		// Fields
		if (attribute === 'id' || typeof body[attribute] === 'undefined')
			continue;

		if (body[attribute] == "")
			body[attribute] = null;
		object[attribute] = body[attribute];

		if (body[attribute] != null && !!attributes[attribute].nodeaType) {
			// We encryt all password attributes
			if (attributes[attribute].nodeaType === "password")
				object[attribute] = bcrypt.hashSync(body[attribute], 10); // 10 is saltRounds - See bcrypt doc
		}
	}

	// Associations
	for (const option of options) {
		const association = option.as;
		const foreignKey = option.foreignKey.toLowerCase();

		let associationValue;
		if (typeof body[association] !== 'undefined')
			associationValue = body[association];
		else if (typeof body[foreignKey] !== 'undefined')
			associationValue = parseInt(body[foreignKey]);
		else
			continue;

		// Directly set the foreignKey to object for belongsTo
		if (option.relation === 'belongsTo') {
			if (associationValue == "")
				associationValue = null;
			object[foreignKey] = associationValue;
		}
		// Find other associations and store informations
		else {
			const target = option.as.charAt(0).toUpperCase() + option.as.toLowerCase().slice(1);
			const value = [];

			// If just one value in select2, then it give a string, not an array
			// Empty string is not accepted by postgres, .length will check for non empty associationValue string or array
			if(associationValue.length > 0) {
				if(typeof associationValue == "string")
					value.push(parseInt(associationValue))
				else if(Array.isArray(associationValue))
					value.push(...associationValue.map(val => parseInt(val)));
			}

			associations.push({
				func: 'set' + target,
				value: value,
				option: option
			});
		}
	}

	return [object, associations, files];
}

// Convert attribute.json file to correct sequelize model descriptor
exports.buildSequelizeAttributes = (DataTypes, attributes, recursionLevel = 0) => {
	const object = {};
	let validator;
	for (const prop in attributes) {
		const attrDef = attributes[prop];
		if (typeof attrDef === 'object' && attrDef != null) {
			if (attrDef.type == 'ENUM')
				object[prop] = DataTypes.ENUM(attrDef.values);
			else
				object[prop] = this.buildSequelizeAttributes(DataTypes, attrDef, recursionLevel+1);
		}
		else if (typeof attrDef === 'string' && prop != 'nodeaType')
			object[prop] = DataTypes[attrDef];
		else
			object[prop] = attrDef;
		// Validator
		if (recursionLevel == 0 && attrDef.validate === true && (validator = validators(attrDef)))
			object[prop].validate = validator;
	}

	return object;
}

// Register association between sequelize models from options.json file.
// ex: {target: 'e_entityb', relation: 'hasMany'} -> models.E_entitya.hasMany(E_entityb);
exports.buildSequelizeAssociations = (models, modelName, options) => {
	for (const association of options) {
		const modelOptions = {
			allowNull: true,
			...association
		};
		models[modelName][association.relation](models[association.target.capitalizeFirstLetter()], modelOptions);
	}
}

/** Param hooks expected format :
 * {
 *   'hookName': {
 *     type: 'beforeCreate', // Sequelize hook type
 *     func: (model, args) => {}
 *   }
 * }
 */
exports.buildSequelizeHooks = (sequelizeModel, hooks) => {
	for (const hookName in hooks) {
		const {type, func} = hooks[hookName];
		sequelizeModel.addHook(type, hookName, func);
	}
}
