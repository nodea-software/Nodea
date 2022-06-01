const getAppValidators = require('@app/models/validators');

module.exports = (attribute) => {
	const appValidators = getAppValidators(attribute);
	const coreValidators = [{
		types: ['enum', 'radio'],
		validator: {
			isIn: {
				args: [attribute.values],
				msg: "error.validation.radio"
			}
		}
	}, {
		types: ['number', 'big number'],
		validator: {isInt: {msg: "error.validation.number"}}
	}, {
		types: ['decimal', 'euro', 'float', 'money'],
		validator: {isFloat: {msg: "error.validation.float"}}
	}, {
		types: ['boolean'],
		validator: {
			isIn: {
				args: [[true, false]],
				msg: "error.validation.boolean"
			}
		}
	}, {
		types: ['email'],
		validator: {isEmail: {msg: "error.validation.email"}}
	}, {
		types: ['date', 'datetime'],
		validator: {isDate: {msg: "error.validation.date"}}
	}, {
		types: ['tel'],
		validator: {
			isPhone: function(value) {
				if (!/^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/.test(value))
					throw "error.validation.tel";
			}
		}
	}, {
		types: ['color'],
		validator: {
			isColor: function(value) {
				if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value))
					throw "error.validation.color";
			}
		}
	}, {
		types: ['url'],
		validator: {isUrl: {msg: "error.validation.url"}}
	}, {
		types: ['text', 'regular text', 'time', 'fax', 'qrcode', 'ean8', 'code39', 'picture', 'password'],
		validator: undefined
	}];

	for (const appValidator of appValidators)
		if (appValidator.types.includes(attribute.nodeaType))
			return appValidator.validator;
	for (const coreValidator of coreValidators)
		if (coreValidator.types.includes(attribute.nodeaType))
			return coreValidator.validator;
}
