const globalConf = require('./global');

const config = {
	develop: {
		enabled: false, // Connect to code plateform
		platform: "gitlab", // Gitlab || TODO Github || TODO Bitbucket
		protocol: "https",
		url: "",
		token: ""
	},
	test: {
		enabled: false,
		platform: "",
		protocol: "http",
		url: "",
		token: ""
	},
	production: {
		enabled: false,
		platform: "",
		protocol: "http",
		url: "",
		token: ""
	},
	studio: {
		enabled: true,
		platform: process.env.CODE_PLATFORM || "gitlab",
		protocol: process.env.GITLAB_PROTOCOL || "http",
		url: process.env.GITLAB_URL || "",
		token: process.env.GITLAB_PRIVATE_TOKEN || ""
	}
}

module.exports = config[globalConf.env];