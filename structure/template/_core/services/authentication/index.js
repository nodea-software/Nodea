const strategy = require('@config/global').authStrategy;
let routine;
switch (strategy) {
	case "local":
		routine = require('./local');
		break;
	case "ldap":
		routine = require('./ldap');
		break;
	case "windows":
		routine = require('./windows');
		break;
	default:
		routine = require('./local');
		break;
}

module.exports = routine;