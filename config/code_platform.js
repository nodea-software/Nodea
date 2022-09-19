const globalConf = require('./global');

const config = {
	develop: {
		enabled: process.env.CODE_PLATFORM_ENABLE || false, // Connect to code plateform
		platform: process.env.CODE_PLATFORM || "gitlab", // Gitlab || TODO Github || TODO Bitbucket
		protocol: process.env.CODE_PLATFORM_PROTOCOL || "http",
		url: process.env.CODE_PLATFORM_URL || "",
		token: process.env.CODE_PLATFORM_PRIVATE_TOKEN || ""
	},
	studio: {
		enabled: process.env.CODE_PLATFORM_ENABLE || true,
		platform: process.env.CODE_PLATFORM || "gitlab",
		protocol: process.env.CODE_PLATFORM_PROTOCOL || "http",
		url: process.env.CODE_PLATFORM_URL || "",
		token: process.env.CODE_PLATFORM_PRIVATE_TOKEN || ""
	}
}

module.exports = config[globalConf.env];