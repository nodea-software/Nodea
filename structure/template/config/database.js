const globalConf = require('./global');

const databaseConf = {
	develop: {
		host: process.env.DATABASE_IP || '127.0.0.1',
		port: '3306', // mysql: 3306 - postgres: 5432
		user: 'nodea',
		password: 'nodea',
		database: 'nodea',
		dialect: 'mysql' // mysql || mariadb || postgres
	},
	test: {
		host: '127.0.0.1',
		port: '3306',
		user: 'nodea',
		password: 'nodea',
		database: 'nodea',
		dialect: 'mariadb'
	},
	production: {
		host: '127.0.0.1',
		port: '3306',
		user: 'nodea',
		password: 'nodea',
		database: 'nodea',
		dialect: 'mariadb'
	},
	studio: {
		host: process.env.DATABASE_IP || 'database',
		port: '3306',
		user: 'nodea',
		password: 'nodea',
		database: 'nodea',
		dialect: 'mariadb'
	},
	cloud: {
		host: process.env.DATABASE_IP || 'database',
		port: '3306',
		user: 'nodea',
		password: 'nodea',
		database: 'nodea',
		dialect: 'mariadb'
	},
	tablet: {
		dialect: 'sqlite',
		// iOS
		// storage: process.env.CORDOVA_APP_DIR + '/../Library/LocalDatabase/nodea.db'
		// ANDROID :
		storage: __dirname + '/nodea.db'
	}
}

module.exports = databaseConf[globalConf.env];