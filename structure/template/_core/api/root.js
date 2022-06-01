const ApiRoute = require('@core/abstract_routes/api_route');
const models = require('@app/models');

const hat = require('hat');

class CoreApiRoot extends ApiRoute {
	constructor(additionalRoutes) {
		const routes = [
			'getToken',
			...additionalRoutes
		]
		super(routes);
	}

	getToken() {
		this.router.get('/getToken', this.asyncRoute(async (data) => {
			const { req, res } = data;
			const { authorization } = req.headers;
			// No authorization header
			if (!authorization)
				return data.res.error(_ => res.status(500).json({error: 'No authorization header'}));

			const parts = authorization.split(' ');
			// Bad authorization header
			if (parts.length < 2)
				return data.res.error(_ => res.status(500).json({error: 'Bad authorization header'}));

			const sheme = parts[0];
			const credentials = new Buffer.from(parts[1], 'base64').toString().split(':');
			// Bad authorization header
			if (!/Basic/i.test(sheme))
				return data.res.error(_ => res.status(500).json({error: 'Bad authorization header'}));

			// Bad authorization header
			if (credentials.length < 2)
				return data.res.error(_ => res.status(500).json({error: 'Bad authorization header'}));

			// Bad authorization header
			if (!credentials[0] || !credentials[1])
				return data.res.error(_ => res.status(500).json({error: 'Bad authorization header'}));

			const client_key = credentials[0];
			const client_secret = credentials[1];
			const credentialsObj = await models.E_api_credentials.findOne({where: {f_client_key: client_key, f_client_secret: client_secret}});
			// Authentication failed
			if (!credentialsObj)
				return data.res.error(_ => res.status(401).json({error: 'Authentication failed'}));

			// Authentication success, create token and set token timeout
			const token = hat();
			// timeout is one day (86400000)
			const token_timeout_tmsp = new Date().getTime() + 86400000;
			await credentialsObj.update({f_token_timeout_tmsp: token_timeout_tmsp, f_token: token}, {user: false});
			// Send back new token
			data.res.success(_ => res.status(200).json({token: credentialsObj.f_token}));
		}));
	}
}

module.exports = CoreApiRoot;