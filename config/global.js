const env = process.env.NODEA_ENV || 'develop';
// const fs = require('fs');

const config = {
	develop: {
		env: 'develop',
		protocol: 'http',
		host: process.env.HOST || '127.0.0.1',
		port: process.env.PORT || 1337,
		authStrategy: 'local',
		support_chat_enabled: false,
		open_signup: true
	},
	test: {
		env: 'recette',
		protocol: 'https',
		host: '127.0.0.1',
		port: process.env.PORT || 1337,
		ssl: {
			key: /*fs.readFileSync('./cacerts/private.key')*/"fakeKey",
			cert: /*fs.readFileSync('./cacerts/wildcard_nodea.crt')*/"fakeCert",
			passphrase : ''
		},
		authStrategy: 'local',
		support_chat_enabled: false,
		open_signup: false
	},
	production: {
		env: 'production',
		protocol: 'https',
		host: '127.0.0.1',
		port: process.env.PORT || 1337,
		ssl: {
			key: /*fs.readFileSync('./cacerts/private.key')*/"fakeKey",
			cert: /*fs.readFileSync('./cacerts/wildcard_nodea.crt')*/"fakeCert",
			passphrase : ''
		},
		authStrategy: 'local',
		support_chat_enabled: false,
		open_signup: false
	},
	studio: {
		env: 'studio',
		protocol: process.env.PROTOCOL || 'https',
		host: process.env.HOSTNAME,
		port: process.env.PORT || 1337,
		server_ip: process.env.SERVER_IP,
		dns: process.env.DOMAIN_STUDIO,
		dns_cloud: process.env.DOMAIN_CLOUD,
		sub_domain: process.env.SUB_DOMAIN,
		authStrategy: 'local',
		support_chat_enabled: process.env.SUPPORT_CHAT || true,
		open_signup: process.env.OPEN_SIGNUP || false
	}
}

const fullConfig = config[env];
fullConfig.version = "3.0.2";

module.exports = fullConfig;
