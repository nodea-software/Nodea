const globalConf = require('./global');

const config = {
	develop: {
		enabled: true, // Connect to code plateform
		platform: process.env.CODE_PLATFORM || "gitlab", // Gitlab || TODO Github || TODO Bitbucket
		protocol: process.env.GITLAB_PROTOCOL || "https",
		url: process.env.GITLAB_URL || "gitlab.nodea.studio",
		token: process.env.GITLAB_PRIVATE_TOKEN || "bfCdSxRKJ4F7rsCzbcsU"
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