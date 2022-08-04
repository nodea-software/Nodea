const domHelper = require('../helpers/js_dom');
const dataHelper = require("../utils/data_helper");

module.exports = {
	getFieldHtml: ({type, givenType, field, entity, values, defaultValue}, readOnly, file) => {

		const placeholder = `__key=entity.${entity}.${field}`;

		// Setting value only for update / show page
		let value = "", value2 = "";
		if (file != "create") {
			value = "{" + field + "}";
			value2 = field;
		}

		// Handling default value format
		if (defaultValue) {
			switch (type) {
				case "number" :
					defaultValue = defaultValue.replace(/\.|,/g, "");
					if (!isNaN(defaultValue))
						value = defaultValue;
					else
						console.warn("Invalid default value " + defaultValue + " for number input.")
					break;
				case "decimal" :
					defaultValue = defaultValue.replace(/,/g, ".");
					if (!isNaN(defaultValue))
						value = defaultValue;
					else
						console.warn("Invalid default value " + defaultValue + " for decimal input.")
					break;
				case "date" :
					value = "data-today=1";
					break;
				case "datetime" :
					value = "data-today=1";
					break;
				case "boolean" :
					if (["true", "vrai", "1", "checked", "coché", "à coché"].indexOf(defaultValue.toLowerCase()) != -1)
						value = true;
					else if (["false", "faux", "0", "unchecked", "non coché", "à non coché"].indexOf(defaultValue.toLowerCase()) != -1)
						value = false;
					else
						console.warn("Invalid default value " + defaultValue + " for boolean input.")
					break;
				case "enum" :
					value = dataHelper.clearString(defaultValue);
					break;
				default :
					value = defaultValue;
					break;
			}
		}

		// Radiobutton HTML can't understand a simple readOnly ... So it's disabled for them
		const disabled = readOnly ? 'disabled' : '';
		readOnly = readOnly ? 'readOnly' : '';

		let str = `\
		<div data-field='${field}' class='col-12'>\n\
			<div class='form-group'>\n\
				<label for='${field}'>\n\
					<!--{#__ key="entity.${entity}.${field}"/}-->\n\
					<!--{@inline_help field="${field}"}-->\n\
						<i data-entity="${entity}" data-field="${field}" class="inline-help fa fa-info-circle"></i>\n\
					<!--{/inline_help}-->\n\
				</label>\n`;

		const clearValues = [];
		let inputType, clearDefaultValue = "";

		// Insert HTML depending of type
		switch (type) {
			case "string" :
				str += "<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' maxLength='255' " + readOnly + "/>\n";
				break;
			case "color" :
				if (value == "")
					value = "#000000";
				str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='color' maxLength='255' " + readOnly + " " + disabled + "/>\n";
				break;
			case "currency":
				const moneyIcon = givenType == 'dollar' ? 'dollar-sign' : givenType == 'euro' ? 'euro-sign' : 'coins'; // eslint-disable-line
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fas fa-" + moneyIcon + "'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' data-type='currency' data-precision='10,2' " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "qrcode":
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-qrcode'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				if (file == "show")
					str += "	<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "'  type='text' data-type='qrcode' " + readOnly + "/>\n";
				else
					str += "	<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "'  type='text' maxLength='255' " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "barcode":
				inputType = 'number';
				givenType = givenType == 'barcode' ? 'code128' : givenType;
				if (givenType === "code39" || givenType === "code128")
					inputType = 'text';
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-barcode'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				if (file == "show")
					str += "	<input class='form-control' data-custom-type='" + givenType + "' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' show='true' type='text' data-type='barcode' " + readOnly + "/>\n";
				else
					str += "	<input class='form-control' data-custom-type='" + givenType + "' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' data-type='barcode' type='" + inputType + "'" + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "url" :
				if (file == 'show') {
					str += "	<br><a href='" + value + "' target='_blank' type='url' data-type='url' style='display: table-cell;padding-right: 5px;'>" + value + "</a>\n";
					str += "	<!--{?" + value2 + "}-->"
					str += "		<div class='copy-button'>\n";
					str += "			<i class='fa fa-copy'></i>\n";
					str += "		</div>\n";
					str += "	<!--{/" + value2 + "}-->"
				} else {
					str += "	<div class='input-group'>\n";
					str += "		<div class='input-group-prepend'>\n";
					str += "			<span class='input-group-text'>\n";
					str += "				<i class='fa fa-link'></i>\n";
					str += "			</span>\n";
					str += "		</div>\n";
					str += "	<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='url' data-type='url' " + readOnly + "/>\n";
					str += "	</div>\n";
				}
				break;
			case "password" :
				str += "<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='password' " + readOnly + "/>\n";
				break;
			case "number" :
				str += "<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='number' max='2147483648' " + readOnly + "/>\n";
				break;
			case "big number" :
				str += "<input class='form-control' data-custom-type='bigint' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='number' max='9223372036854775807' " + readOnly + "/>\n";
				break;
			case "decimal" :
				str += "<input class='form-control' data-custom-type='decimal' data-precision='14,4' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' " + readOnly + "/>\n";
				break;
			case "date" :
				str += "   <div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-calendar'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				if (file == "show") {
					str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='{" + value2 + "|date}' type='text' " + readOnly + "/>\n";
				} else if (file == "update") {
					str += "		<input class='form-control datepicker' placeholder='" + placeholder + "' name='" + field + "' value='{" + value2 + "|date}' type='text' " + readOnly + "/>\n";
				} else if (file == "create") {
					str += "		<input class='form-control datepicker' placeholder='" + placeholder + "' name='" + field + "' type='text' " + value + " " + readOnly + "/>\n";
				}
				str += "	</div>\n";
				break;
			case "datetime" :
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-calendar'></i>&nbsp;+&nbsp;<i class='fas fa-clock'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				if (file == "show")
					str += "		<input class='form-control' placeholder='" + placeholder + "' value='{" + value2 + "|datetime}' type='text' " + readOnly + "/>\n";
				else if (file == "update")
					str += "		<input class='form-control datetimepicker' placeholder='" + placeholder + "' name='" + field + "' value='{" + value2 + "|datetime}' type='text' " + readOnly + "/>\n";
				else if (file == "create")
					str += "		<input class='form-control datetimepicker' placeholder='" + placeholder + "' name='" + field + "' type='text' " + value + " " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "time" :
				if (file == "show") {
					str += "	<div class='bootstrap-timepicker'>\n";
					str += "		<div class='input-group'>\n";
					str += "			<div class='input-group-prepend'>\n";
					str += "				<span class='input-group-text'>\n";
					str += "					<i class='fas fa-clock'></i>\n";
					str += "				</span>\n";
					str += "			</div>\n";
					str += "			<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='{" + value2 + "|time}' type='text' " + readOnly + "/>\n";
					str += "		</div>\n";
					str += "	</div>\n";
				} else {
					str += "	<div class='bootstrap-timepicker'>\n";
					str += "		<div class='input-group'>\n";
					str += "			<div class='input-group-prepend'>\n";
					str += "				<span class='input-group-text'>\n";
					str += "					<i class='fas fa-clock'></i>\n";
					str += "				</span>\n";
					str += "			</div>\n";
					str += "			<input class='form-control timepicker' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' " + readOnly + "/>\n";
					str += "		</div>\n";
					str += "	</div>\n";
				}
				break;
			case "email" :
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fas fa-envelope'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' data-type='email' " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "phone" :
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-phone'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='tel' " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "fax" :
				str += "	<div class='input-group'>\n";
				str += "		<div class='input-group-prepend'>\n";
				str += "			<span class='input-group-text'>\n";
				str += "				<i class='fa fa-fax'></i>\n";
				str += "			</span>\n";
				str += "		</div>\n";
				str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='number' " + readOnly + "/>\n";
				str += "	</div>\n";
				break;
			case "boolean" :
				str += "	&nbsp;\n<br>\n";
				if (file == "create") {
					if (value === true)
						str += "	<input class='form-control' name='" + field + "' type='checkbox' checked />\n";
					else
						str += "	<input class='form-control' name='" + field + "' type='checkbox' />\n";
				} else {
					str += "	<!--{@ifTrue key=" + field + "}-->";
					str += "		<input class='form-control' name='" + field + "' value='" + value + "' type='checkbox' checked " + disabled + "/>\n";
					str += "	<!--{:else}-->";
					str += "		<input class='form-control' name='" + field + "' value='" + value + "' type='checkbox' " + disabled + "/>\n";
					str += "	<!--{/ifTrue}-->";
				}
				break;
			case "radio" :
				for (let i = 0; i < values.length; i++)
					clearValues[i] = dataHelper.clearString(values[i]);

				if (typeof defaultValue !== "undefined" && defaultValue != "" && defaultValue != null)
					clearDefaultValue = dataHelper.clearString(defaultValue);

				if (file == "create") {
					if (clearDefaultValue != "") {
						str += "<span class='radio-group' data-radio='" + field + "'>\n";
						str += "	<!--{#enum_radio." + entity + "." + field + "}-->&nbsp;\n<br>\n";
						str += "		<label class='no-weight'>";
						str += "		<!--{@eq key=\"" + clearDefaultValue + "\" value=\"{.value}\" }-->\n";
						str += "			<input name='" + field + "' value='{.value}' checked type='radio' " + disabled + "/>&nbsp;{.translation}\n";
						str += "		<!--{:else}-->\n";
						str += "			<input name='" + field + "' value='{.value}' type='radio' " + disabled + "/>&nbsp;{.translation}\n";
						str += "		<!--{/eq}-->\n";
						str += "		</label>";
						str += "	<!--{/enum_radio." + entity + "." + field + "}-->\n";
						str += "<span>\n";
					} else {
						str += "<span class='radio-group' data-radio='" + field + "'>\n";
						str += "	<!--{#enum_radio." + entity + "." + field + "}-->&nbsp;\n<br>\n";
						str += "		<label class='no-weight'>\n";
						str += "			<input name='" + field + "' value='{.value}' type='radio' " + disabled + "/>&nbsp;{.translation}\n";
						str += "		</label>";
						str += "	<!--{/enum_radio." + entity + "." + field + "}-->\n";
						str += "<span>\n";
					}
				} else if (file == "show") {
					str += "<span class='radio-group' data-radio='" + field + "'>\n";
					str += "	<!--{#enum_radio." + entity + "." + field + "}-->&nbsp;\n<br>\n";
					str += "		<label class='no-weight'>";
					str += "		<!--{@eq key=" + value2 + " value=\"{.value}\" }-->\n";
					str += "			<input name='" + entity + "." + field + "' value='{.value}' checked type='radio' " + disabled + "/>&nbsp;{.translation}\n";
					str += "		<!--{:else}-->\n";
					str += "			<input name='" + entity + "." + field + "' value='{.value}' type='radio' " + disabled + "/>&nbsp;{.translation}\n";
					str += "		<!--{/eq}-->\n";
					str += "		</label>";
					str += "	<!--{/enum_radio." + entity + "." + field + "}-->\n";
					str += "<span>\n";
				} else {
					str += "<span class='radio-group' data-radio='" + field + "'>\n";
					str += "	<!--{#enum_radio." + entity + "." + field + "}-->&nbsp;\n<br>\n";
					str += "	<label class='no-weight'>";
					str += "	<!--{@eq key=" + value2 + " value=\"{.value}\" }-->\n";
					str += "		<input name='" + field + "' value='{.value}' checked type='radio' " + disabled + "/>&nbsp;{.translation}\n";
					str += "	<!--{:else}-->\n";
					str += "		<input name='" + field + "' value='{.value}' type='radio' " + disabled + "/>&nbsp;{.translation}\n";
					str += "	<!--{/eq}-->\n";
					str += "	</label>";
					str += "<!--{/enum_radio." + entity + "." + field + "}-->\n";
					str += "<span>\n";
				}
				break;
			case "enum" :
				if (file == "show") {
					str += "	<!--{^" + value2 + "}-->\n";
					str += "		<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' type='text' " + readOnly + "/>\n";
					str += "	<!--{/" + value2 + "}-->\n";
					str += "	<!--{#enum_radio." + entity + "." + field + "}-->\n";
					str += "		<!--{@eq key=" + value2 + " value=\"{.value}\" }-->\n";
					str += "			<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='{.translation}' type='text' " + readOnly + "/>\n";
					str += "		<!--{/eq}-->\n";
					str += "	<!--{/enum_radio." + entity + "." + field + "}-->\n";
				} else if (file != "create") {
					str += "	<select class='form-control select' name='" + field + "' " + disabled + " width='100%'>\n";
					str += "		<option value=''><!--{#__ key=\"select.default\" /}--></option>\n";
					str += "		<!--{#enum_radio." + entity + "." + field + "}-->\n";
					str += "			<!--{@eq key=" + value2 + " value=\"{.value}\" }-->\n";
					str += "				<option value=\"{.value}\" selected> {.translation} </option>\n";
					str += "			<!--{:else}-->\n";
					str += "				<option value=\"{.value}\"> {.translation} </option>\n";
					str += "			<!--{/eq}-->\n";
					str += "		<!--{/enum_radio." + entity + "." + field + "}-->\n";
					str += "	</select>\n";
				} else if (value != "") {
					str += "	<select class='form-control select' name='" + field + "' " + disabled + " width='100%'>\n";
					str += "		<option value=''><!--{#__ key=\"select.default\" /}--></option>\n";
					str += "		<!--{#enum_radio." + entity + "." + field + "}-->\n";
					str += "			<!--{@eq key=\"" + value + "\" value=\"{.value}\" }-->\n";
					str += "				<option value=\"{.value}\" selected> {.translation} </option>\n";
					str += "			<!--{:else}-->\n";
					str += "				<option value=\"{.value}\"> {.translation} </option>\n";
					str += "			<!--{/eq}-->\n";
					str += "		<!--{/enum_radio." + entity + "." + field + "}-->\n";
					str += "	</select>\n";
				} else {
					str += "	<select class='form-control select' name='" + field + "' " + disabled + " width='100%'>\n";
					str += "		<option value='' selected><!--{#__ key=\"select.default\" /}--></option>\n";
					str += "		<!--{#enum_radio." + entity + "." + field + "}-->\n";
					str += "			<option value=\"{.value}\"> {.translation} </option>\n";
					str += "		<!--{/enum_radio." + entity + "." + field + "}-->\n";
					str += "	</select>\n";
				}
				break;
			case "text" :
				if (file == 'show')
					str += "	<div class='show-textarea'>{" + field + "|s}</div>\n";
				else if (file == 'create')
					str += "	<textarea class='form-control textarea' placeholder='" + placeholder + "' name='" + field + "' id='" + field + "_textareaid' rows='5' type='text' " + readOnly + ">" + value + "</textarea>\n";
				else
					str += "	<textarea class='form-control textarea' placeholder='" + placeholder + "' name='" + field + "' id='" + field + "_textareaid' rows='5' type='text' " + readOnly + ">{" + value2 + "|htmlencode}</textarea>\n";

				break;
			case "regular text" :
				value = "{" + field + "}";
				if (file == 'show')
					str += "	<textarea readonly='readonly' class='show-textarea regular-textarea'>" + value + "</textarea>\n";
				else
					str += "	<textarea class='form-control textarea regular-textarea' placeholder='" + placeholder + "' name='" + field + "' id='" + field + "_textareaid' type='text' " + readOnly + ">" + value + "</textarea>\n";
				break;
			case "file":
				if (file == 'create') {
					str += "	<div class='nodea-dropzone'><i class='fas fa-download'></i>&nbsp;&nbsp;<!--{#__ key=\"message.insert_file\" /}--></div>\n";
					str += "	<input type='file' name='" + field + "' value='" + value + "' style='display: none;'/>\n";
				} else if (file == 'update') {
					str += '	<div class="nodea-dropzone">\n';
					str += '		<!--{#'+field+'}-->\n';
					str += '			<div class="dropzonefile">\n';
					str += '				{.|filename}&nbsp<i class="remove-file fa fa-times" style="color: red;"></i>\n';
					str += '			</div>\n';
					str += '		<!--{:else}-->\n';
					str += '			<!--{#__ key="message.insert_file" /}-->\n';
					str += '		<!--{/'+field+'}-->\n';
					str += '	</div>\n';
					str += '	<input type="file" name="' + field + '" value="' + value + '" style="display: none;"/>\n';
					str += '	<input type="hidden" name="' + field + '_modified" value="false" />\n';
				} else {
					str += "	<div class='input-group'>\n";
					str += "		{?" + value2 + "}\n";
					str += "			<div class='input-group-prepend'>\n";
					str += "				<span class='input-group-text'>\n";
					str += "					<i class='fa fa-download'></i>\n";
					str += "				</span>\n";
					str += "			</div>\n";
					str += "			<input value='{" + value2 + "|filename}' data-entity=" + entity + " data-field=" + value2 + " data-id='{id}' class='form-control text-left preview_file' name='" + field + "' />\n";
					str += "		{:else}\n";
					str += "			{#__ key=\"message.empty_file\" /}\n";
					str += "		{/" + value2 + "}\n";
					str += "	</div>\n";
				}
				break;
			case "picture":
				if (file == 'create') {
					str += "	<div class='nodea-dropzone image'><i class='fas fa-download'></i>&nbsp;&nbsp;<!--{#__ key=\"message.insert_file\" /}--></div>\n";
					str += "	<input type='file' name='" + field + "' value='" + value + "' style='display: none;'/>\n";
				} else if (file == 'update') {
					str += '	<div class="nodea-dropzone image">{#'+field+'}<div class="dropzonefile">{.|filename}&nbsp<i class="remove-file fa fa-times" style="color: red;"></i></div>{/'+field+'}</div>\n';
					str += "	<input type='file' name='" + field + "' value='" + value + "' style='display: none;'/>\n";
					str += "	<input type='hidden' name='"+ field + "_modified' value='false' />\n";
				} else if (file == 'show') {
					str += "	<div class='input-group'>\n";
					str += "		<a href='/app/download?entity=" + entity + "&field=" + value2 + "&id={id}'><img src=\"data:image/;base64,{" + value2 + ".buffer}\" class='img-fluid' data-type='picture' alt=\"" + value + "\" name=" + field + "  " + readOnly + " height='400' width='400' /></a>\n";
					str += "	</div>\n";
				}
				break;
			default:
				str += "<input class='form-control' placeholder='" + placeholder + "' name='" + field + "' value='" + value + "' type='text' maxLength='255' " + readOnly + "/>\n";
				break;
		}

		str += '\
			</div>\n\
		</div>\n';

		return str;
	},
	getFieldInHeaderListHtml: (fieldName, entityName, type = 'string') => {
		const entity = entityName.toLowerCase();
		const field = fieldName.toLowerCase();
		const result = {
			headers: '',
			body: ''
		};

		/* ------------- Add new FIELD in headers ------------- */
		const str = `\
		<th data-field="${field}" data-col="${field}" data-type="${type}" >\
			<!--{#__ key="entity.${entity}.${field}"/}-->\
		</th>`;

		result.headers = str;
		return result;
	},
	updateFile: (fileBase, file, string) => {
		const fileToWrite = fileBase + '/' + file + '.dust';
		const $ = domHelper.read(fileToWrite);
		const $string = domHelper.read(false, false, string);
		$("#fields").append($string.html());
		domHelper.write(fileToWrite, $);
		return;
	},
	updateListFile: (fileBase, file, thString) => {
		const fileToWrite = fileBase + '/' + file + '.dust';
		const $ = domHelper.read(fileToWrite);

		// Add to header thead and filter thead
		$(".fields").each(function () {
			$(this).append(thString);
		});

		// Write back to file
		domHelper.write(fileToWrite, $);
		return;
	}
}