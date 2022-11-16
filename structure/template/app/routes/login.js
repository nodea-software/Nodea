const CoreLogin = require('@core/routes/login.js');
const middlewares = require('@core/helpers/middlewares');
const auth = require('@app/services/authentication');

class Login extends CoreLogin {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			loginGET: [
				middlewares.loginAccess
			],
			loginPOST: [
				auth.isLoggedIn,
				// Trace login, remove this line if you disabled traceability
				middlewares.connectionLogMiddleware
			],
			refresh_login_captcha: [],
			first_connectionGET: [
				middlewares.loginAccess
			],
			first_connectionPOST: [
				middlewares.loginAccess,
				// Trace first connection, remove this line if you disabled traceability
				middlewares.connectionLogMiddleware
			],
			reset_passwordGET: [
				middlewares.loginAccess
			],
			reset_passwordPOST: [
				middlewares.loginAccess,
				// Trace reset password, remove this line if you disabled traceability
				middlewares.connectionLogMiddleware
			],
			reset_password_token: [
				middlewares.loginAccess
			],
			logout: [
				// Trace logout, remove this line if you disabled traceability
				middlewares.connectionLogMiddleware
			]
		}
	}
}

module.exports = Login;