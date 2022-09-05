const globalConf = require('./global');

const databaseConf = {
	develop: {
		host: process.env.APP_DB_IP || process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.APP_DB_PORT || '3306', // mysql: 3306 - postgres: 5432
		user: process.env.APP_DB_USER || 'node@',
		password: process.env.APP_DB_PWD || 'node@_pwd',
		database: process.env.APP_DB_NAME || 'node@',
		dialect: process.env.APP_DB_DIALECT || 'mariadb' // mysql || mariadb || postgres
	},
	test: {
		host: process.env.APP_DB_IP || process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.APP_DB_PORT || '3306', // mysql: 3306 - postgres: 5432
		user: process.env.APP_DB_USER || 'node@',
		password: process.env.APP_DB_PWD || 'node@_pwd',
		database: process.env.APP_DB_NAME || 'test_node@',
		dialect: process.env.APP_DB_DIALECT || 'mariadb' // mysql || mariadb || postgres
	},
	production: {
		host: process.env.APP_DB_IP || process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.APP_DB_PORT || '3306', // mysql: 3306 - postgres: 5432
		user: process.env.APP_DB_USER || 'node@',
		password: process.env.APP_DB_PWD || 'node@_pwd',
		database: process.env.APP_DB_NAME || 'node@',
		dialect: process.env.APP_DB_DIALECT || 'mariadb' // mysql || mariadb || postgres
	},
	studio: {
		host: process.env.APP_DB_IP || process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.APP_DB_PORT || '3306', // mysql: 3306 - postgres: 5432
		user: process.env.APP_DB_USER || 'node@',
		password: process.env.APP_DB_PWD || 'node@_pwd',
		database: process.env.APP_DB_NAME || 'node@',
		dialect: process.env.APP_DB_DIALECT || 'mariadb' // mysql || mariadb || postgres
	},
	cloud: {
		host: process.env.APP_DB_IP || process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.APP_DB_PORT || '3306', // mysql: 3306 - postgres: 5432
		user: process.env.APP_DB_USER || 'node@',
		password: process.env.APP_DB_PWD || 'node@_pwd',
		database: process.env.APP_DB_NAME || 'node@',
		dialect: process.env.APP_DB_DIALECT || 'mariadb' // mysql || mariadb || postgres
	},
	tablet: {
		dialect: 'sqlite',
		// iOS
		// storage: process.env.CORDOVA_APP_DIR + '/../Library/LocalDatabase/node@.db'
		// ANDROID :
		storage: __dirname + '/node@.db'
	}
}

module.exports = databaseConf[globalConf.env];