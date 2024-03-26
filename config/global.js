const env = process.env.NODEA_ENV || 'develop';

const config = {
	develop: {
		env: 'develop',
		protocol: process.env.PROTOCOL || 'http',
		host: process.env.HOSTNAME || '127.0.0.1',
		port: process.env.PORT || 1337,
		server_ip: process.env.SERVER_IP || '127.0.0.1',
		dns: process.env.DOMAIN_STUDIO || 'nodea-software.studio',
		dns_cloud: process.env.DOMAIN_CLOUD || 'nodea-software.cloud',
		sub_domain: process.env.SUB_DOMAIN || 'localhost',
		authStrategy: process.env.AUTH || 'local',
		open_signup: process.env.OPEN_SIGNUP || false,
		demo_mode: process.env.DEMO_MODE || false
	},
	studio: {
		env: 'studio',
		protocol: process.env.PROTOCOL || 'https',
		host: process.env.HOSTNAME || '127.0.0.1',
		port: process.env.PORT || 1337,
		server_ip: process.env.SERVER_IP || '127.0.0.1',
		dns: process.env.DOMAIN_STUDIO || 'nodea-software.studio',
		dns_cloud: process.env.DOMAIN_CLOUD || 'nodea-software.cloud',
		sub_domain: process.env.SUB_DOMAIN || 'localhost',
		authStrategy: process.env.AUTH || 'local',
		open_signup: process.env.OPEN_SIGNUP || false,
		demo_mode: process.env.DEMO_MODE || false
	}
}

const env_config = config[env];
env_config.version = "3.2.0";

// Handle typeof string if config is from PROCESS ENV
env_config.demo_mode = typeof env_config.demo_mode === 'string' ? env_config.demo_mode === 'true' : env_config.demo_mode;
env_config.open_signup = typeof env_config.open_signup === 'string' ? env_config.open_signup === 'true' : env_config.open_signup;

module.exports = env_config;
