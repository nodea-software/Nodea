/* eslint-disable global-require */
const strategy = require('@config/global').smsProvider;
let routine;
switch (strategy) {
	case "ovh":
		routine = require('./ovh');
		break;
	default:
		routine = require('./ovh');
		break;
}

module.exports = routine;