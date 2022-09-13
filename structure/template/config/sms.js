const globalConf = require('./global');

const smsConf = {
	develop: {
		sender: "",
		appKey: "",
		appSecret: "",
		consumerKey: ""
	},
	test: {
		sender: "",
		appKey: "",
		appSecret: "",
		consumerKey: ""
	},
	production: {
		sender: "",
		appKey: "",
		appSecret: "",
		consumerKey: ""
	},
	studio: {
		sender: "",
		appKey: "",
		appSecret: "",
		consumerKey: ""
	},
	cloud: {
		sender: "",
		appKey: "",
		appSecret: "",
		consumerKey: ""
	}
}

module.exports = smsConf[globalConf.env] || {};
