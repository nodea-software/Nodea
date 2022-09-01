const env = process.env.NODEA_ENV || 'develop';

const config = {
	develop: {
		env: 'develop',
		protocol: process.env.PROTOCOL || 'http',
		host: process.env.HOST || '127.0.0.1',
		port: process.env.PORT || 1337,
		server_ip: process.env.SERVER_IP || '127.0.0.1',
		dns: process.env.DOMAIN_STUDIO || 'nodea.studio',
		dns_cloud: process.env.DOMAIN_CLOUD || 'nodea.cloud',
		sub_domain: process.env.SUB_DOMAIN || 'localhost',
		authStrategy: process.env.AUTH || 'local',
		support_chat_enabled: process.env.SUPPORT_CHAT || false,
		open_signup: process.env.OPEN_SIGNUP || false,
		demo_mode: false
	},
	studio: {
		env: 'studio',
		protocol: process.env.PROTOCOL || 'https',
		host: process.env.HOST || '127.0.0.1',
		port: process.env.PORT || 1337,
		server_ip: process.env.SERVER_IP || '127.0.0.1',
		dns: process.env.DOMAIN_STUDIO || 'nodea.studio',
		dns_cloud: process.env.DOMAIN_CLOUD || 'nodea.cloud',
		sub_domain: process.env.SUB_DOMAIN || 'localhost',
		authStrategy: process.env.AUTH || 'local',
		support_chat_enabled: process.env.SUPPORT_CHAT || false,
		open_signup: process.env.OPEN_SIGNUP || false,
		demo_mode: false
	}
}

const fullConfig = config[env];
fullConfig.version = "3.1";

module.exports = fullConfig;
