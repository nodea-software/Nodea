const strategy = require('@config/global').authStrategy;
let routine;
switch (strategy) {
	case "custom_strategy":
		routine = require('./custom_strategy');
		break;
	default:
		routine = require('@core/services/authentication');
		break;
}

module.exports = routine;