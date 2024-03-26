const fs = require("fs-extra");
const domHelper = require('../helpers/js_dom');
const translateHelper = require("../utils/translate");
const dataHelper = require("../utils/data_helper");
const fieldHelper = require("../helpers/field");

exports.setupField = async (data) => {

	const workspacePath = __dirname + '/../workspace/' + data.application.name;
	const entity_name = data.entity.name;
	let field_type = "string",
		field_values;
	/* ----------------- 1 - Initialize variables according to options ----------------- */
	const options = data.options;
	const field_name = options.value;
	let defaultValue = null;
	let defaultValueForOption = null;

	if (typeof options.defaultValue !== "undefined" && options.defaultValue != null)
		defaultValue = options.defaultValue;

	// If there is a WITH TYPE in the instruction
	if (typeof options.type !== "undefined")
		field_type = options.type;

	// Cut allValues for ENUM or other type
	if (typeof options.allValues !== "undefined") {
		const values = options.allValues;
		if (values.indexOf(",") != -1) {
			field_values = values.split(",");
			for (let j = 0; j < field_values.length; j++)
				field_values[j] = field_values[j].trim();
		} else {
			throw new Error('structure.field.attributes.noSpace');
		}

		const sameResults_sorted = field_values.slice().sort();
		const sameResults = [];
		for (let i = 0; i < field_values.length - 1; i++)
			if (sameResults_sorted[i + 1] == sameResults_sorted[i])
				sameResults.push(sameResults_sorted[i]);

		if (sameResults.length > 0)
			throw new Error('structure.field.attributes.noSpace');

		// Clean empty value
		if(field_values.length > 0)
			field_values = field_values.filter(x => x != '');
	}

	/* ----------------- 2 - Update the entity model, add the attribute ----------------- */

	// attributes.json
	const attributesFileName = workspacePath + '/app/models/attributes/' + entity_name + '.json';
	const attributesObject = JSON.parse(fs.readFileSync(attributesFileName));

	// toSync.json
	const toSyncFileName = workspacePath + '/app/models/toSync.json';
	const toSyncObject = JSON.parse(fs.readFileSync(toSyncFileName));

	if (typeof toSyncObject[entity_name] === "undefined")
		toSyncObject[entity_name] = {
			attributes: {}
		};
	else if (typeof toSyncObject[entity_name].attributes === "undefined")
		toSyncObject[entity_name].attributes = {};

	let sql_type = "STRING", type_parameter = null;
	switch (field_type) {
		case "password":
		case "color":
		case "url":
		case "email":
		case "phone":
		case "fax":
		case "file":
		case "picture":
		case "qrcode":
		case "barcode":
			sql_type = "STRING";
			break;
		case "number":
			sql_type = "INTEGER";
			break;
		case "big number":
			sql_type = "BIGINT";
			break;
		case "decimal":
			sql_type = "DECIMAL";
			type_parameter = "14,4";
			break;
		case "currency":
			sql_type = "DECIMAL";
			type_parameter = "10,2";
			break;
		case "date":
		case "datetime":
			sql_type = "DATE";
			break;
		case "time":
			sql_type = "TIME";
			break;
		case "boolean":
			sql_type = "BOOLEAN";
			break;
		case "radio":
		case "enum":
			sql_type = "ENUM";
			break;
		case "text":
		case "regular text":
			sql_type = "TEXT";
			break;
		default:
			sql_type = "STRING";
			break;
	}

	// Default value managment
	if (typeof options.defaultValue !== "undefined" && options.defaultValue != null) {
		if (sql_type == "STRING" || sql_type == "TEXT" || sql_type == "ENUM")
			defaultValueForOption = options.defaultValue;
		else if (sql_type == "INTEGER" && !isNaN(options.defaultValue))
			defaultValueForOption = options.defaultValue;
		else if (sql_type == "BOOLEAN") {
			if (["true", "vrai", "1", "checked", "coché", "à coché"].indexOf(defaultValue.toLowerCase()) != -1)
				defaultValueForOption = true;
			else if (["false", "faux", "0", "unchecked", "non coché", "à non coché"].indexOf(defaultValue.toLowerCase()) != -1)
				defaultValueForOption = false;
		}
	}

	const cleanEnumValues = [], cleanRadioValues = [];
	if (field_type == "enum") {
		// Remove all special caractere for all enum values
		if (typeof field_values === "undefined")
			throw new Error('structure.field.attributes.missingValues');

		for (let i = 0; i < field_values.length; i++)
			cleanEnumValues[i] = dataHelper.clearString(field_values[i]);

		attributesObject[field_name] = {
			"type": sql_type,
			"values": cleanEnumValues,
			"nodeaType": "enum",
			"defaultValue": defaultValueForOption ? dataHelper.clearString(defaultValueForOption) : defaultValueForOption
		};
		toSyncObject[entity_name].attributes[field_name] = {
			"type": sql_type,
			"values": cleanEnumValues,
			"nodeaType": "enum",
			"defaultValue": defaultValueForOption ? dataHelper.clearString(defaultValueForOption) : defaultValueForOption
		};
	} else if (field_type == "radio") {
		// Remove all special caractere for all enum values
		if (typeof field_values === "undefined")
			throw new Error('structure.field.attributes.missingValues');

		for (let i = 0; i < field_values.length; i++)
			cleanRadioValues[i] = dataHelper.clearString(field_values[i]);

		attributesObject[field_name] = {
			"type": sql_type,
			"values": cleanRadioValues,
			"nodeaType": "enum",
			"defaultValue": defaultValueForOption ? dataHelper.clearString(defaultValueForOption) : defaultValueForOption
		};
		toSyncObject[entity_name].attributes[field_name] = {
			"type": sql_type,
			"values": cleanRadioValues,
			"nodeaType": "enum",
			"defaultValue": defaultValueForOption ? dataHelper.clearString(defaultValueForOption) : defaultValueForOption
		};
	} else if (["text", "texte", "regular text", "texte standard"].indexOf(field_type) != -1) {
		// No DB default value for type text, mysql do not handling it.
		attributesObject[field_name] = {
			"type": sql_type,
			"nodeaType": field_type
		};
		toSyncObject[entity_name].attributes[field_name] = {
			"type": sql_type,
			"nodeaType": field_type
		}
	} else {
		attributesObject[field_name] = {
			"type": sql_type,
			"nodeaType": field_type,
			"defaultValue": defaultValueForOption
		};
		toSyncObject[entity_name].attributes[field_name] = {
			"type": sql_type,
			"nodeaType": field_type,
			"defaultValue": defaultValueForOption
		}
	}

	if(type_parameter)
		attributesObject[field_name].type_parameter = type_parameter;

	// Add default "validate" property to true, setting to false will disable sequelize's validation on the field
	attributesObject[field_name].validate = true;
	// We allow null by default for all attributes
	attributesObject[field_name].allowNull = true;
	fs.writeFileSync(attributesFileName, JSON.stringify(attributesObject, null, '\t'));
	fs.writeFileSync(toSyncFileName, JSON.stringify(toSyncObject, null, '\t'));

	// Translation for enum and radio values
	if (field_type == "enum") {
		const fileEnum = workspacePath + '/app/locales/enum_radio.json';
		const enumData = JSON.parse(fs.readFileSync(fileEnum));
		let json = {};
		if (enumData[entity_name])
			json = enumData[entity_name];
		json[field_name] = [];
		for (let i = 0; i < field_values.length; i++) {
			json[field_name].push({
				value: cleanEnumValues[i],
				translations: {
					"fr-FR": field_values[i],
					"en-EN": field_values[i]
				}
			});
		}
		enumData[entity_name] = json;
		// Write Enum file
		fs.writeFileSync(fileEnum, JSON.stringify(enumData, null, '\t'));
	}

	// Translation for radio values
	if (field_type == "radio") {
		const fileRadio = workspacePath + '/app/locales/enum_radio.json';
		const radioData = JSON.parse(fs.readFileSync(fileRadio));
		let json = {};
		if (radioData[entity_name])
			json = radioData[entity_name];
		json[field_name] = [];
		for (let i = 0; i < field_values.length; i++)
			json[field_name].push({
				value: cleanRadioValues[i],
				translations: {
					"fr-FR": field_values[i],
					"en-EN": field_values[i]
				}
			});
		radioData[entity_name] = json;

		// Write Enum file
		fs.writeFileSync(fileRadio, JSON.stringify(radioData, null, '\t'));
	}

	/* ----------------- 4 - Add the fields in all the views  ----------------- */
	const fileBase = workspacePath + '/app/views/' + entity_name;

	const filePromises = [];
	/* show_fields.dust file with a disabled input */
	const htmlFieldData = {
		type: field_type,
		givenType: data.options.givenType || null,
		field: field_name,
		entity: entity_name,
		values: field_values,
		defaultValue: defaultValue
	};
	let field_html = fieldHelper.getFieldHtml(htmlFieldData, true, "show");
	filePromises.push(fieldHelper.updateFile(fileBase, "show_fields", field_html));

	/* create_fields.dust */
	field_html = fieldHelper.getFieldHtml(htmlFieldData, false, "create");
	filePromises.push(fieldHelper.updateFile(fileBase, "create_fields", field_html));

	/* update_fields.dust */
	field_html = fieldHelper.getFieldHtml(htmlFieldData, false, "update");
	filePromises.push(fieldHelper.updateFile(fileBase, "update_fields", field_html));

	/* list_fields.dust */
	field_html = fieldHelper.getFieldInHeaderListHtml(field_name, entity_name, field_type);
	filePromises.push(fieldHelper.updateListFile(fileBase, "list_fields", field_html.headers));

	await Promise.all(filePromises);

	// Field application locales
	await translateHelper.writeLocales(data.application.name, "field", entity_name, [field_name, data.options.showValue], data.googleTranslate);

	return field_type;
}

exports.setRequiredAttribute = async (data) => {

	// Update the Sequelize attributes.json to set allowNull
	const pathToAttributesJson = __dirname + '/../workspace/' + data.application.name + '/app/models/attributes/' + data.entity_name + ".json";
	const attributesObj = JSON.parse(fs.readFileSync(pathToAttributesJson, "utf8"));

	const possibilityRequired = ["mandatory", "required", "obligatoire"];
	const possibilityOptionnal = ["optionnel", "non-obligatoire", "optional"];

	const attribute = data.options.word.toLowerCase();
	let set = false;
	if (possibilityRequired.indexOf(attribute) != -1)
		set = true;
	else if (possibilityOptionnal.indexOf(attribute) != -1)
		set = false;
	else
		throw new Error('structure.field.attributes.notUnderstand');

	const pathToViews = global.__workspacePath + '/' + data.application.name + '/app/views/' + data.entity_name;

	// Update create_fields.dust file
	let $ = await domHelper.read(pathToViews + '/create_fields.dust');

	if ($("*[data-field='" + data.options.value + "']").length == 0) {
		const err = new Error('structure.field.attributes.fieldNoFound');
		err.messageParams = [data.options.showValue];
		throw err;
	}

	if (set)
		$("*[data-field='" + data.options.value + "']").find('label:first').addClass('required');
	else
		$("*[data-field='" + data.options.value + "']").find('label:first').removeClass('required');

	if(data.structureType == "relatedToMultipleCheckbox"){
		$("*[data-field='" + data.options.value + "']").find('.relatedtomany-checkbox').data('required', set);
	} else {
		$("*[data-field='" + data.options.value + "']").find('input').not("[type='hidden']").prop('required', set);
		$("*[data-field='" + data.options.value + "']").find('textarea').prop('required', set);
		$("*[data-field='" + data.options.value + "']").find('select').prop('required', set);
	}

	domHelper.write(pathToViews + '/create_fields.dust', $);

	// Update update_fields.dust file
	$ = await domHelper.read(pathToViews + '/update_fields.dust');
	if (set)
		$("*[data-field='" + data.options.value + "']").find('label:first').addClass('required');
	else
		$("*[data-field='" + data.options.value + "']").find('label:first').removeClass('required');

	if(data.structureType == "relatedToMultipleCheckbox"){
		$("*[data-field='" + data.options.value + "']").find('.relatedtomany-checkbox').data('required', set);
	} else if(!attributesObj[data.options.value] || attributesObj[data.options.value].nodeaType != 'file') {
		// Do not set require input[type=file] in update, it is not possible to prefilled input type file for security reasons
		$("*[data-field='" + data.options.value + "']").find('input').prop('required', set);
		$("*[data-field='" + data.options.value + "']").find('textarea').prop('required', set);
		$("*[data-field='" + data.options.value + "']").find('select').prop('required', set);
	}

	domHelper.write(pathToViews + '/update_fields.dust', $);

	if (attributesObj[data.options.value]) {

		// Alter column to set default value in DB if models already exist
		const jsonPath = __dirname + '/../workspace/' + data.application.name + '/app/models/toSync.json';
		const toSync = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
		if (typeof toSync.queries === "undefined")
			toSync.queries = [];

		const tableName = data.entity_name;
		let length = "";
		if (data.sqlDataType == "varchar")
			length = "(" + data.sqlDataTypeLength + ")";

		let defaultValue = null;
		// Set required
		if (set) {

			// TODO: Handle allowNull: false field in user, role, group to avoid error during autogeneration
			// In script you can set required a field in user, role or group but it crash the user admin autogeneration
			// because the required field is not given during the creation
			if (data.entity_name != "e_user" && data.entity_name != "e_role" && data.entity_name != "e_group")
				attributesObj[data.options.value].allowNull = false;

			switch (attributesObj[data.options.value].type) {
				case "TEXT":
					defaultValue = "";
					break;
				case "STRING":
					defaultValue = "";
					break;
				case "ENUM":
					// Set the first value of enum as default value
					defaultValue = attributesObj[data.options.value].values[0];
					break;
				case "INTEGER":
				case "BIGINT":
				case "DECIMAL":
				case "BOOLEAN":
				case "FLOAT":
				case "DOUBLE":
					defaultValue = 0;
					break;
				case "DATE":
					defaultValue = "1900-01-01 00:00:00.000";
					break;
				case "TIME":
					defaultValue = "00:00:00.0000000";
					break;
				default:
					defaultValue = "";
					break;
			}

			attributesObj[data.options.value].defaultValue = defaultValue;

			if (data.sqlDataType && (data.dialect == "mysql" || data.dialect == "mariadb")) {
				// Update all NULL value before set not null
				toSync.queries.push("UPDATE `" + tableName + "` SET `" + data.options.value + "`='" + defaultValue + "' WHERE `" + data.options.value + "` IS NULL;");
				toSync.queries.push("ALTER TABLE `" + tableName + "` CHANGE `" + data.options.value + "` `" + data.options.value + "` " + data.sqlDataType + length + " NOT NULL");
				if(defaultValue)
					toSync.queries.push("ALTER TABLE `" + tableName + "` ALTER `" + data.options.value + "` SET DEFAULT '" + defaultValue + "';");
			} else if(data.dialect == "postgres") {
				toSync.queries.push('UPDATE "' + tableName + '" SET "' + data.options.value + '"=\'' + defaultValue + '\' WHERE "' + data.options.value + '" IS NULL;');
				toSync.queries.push('ALTER TABLE "' + tableName + '" ALTER COLUMN "' + data.options.value + '" SET NOT NULL');
				if(defaultValue)
					toSync.queries.push('ALTER TABLE "' + tableName + '" ALTER COLUMN "' + data.options.value + '" SET DEFAULT ' + defaultValue + ';');
			}
		} else {
			// Set optional
			attributesObj[data.options.value].allowNull = true;

			// No default value for TEXT type
			if(attributesObj[data.options.value].type != 'TEXT')
				attributesObj[data.options.value].defaultValue = null;

			if (data.sqlDataType && (data.dialect == "mysql" || data.dialect == "mariadb")) {
				toSync.queries.push("ALTER TABLE `" + tableName + "` CHANGE `" + data.options.value + "` `" + data.options.value + "` " + data.sqlDataType + length + " NULL");
				if(attributesObj[data.options.value].type != 'TEXT')
					toSync.queries.push("ALTER TABLE `" + tableName + "` ALTER `" + data.options.value + "` SET DEFAULT NULL;");
			} else if(data.dialect == "postgres") {
				toSync.queries.push('ALTER TABLE "' + tableName + '" ALTER COLUMN "' + data.options.value + '" DROP NOT NULL');
			}
		}
		fs.writeFileSync(jsonPath, JSON.stringify(toSync, null, '\t'));
		fs.writeFileSync(pathToAttributesJson, JSON.stringify(attributesObj, null, '\t'));
	} else {
		// If not in attributes, maybe in options
		const pathToOptionJson = __dirname + '/../workspace/' + data.application.name + '/app/models/options/' + data.entity_name + ".json";
		const optionsObj = JSON.parse(fs.readFileSync(pathToOptionJson, "utf8"));
		const aliasValue = "r_" + data.options.value.substring(2);
		for (let i = 0; i < optionsObj.length; i++)
			if (optionsObj[i].as == aliasValue)
				optionsObj[i].allowNull = set;

		// Save option
		fs.writeFileSync(pathToOptionJson, JSON.stringify(optionsObj, null, '\t'));
	}

	return;
}

exports.setUniqueField = (data) => {

	const possibilityUnique = ["unique"];
	const possibilityNotUnique = ["not-unique", "non-unique"];

	const attribute = data.options.word.toLowerCase();
	let set = false;
	if (possibilityUnique.indexOf(attribute) != -1)
		set = true;
	else if (possibilityNotUnique.indexOf(attribute) != -1)
		set = false;
	else
		throw new Error('structure.field.attributes.notUnderstand');

	// Update the Sequelize attributes.json to set unique
	const pathToAttributesJson = global.__workspacePath + '/' + data.application.name + '/app/models/attributes/' + data.entity_name + ".json";
	const attributesContent = fs.readFileSync(pathToAttributesJson);
	const attributesObj = JSON.parse(attributesContent);

	// If the current field is an fk field then we won't find it in attributes.json
	if (typeof attributesObj[data.options.value] !== "undefined")
		attributesObj[data.options.value].unique = set;
	fs.writeFileSync(pathToAttributesJson, JSON.stringify(attributesObj, null, '\t'));

	return;
}

exports.setFieldAttribute = async (data) => {

	const targetField = data.options.value;
	const word = data.options.word.toLowerCase();
	const attributeValue = data.options.attributeValue.toLowerCase();
	const pathToViews = __dirname + '/../workspace/' + data.application.name + '/app/views/' + data.entity.name;

	// Update create_fields.dust file
	let $ = await domHelper.read(pathToViews + '/create_fields.dust');
	if ($("*[data-field='" + targetField + "']").length > 0) {

		$("*[data-field='" + targetField + "']").find('input').attr(word, attributeValue);
		$("*[data-field='" + targetField + "']").find('select').attr(word, attributeValue);

		domHelper.write(pathToViews + '/create_fields.dust', $);

		// Update update_fields.dust file
		$ = await domHelper.read(pathToViews + '/update_fields.dust');

		$("*[data-field='" + targetField + "']").find('input').attr(word, attributeValue);
		$("*[data-field='" + targetField + "']").find('select').attr(word, attributeValue);

		domHelper.write(pathToViews + '/update_fields.dust', $);
	} else {
		const err = new Error('structure.field.attributes.fieldNoFound');
		err.messageParams = [data.options.showValue];
		throw err;
	}
	return true;
}

const DUST_FILTERS = [
	"date",
	"datetime",
	"dateTZ",
	"datetimeTZ",
	"time",
	"filename",
	"urlencode",
	"htmlencode"
];

exports.setupRelatedToField = async (data) => {
	const target = data.options.target;
	const urlTarget = data.options.urlTarget;
	const source = data.source_entity.name;
	const alias = data.options.as;
	const urlAs = data.options.urlAs;

	// Check if field is used in select, default to id
	const usingField = data.options.usingField ? data.options.usingField : [{value: "id", type: "string"}];

	const usingList = [], usingOption = [];
	for (let i = 0; i < usingField.length; i++) {
		usingList.push(usingField[i].value);
		if(usingField[i].type == 'enum')
			usingOption.push('{' + usingField[i].value + '.translation}');
		else if (DUST_FILTERS.includes(usingField[i].type))
			usingOption.push('{' + usingField[i].value + '|' + usingField[i].type + '}');
		else
			usingOption.push('{' + usingField[i].value + '|h}');
	}

	// --- CREATE_FIELD ---
	let select = `
	<div data-field="f_${urlAs}" class="col-12">
		<div class="form-group">
			<label for="${alias}">
				<!--{#__ key="entity.${source}.${alias}" /}-->&nbsp;
				<!--{@inline_help field="${alias}"}-->
					<i data-entity="${source}" data-field="${alias}" class="inline-help fa fa-info-circle" style="color: #1085EE"></i>
				<!--{/inline_help}-->
			</label>
			<select class="ajax form-control" name="${alias}" data-source="${urlTarget}" data-using="${usingList.join(',')}" style="width: 100%;"></select>
		</div>
	</div>`;

	const fileBase = __dirname + '/../workspace/' + data.application.name + '/app/views/' + source;
	let file = 'create_fields';
	fieldHelper.updateFile(fileBase, file, select);

	// --- UPDATE_FIELD ---
	select = `
	<div data-field="f_${urlAs}" class="col-12">
		<div class="form-group">
			<label for="${alias}">
				<!--{#__ key="entity.${source}.${alias}" /}-->&nbsp;
				<!--{@inline_help field="${alias}"}-->
					<i data-entity="${source}" data-field="${alias}" class="inline-help fa fa-info-circle" style="color: #1085EE"></i>
				<!--{/inline_help}-->
			</label>
			<select class="ajax form-control" name="${alias}" data-source="${urlTarget}" data-using="${usingList.join(',')}" style="width: 100%;">
				<!--{#${alias}}-->
					<option value="{id}" selected>${usingOption.join(' - ')}</option>
				<!--{/${alias}}-->
			</select>
		</div>
	</div>`;

	file = 'update_fields';
	fieldHelper.updateFile(fileBase, file, select);

	// --- SHOW_FIELD ---
	// Add read only field in show file. No tab required

	// If enum it is necessary to show the translation and not the value in DB
	const value = usingField.map(field => {
		if(field.type == 'enum')
			return `{${alias}.${field.value}.translation}`;
		return `{${alias}.${field.value}}`;
	}).join(' - ');

	const showField = `
	<div data-field='f_${urlAs}' class='col-12'>
		<div class='form-group'>
			<label for='${alias}'>
				<!--{#__ key="entity.${source}.${alias}" /}-->&nbsp;
				<!--{@inline_help field="${alias}"}-->
					<i data-entity="${source}" data-field="${alias}" class="inline-help fa fa-info-circle" style="color: #1085EE"></i>
				<!--{/inline_help}-->
			</label>
			<input class='form-control input' name='${alias}' value='${value}' placeholder=__key=entity.${source}.${alias} type='text' readOnly />
		</div>
	</div>`;

	file = fileBase + '/show_fields.dust';
	if(fs.existsSync(file)){
		const $ = await domHelper.read(file);
		$("#fields").append(showField);
		domHelper.write(file, $)
	}

	/* ------------- Add new FIELD in list <thead> ------------- */
	// Do not display using field name when related to field when only one using field
	if (usingField.length == 1){
		const newHead = `
		<th data-field="${alias}" data-col="${alias}.${usingField[0].value}" data-type="${usingField[0].type}">
			<!--{#__ key="entity.${source}.${alias}"/}-->
		</th>`;
		fieldHelper.updateListFile(fileBase, "list_fields", newHead); // eslint-disable-line
	} else {
		for (let i = 0; i < usingField.length; i++) {
			const targetField = usingField[i].value;
			const newHead = `
			<th data-field="${alias}" data-col="${alias}.${usingField[i].value}" data-type="${usingField[i].type}">
				<!--{#__ key="entity.${source}.${alias}"/}-->&nbsp;-&nbsp;<!--{#__ key="entity.${target}.${targetField}"/}-->
			</th>`;
	
			fieldHelper.updateListFile(fileBase, "list_fields", newHead); // eslint-disable-line
		}
	}


	await translateHelper.writeLocales(data.application.name, "aliasfield", source, [alias, data.options.showAs], data.googleTranslate);
	return;
}

exports.setupRelatedToMultipleField = async (data) => {

	const urlTarget = data.options.urlTarget;
	const source = data.source_entity.name;
	const alias = data.options.as;
	const urlAs = data.options.urlAs;
	const fileBase = __dirname + '/../workspace/' + data.application.name + '/app/views/' + source;

	// Gestion du field à afficher dans le select du fieldset, par defaut c'est l'ID
	let usingField = [{value: "id", type: "string"}];

	if (typeof data.options.usingField !== "undefined")
		usingField = data.options.usingField;

	const usingList = [], usingOption = [];
	for (let i = 0; i < usingField.length; i++) {
		usingList.push(usingField[i].value);
		if(usingField[i].type == 'enum')
			usingOption.push('{' + usingField[i].value + '.translation}');
		else if (DUST_FILTERS.includes(usingField[i].type))
			usingOption.push('{' + usingField[i].value + '|' + usingField[i].type + '}');
		else
			usingOption.push('{' + usingField[i].value + '}');
	}

	// FIELD WRAPPER
	function wrapField(wrapped) {
		return `
			<div data-field="f_${urlAs}" class="col-12" ${data.options.isCheckbox ? 'style="margin-bottom: 25px;"' : ""}>
				<div class="form-group">
					<label for="f_${urlAs}">
						<!--{#__ key="entity.${source}.${alias}" /}-->
						<!--{@inline_help field="${alias}"}-->
							<i data-entity="${source}" data-field="${alias}" class="inline-help fa fa-info-circle" style="color: #1085EE"></i>
						<!--{/inline_help}-->
					</label>
					${wrapped}
				</div>
			</div>
		`;
	}

	// CREATE FIELD
	let createField;
	if (data.options.isCheckbox)
		createField = wrapField(`
			<br>
			<div class="relatedtomany-checkbox">
				<!--{#${alias}_all}-->
					<wrap>
						<label class="no-weight">
							<input type="checkbox" value="{id}" class="no-formatage" name="${alias}">&nbsp;&nbsp;${usingOption.join(' - ')}
						</label><br>
					</wrap>
				<!--{/${alias}_all}-->
			</div>
		`);
	else
		createField = wrapField(`
			<select multiple="multiple" class="ajax form-control" name="${alias}" data-source="${urlTarget}" data-using="${usingList.join(',')}" style="width: 100%;">
			</select>
		`);
	fieldHelper.updateFile(fileBase, 'create_fields', createField);

	// UPDATE_FIELD
	let updateField;
	if (data.options.isCheckbox)
		updateField = wrapField(`
			<div class="relatedtomany-checkbox">
				<!--{#${alias}_all}-->
					<!--{@existInContextById ofContext=${alias} key=id}-->
						<wrap><input type="checkbox" checked value="{id}" class="no-formatage" name="${alias}">&nbsp;&nbsp;${usingOption.join(' - ')}<br></wrap>
					<!--{:else}-->
						<wrap><input type="checkbox" value="{id}" class="no-formatage" name="${alias}">&nbsp;&nbsp;${usingOption.join(' - ')}<br></wrap>
					<!--{/existInContextById}-->
				<!--{/${alias}_all}-->
			</div>
		`);
	else
		updateField = wrapField(`
			<select multiple="" class="ajax form-control" name="${alias}" data-source="${urlTarget}" data-using="${usingList.join(',')}" style="width: 100%;">
				<option value="">{#__ key="select.default" /}</option>
				<!--{#${alias}}-->
					<option value="{id}" selected>${usingOption.join(' - ')}</option>
				<!--{/${alias}}-->
			</select>
		`);
	fieldHelper.updateFile(fileBase, 'update_fields', updateField);

	// SHOW_FIELD
	let showField;
	if (data.options.isCheckbox)
		showField = wrapField(`
			<div class="relatedtomany-checkbox">
				<!--{#${alias}_all}-->
					<!--{@existInContextById ofContext=${alias} key=id}-->
						<wrap><input type="checkbox" disabled="" checked="" name="${alias}">&nbsp;&nbsp;${usingOption.join(' - ')}<br></wrap>
					<!--{:else}-->
						<wrap><input type="checkbox" disabled="" name="${alias}">&nbsp;&nbsp;${usingOption.join(' - ')}<br></wrap>
					<!--{/existInContextById}-->
				<!--{/${alias}_all}-->
			</div>
		`);
	else
		showField = wrapField(`
			<select multiple disabled readonly class="form-control" name="${alias}" data-source="${urlTarget}" data-using="${usingList.join(',')}" style="width: 100%;">
				<!--{#${alias}}-->
					<option value="${usingOption.join(' - ')}" selected>${usingOption.join(' - ')}</option>
				<!--{/${alias}}-->
			</select>
		`);

	const file = fileBase + '/show_fields.dust';
	const $ = await domHelper.read(file);
	$("#fields").append(showField);
	domHelper.write(file, $);

	/* ------------- Add new FIELD in list <thead> ------------- */
	const newHead = `
	<th data-field="${alias}" data-col="${alias}" data-type="string" data-using="${usingList.join(',')}">
		<!--{#__ key="entity.${source}.${alias}"/}-->
	</th>`;

	fieldHelper.updateListFile(fileBase, "list_fields", newHead); // eslint-disable-line

	await translateHelper.writeLocales(data.application.name, "aliasfield", source, [alias, data.options.showAs], data.googleTranslate);
	return;
}

exports.deleteField = async (data) => {

	const workspacePath = __dirname + '/../workspace/' + data.application.name;
	const optionsPath = workspacePath + '/app/models/options/';
	const field = data.options.value;
	const url_value = data.options.urlValue;
	let isInOptions = false;
	const info = {};

	// Check if field is in options with relation=belongsTo, it means its a relatedTo association and not a simple field
	let jsonPath = optionsPath + data.entity.name + '.json';

	// Clear the require cache
	let dataToWrite = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
	const deletedOptionsTarget = [];
	for (let i = 0; i < dataToWrite.length; i++) {
		if (dataToWrite[i].as.toLowerCase() == "r_" + url_value) {
			if (dataToWrite[i].relation != 'belongsTo' && dataToWrite[i].structureType != "relatedToMultiple" && dataToWrite[i].structureType != "relatedToMultipleCheckbox")
				throw new Error(data.entity.name + " isn't a regular field. You might want to use 'delete tab' instruction.");

			// Modify the options.json file
			info.fieldToDrop = dataToWrite[i].foreignKey;
			info.isConstraint = true;

			// Related To Multiple
			if (dataToWrite[i].structureType == "relatedToMultiple" || dataToWrite[i].structureType == "relatedToMultipleCheckbox") {
				info.isMultipleConstraint = true;
				info.target = dataToWrite[i].target;
				info.fieldToDrop = dataToWrite[i].foreignKey + "_" + url_value;
			}

			deletedOptionsTarget.push(dataToWrite[i]);

			dataToWrite.splice(i, 1);
			isInOptions = true;
			break;
		}
	}

	// Nothing found in options, field is regular, modify the attributes.json file
	if (!isInOptions) {
		jsonPath = workspacePath + '/app/models/attributes/' + data.entity.name + '.json';
		dataToWrite = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

		delete dataToWrite[field];

		info.fieldToDrop = field;
		info.isConstraint = false;
	}

	// Look in option file for all concerned target to destroy auto_generate key no longer needed
	let targetOption, autoGenerateFound, targetJsonPath;
	for (let i = 0; i < deletedOptionsTarget.length; i++) {
		autoGenerateFound = false;
		targetJsonPath = workspacePath + '/app/models/options/' + deletedOptionsTarget[i].target + '.json';
		// If same entity then use the already handle option object
		if(deletedOptionsTarget[i].target == data.entity.name)
			targetOption = dataToWrite;
		else
			targetOption = JSON.parse(fs.readFileSync(targetJsonPath));
		for (let j = 0; j < targetOption.length; j++) {
			if(targetOption[j].structureType == "auto_generate" && targetOption[j].foreignKey == deletedOptionsTarget[i].foreignKey){
				targetOption.splice(j, 1);
				autoGenerateFound = true;
			}
		}
		if(autoGenerateFound)
			fs.writeFileSync(targetJsonPath, JSON.stringify(targetOption, null, '\t'), "utf8");
	}

	// Write back either options.json or attributes.json file
	fs.writeFileSync(jsonPath, JSON.stringify(dataToWrite, null, '\t'), "utf8");

	// Remove field from create/update/show views files
	const viewsPath = workspacePath + '/app/views/' + data.entity.name + '/';
	const fieldsFiles = ['create_fields', 'update_fields', 'show_fields'];
	let promises = [];
	for (let i = 0; i < fieldsFiles.length; i++)
		promises.push((async () => {
			const $ = await domHelper.read(viewsPath + '/' + fieldsFiles[i] + '.dust');
			$('*[data-field="' + field + '"]').remove();
			// In case of related to
			$('*[data-field="r_' + field.substring(2) + '"]').remove();
			domHelper.write(viewsPath + '/' + fieldsFiles[i] + '.dust', $);
		})());

	// Remove field from list view file
	promises.push((async () => {
		const $ = await domHelper.read(viewsPath + '/list_fields.dust');
		$("th[data-field='" + field + "']").remove();
		// In case of related to
		$("th[data-col^='r_" + field.substring(2) + ".']").remove();
		// In case of related to multiple
		$("th[data-col^='r_" + field.substring(2)+ "']").remove();
		domHelper.write(viewsPath + '/list_fields.dust', $);
	})());

	// Wait for all promises execution, first pass before continuing on option
	await Promise.all(promises);
	promises = [];

	const otherViewsPath = workspacePath + '/app/views/';
	const structureTypeWithUsing = ["relatedTo", "relatedToMultiple", "relatedToMultipleCheckbox", "hasManyPreset"];
	fieldsFiles.push("list_fields");
	// Looking for association with using of the deleted field
	fs.readdirSync(optionsPath).filter(file => file.indexOf('.json') != -1).forEach(file => {
		const currentOption = JSON.parse(fs.readFileSync(optionsPath + file, "utf8"));
		const currentEntity = file.split(".json")[0];
		let toSave = false;
		for (let i = 0; i < currentOption.length; i++) {
			// If the option match with our source entity
			if (structureTypeWithUsing.indexOf(currentOption[i].structureType) == -1 ||
				currentOption[i].target != data.entity.name ||
				typeof currentOption[i].usingField === "undefined")
				continue;

			// Check if our deleted field is in the using fields
			for (let j = 0; j < currentOption[i].usingField.length; j++) {
				if (currentOption[i].usingField[j].value != field)
					continue;

				for (let k = 0; k < fieldsFiles.length; k++) {
					// Clean file
					let content = fs.readFileSync(otherViewsPath + currentEntity + '/' + fieldsFiles[k] + '.dust', "utf8")
					content = content.replace(new RegExp(currentOption[i].as + "." + field, "g"), currentOption[i].as + ".id");
					content = content.replace(new RegExp(currentOption[i].target + "." + field, "g"), currentOption[i].target + ".id_entity");
					fs.writeFileSync(otherViewsPath + currentEntity + '/' + fieldsFiles[k] + '.dust', content);
					// Looking for select in create / update / show or th in list
					promises.push((async () => {
						const dustPath = otherViewsPath + currentEntity + '/' + fieldsFiles[k] + '.dust';
						const $ = await domHelper.read(dustPath);
						const el = $("select[name='" + currentOption[i].as + "'][data-source='" + currentOption[i].target.substring(2) + "']");

						if (el.length == 0)
							return;

						const using = el.attr("data-using").split(",");

						if (using.indexOf(field) == -1)
							return;

						// If using is alone, then replace with id, or keep just other using
						if (using.length == 1) {
							el.attr("data-using", "id")
						} else {
							using.splice(using.indexOf(field), 1)
							el.attr("data-using", using.join())
						}
						el.html(el.html().replace(new RegExp(field, "g"), "id"))
						domHelper.write(dustPath, $);
					})());
				}

				// Clean using
				currentOption[i].usingField.splice(j, 1);
				toSave = true;
				break;
			}
		}
		if (toSave)
			fs.writeFileSync(optionsPath + file, JSON.stringify(currentOption, null, '\t'), "utf8");
	});

	// Wait for all promises execution
	await Promise.all(promises);

	// Remove translation in enum locales
	const enumsPath = workspacePath + '/app/locales/enum_radio.json';
	const enumJson = JSON.parse(fs.readFileSync(enumsPath));

	if (typeof enumJson[data.entity.name] !== "undefined") {
		if (typeof enumJson[data.entity.name][info.fieldToDrop] !== "undefined") {
			delete enumJson[data.entity.name][info.fieldToDrop];
			fs.writeFileSync(enumsPath, JSON.stringify(enumJson, null, '\t'));
		}
	}

	// Remove translation in global locales
	const fieldToDropInTranslate = info.isConstraint ? "r_" + url_value : info.fieldToDrop;
	translateHelper.removeLocales(data.application.name, "field", [data.entity.name, fieldToDropInTranslate])
	return info;
}