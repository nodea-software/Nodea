const globalConf = require('@config/global');
const appConf = require('@config/application');
const language = require('@core/helpers/language');
const access = require('@core/helpers/access');

module.exports = (dust, dustFn) => (req, res, next) => {

	// Check security before uncomment
	// res.header("Access-Control-Allow-Origin", "*");
	// res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	// Set quick access to user in session through req.user
	try {
		req.user = req.session.passport.user;
	} catch(err) {
		req.user = null;
	}

	// If not a person (healthcheck service or other spamming services)
	if(typeof req.session.passport === "undefined" && Object.keys(req.headers).length == 0)
		return res.sendStatus(200);

	if (!req.session.lang_user)
		req.session.lang_user = appConf.lang;

	if (typeof req.session.toastr === 'undefined')
		req.session.toastr = [];

	res.locals.lang_user = req.session.lang_user;
	res.locals.config = globalConf;
	res.locals.corePath = __corePath;
	res.locals.appPath = __appPath;

	// Helpers / Locals / Filters
	dustFn.helpers(dust);
	dustFn.locals(res.locals, req, language(req.session.lang_user), access);
	dustFn.filters(dust, req.session.lang_user);

	next();
};