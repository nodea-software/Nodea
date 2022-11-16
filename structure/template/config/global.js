// Global configuration file
const env = process.env.NODEA_ENV || 'develop';
const applicationConf = require('./application.json');
// const fs = require('fs');

const config = {
	develop: {
		env: 'develop',
		protocol: 'http',
		host: '127.0.0.1',
		port: process.env.PORT || 1337,
		localstorage: __dirname + "/../upload/",
		authStrategy: process.env.AUTH || 'local',
		smsProvider: process.env.SMS || 'ovh',
		logConnexionFolder: __dirname + "/../logs/"
	},
	test: {
		env: 'test',
		protocol: 'http',
		host: '127.0.0.1',
		port: process.env.PORT || 1337,
		localstorage: __dirname + "/../upload_test/",
		authStrategy: process.env.AUTH || 'local',
		smsProvider: process.env.SMS || 'ovh',
		logConnexionFolder: __dirname + "/../logs/"
	},
	production: {
		env: 'production',
		protocol: 'https',
		host: '127.0.0.1',
		port: process.env.PORT || 1337,
		localstorage: "/var/data/localstorage/",
		authStrategy: process.env.AUTH || 'local',
		smsProvider: process.env.SMS || 'ovh',
		logConnexionFolder: __dirname + "/../logs/",
		ssl: {
			key: /*fs.readFileSync('./cacerts/private.key')*/ "fakeKey",
			cert: /*fs.readFileSync('./cacerts/wildcard_newmips.crt')*/ "fakeCert",
			passphrase: ''
		}
	},
	studio: {
		env: 'studio',
		protocol: 'http',
		host: '127.0.0.1',
		localstorage: __dirname + "/../upload/",
		syncfolder: __dirname + '/../sync/',
		port: process.env.PORT || 1337,
		authStrategy: process.env.AUTH || 'local',
		smsProvider: process.env.SMS || 'ovh',
		logConnexionFolder: __dirname + "/../logs/",
		ssl: {
			key: /*fs.readFileSync('./cacerts/private.key')*/ "fakeKey",
			cert: /*fs.readFileSync('./cacerts/wildcard_newmips.crt')*/ "fakeCert",
			passphrase: ''
		}
	},
	cloud: {
		env: 'cloud',
		protocol: 'http',
		host: '127.0.0.1',
		localstorage: __dirname + "/../upload/",
		syncfolder: __dirname + '/../sync/',
		port: process.env.PORT || 1337,
		authStrategy: process.env.AUTH || 'local',
		smsProvider: process.env.SMS || 'ovh',
		logConnexionFolder: __dirname + "/../logs/",
		ssl: {
			key: /*fs.readFileSync('./cacerts/private.key')*/ "fakeKey",
			cert: /*fs.readFileSync('./cacerts/wildcard_newmips.crt')*/ "fakeCert",
			passphrase: ''
		}
	}
}

// Merge applicationConf with the returned globalConf object
// After requiring config/global.js, the returned object contain the properties of config/application.json
const currentConfig = config[env];
for (const appConf in applicationConf)
	currentConfig[appConf] = applicationConf[appConf];

module.exports = currentConfig;
