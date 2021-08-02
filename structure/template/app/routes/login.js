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
				auth.isLoggedIn
			],
			refresh_login_captcha: [],
			first_connectionGET: [
				middlewares.loginAccess
			],
			first_connectionPOST: [
				middlewares.loginAccess
			],
			reset_passwordGET: [
				middlewares.loginAccess
			],
			reset_passwordPOST: [
				middlewares.loginAccess
			],
			reset_password_token: [
				middlewares.loginAccess
			],
			logout: []
		}
	}
}

module.exports = Login;