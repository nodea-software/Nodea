// Set up ======================================================================
// Get all the tools we need
const path = require('path');
const express = require('express');
const app = express();
const session = require('express-session');

const globalConf = require('./config/global');
const dbConfig = require('./config/database');

global.__piecesPath = __dirname + '/structure/pieces';
global.__workspacePath = __dirname + '/workspace';

let SessionStore, pg;
// MySql
if(dbConfig.dialect == "mysql" || dbConfig.dialect == "mariadb")
	SessionStore = require('express-mysql-session'); // eslint-disable-line
// Postgres
if(dbConfig.dialect == "postgres"){
	pg = require('pg'); // eslint-disable-line
	SessionStore = require('connect-pg-simple')(session); // eslint-disable-line
}

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const passport = require('passport');
const flash = require('connect-flash');
const https = require('https');
const fs = require('fs-extra');
const split = require('split');
const AnsiToHTML = require('ansi-to-html');
const ansiToHtml = new AnsiToHTML();
const moment = require('moment');

const models = require('./models/');

// Passport for configuration
require('./utils/authStrategies');
const dustHelpers = require('./utils/dust')

const language = require('./services/language');

// set up our express application
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));

const allLogStream = fs.createWriteStream(path.join(__dirname, 'all.log'), {
	flags: 'a'
});

app.use(morgan('dev', {
	skip: function(req) {
		// Remove spamming useless logs
		const skipArray = ["/update_logs", "/get_pourcent_generation", "/status", "/completion", "/watch", "/"];
		let currentURL = req.originalUrl;
		if (currentURL.indexOf("?") != -1) {
			// Remove params from URL
			currentURL = currentURL.split("?")[0];
		}
		if (skipArray.indexOf("/"+currentURL.split("/")[currentURL.split("/").length -1]) != -1) {
			return true;
		}
	},
	stream: split().on('data', function(line) {
		if (allLogStream.bytesWritten < 5000) {
			if(globalConf.env != "develop"){
				allLogStream.write(moment().tz('Europe/Paris').format("MM-DD HH:mm:ss") + ": " + ansiToHtml.toHtml(line) + "\n");
				process.stdout.write(moment().tz('Europe/Paris').format("MM-DD HH:mm:ss") + " " + line + "\n");
			} else {
				allLogStream.write(ansiToHtml.toHtml(line) + "\n");
				process.stdout.write(line + "\n");
			}
		} else {
			/* Clear all.log if too much bytes are written */
			fs.writeFileSync(path.join(__dirname, 'all.log'), '');
			allLogStream.bytesWritten = 0;
		}
	})
}));

// Overide console.warn & console.error to file+line
['warn', 'error'].forEach(methodName => {
	const originalMethod = console[methodName];
	console[methodName] = (...args) => {
		let initiator = 'unknown place';
		try {
			throw new Error();
		} catch (e) {
			if (typeof e.stack === 'string') {
				let isFirst = true;
				for (const line of e.stack.split('\n')) {
					const matches = line.match(/^\s+at\s+(.*)/);
					if (matches) {
						if (!isFirst) {
							// first line - current function
							// second line - caller (what we are looking for)
							initiator = matches[1];
							break;
						}
						isFirst = false;
					}
				}
			}
		}
		const at = initiator.split(__dirname)[1];
		if (!at)
			originalMethod.apply(console, [...args]);
		else
			originalMethod.apply(console, [...args, `   - ${at}`]);
	};
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: true,
	limit: "50mb"
}));
app.use(bodyParser.json({
	limit: '50mb'
}));

//------------------------------ DUST.JS ------------------------------ //
const dust = require('dustjs-linkedin');
const cons = require('consolidate');

app.set('views', path.join(__dirname, 'views'));
app.engine('dust', cons.dust);
cons.dust.debugLevel = "DEBUG";
app.set('view engine', 'dust');

// Required for passport
const options = {
	host: dbConfig.host,
	port: dbConfig.port,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
};

let sessionStore;
if(dbConfig.dialect == "mysql" || dbConfig.dialect == "mariadb")
	sessionStore = new SessionStore(options);
if(dbConfig.dialect == "postgres"){
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
app.use(session({
	store: sessionStore,
	cookie: {
		sameSite: 'lax',
		secure: globalConf.protocol == 'https',
		maxAge: 60000 * 60 * 24 // 1 day
	},
	key: 'nodea_cookie',
	cookieName: 'nodea_cookie',
	secret: 'nodeasoftw@rec00kie',
	resave: false,
	rolling: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Locals ======================================================================
app.use(function(req, res, next) {
	// If not a person (healthcheck service or other spamming services)
	if(typeof req.session.passport === "undefined" && Object.keys(req.headers).length == 0){return res.sendStatus(200);}

	// Applications created with nodea only have fr-FR.
	// To avoid cookie conflict between nodea and this app, set fr-FR by default
	let lang = 'fr-FR';
	if (req.isAuthenticated()) {
		if (req.session.lang_user)
			lang = req.session.lang_user;
		else
			req.session.lang_user = lang;
	}

	// Helpers
	dustHelpers.helpers(dust);

	// Locals
	dustHelpers.locals(res.locals, req, language(lang))
	res.locals.user_login = req.user ? req.user.login : false;
	res.locals.user_lang = lang;
	res.locals.globalConf = globalConf;
	// Snow and christmas ambiance
	if(moment().format('MM') == '12')
		res.locals.noel = true;

	// Filters
	dustHelpers.filters(dust, lang);

	next();
});

// Overload res.render to always get and reset toastr
app.use((req, res, next) => {
	const render = res.render;
	res.render = (view, locals, cb) => {
		if (typeof locals === "undefined")
			locals = {};
		if (req.session.toastr && req.session.toastr.length > 0) {
			locals.toastr = [];
			for (let i = 0; i < req.session.toastr.length; i++) {
				const toast = req.session.toastr[i];
				const traductedToast = {
					message: language(req.session.lang_user).__(toast.message),
					level: toast.level
				};
				locals.toastr.push(traductedToast);
			}
			req.session.toastr = [];
		}
		locals.dark_theme = req.session.dark_theme ? req.session.dark_theme : false;
		locals.support_chat_enabled = globalConf.support_chat_enabled;
		if(typeof req.session.showtuto === 'undefined')
			req.session.showtuto = true;
		locals.showtuto = req.session.showtuto ? 'true' : 'false';
		render.call(res, view, locals, cb);
	};
	next();
});

// Routes ======================================================================
require('./routes/')(app);

// Handle 404
app.use((req, res) => {
	res.status(404);
	res.render('common/404');
});

// Launch ======================================================================
models.sequelize.sync({
	logging: false,
	hooks: false
}).then(_ => {
	models.User.findAll().then(users => {
		if (!users || users.length == 0) {
			models.Role.create({
				id: 1,
				name: 'admin',
				version: 1
			}).then(_ => {
				models.Role.create({
					id: 2,
					name: 'user',
					version: 1
				}).then(_ => {
					models.User.create({
						id: 1,
						enabled: 0,
						email: globalConf.env == 'studio' ? globalConf.sub_domain + '-admin@nodea-software.com' : 'admin@local.fr',
						firstname: "Admin",
						lastname: "Nodea",
						login: "admin",
						password: null,
						phone: null,
						version: 1
					}).then(user => {
						user.setRole(1);
					})
				})
			})
		}
	});

	if (globalConf.protocol == 'https') {
		const server = https.createServer(globalConf.ssl, app);
		server.listen(globalConf.port);
		console.log("✅ Started https on " + globalConf.port);
	} else {
		app.listen(globalConf.port);
		console.log("✅ Started on " + globalConf.port);
	}
}).catch(err => {
	console.log("ERROR - SYNC");
	console.error(err);
});

process.on('SIGINT', _ => {
	process.exit(1);
});

module.exports = app;
