const session = require('express-session');
const fs = require('fs-extra');

const globalConf = require('@config/global');
const dbConf = require('@config/database');

let SessionStore, pg;
// MySql
if(dbConf.dialect == "mysql" || dbConf.dialect == "mariadb")
	SessionStore = require('express-mysql-session'); // eslint-disable-line
// Postgres
if(dbConf.dialect == "postgres"){
	pg = require('pg'); // eslint-disable-line
	SessionStore = require('connect-pg-simple')(session); // eslint-disable-line
}

// Required for passport
const options = {
	host: dbConf.host,
	port: dbConf.port,
	user: dbConf.user,
	password: dbConf.password,
	database: dbConf.database
};

let sessionStore;
if(dbConf.dialect == "mysql" || dbConf.dialect == "mariadb")
	sessionStore = new SessionStore(options);

if(dbConf.dialect == "postgres"){
	const pgPool = new pg.Pool(options);
	pgPool.connect((err, client) => {
		if (err) {console.error(err);}
		client.query('SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_catalog = \''+options.database+'\' AND table_name = \'sessions\');', (err, res) => {
			if (err) {console.error(err.stack)} else if(!res.rows[0].exists) {
				// Postgres sessions table do not exist, creating it...
				client.query(fs.readFileSync(__dirname + "/sql/sessions-for-postgres.sql", "utf8"), err => {
					if (err) {console.error(err)} else {console.log("Postgres sessions table created !");}
				});
			}
		})
	})
	sessionStore = new SessionStore({
		pool: pgPool,
		tableName: 'sessions'
	});
}

const sessionInstance = session({
	store: sessionStore,
	cookie: {
		sameSite: 'lax',
		secure: globalConf.protocol == 'https',
		maxAge: 60000 * 60 * 24 // 1 day
	},
	cookieName: 'workspaceCookie' + globalConf.appname,
	secret: 'w0rkspaceN0dea@!',
	key: 'workspaceCookie' + globalConf.appname, // We concat port for a workspace specific session, instead of generator specific
	resave: false,
	rolling: false,
	saveUninitialized: false
});

module.exports = sessionInstance;