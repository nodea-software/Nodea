const globalConf = require('./global');

const databaseConf = {
	develop: {
		host: process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.DATABASE_PORT || '3306',
		user: process.env.DATABASE_USER || 'nodea',
		password: process.env.DATABASE_PWD || 'nodea',
		database: process.env.DATABASE_NAME || 'nodea',
		dialect: 'mariadb' //mysql || mariadb || postgres
	},
	studio: {
		host: process.env.DATABASE_IP || '127.0.0.1',
		port: process.env.DATABASE_PORT || '3306',
		user: process.env.DATABASE_USER || 'nodea',
		password: process.env.DATABASE_PWD || 'nodea',
		database: process.env.DATABASE_NAME || 'nodea',
		dialect: 'mariadb'
	}
}

module.exports = databaseConf[globalConf.env];