const globalConf = require('./global');

const config = {
	develop: {
		url: process.env.PORTAINER_URL || "",
		login: process.env.PORTAINER_LOGIN || "",
		password: process.env.PORTAINER_PWD || ""
	},
	test: {
		url: process.env.PORTAINER_URL || "",
		login: process.env.PORTAINER_LOGIN || "",
		password: process.env.PORTAINER_PWD || ""
	},
	production: {
		url: process.env.PORTAINER_URL || "",
		login: process.env.PORTAINER_LOGIN || "",
		password: process.env.PORTAINER_PWD || ""
	},
	studio: {
		url: process.env.PORTAINER_URL || "",
		login: process.env.PORTAINER_LOGIN || "",
		password: process.env.PORTAINER_PWD || ""
	}
}

module.exports = config[globalConf.env];