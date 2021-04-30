const CoreLogin = require('@core/routes/login.js');
const block_access = require('@core/helpers/access');
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
				block_access.loginAccess
			],
			loginPOST: [
				auth.isLoggedIn
			],
			refresh_login_captcha: [],
			first_connectionGET: [
				block_access.loginAccess
			],
			first_connectionPOST: [
				block_access.loginAccess
			],
			reset_passwordGET: [
				block_access.loginAccess
			],
			reset_passwordPOST: [
				block_access.loginAccess
			],
			reset_password_token: [
				block_access.loginAccess
			],
			logout: []
		}
	}
}

module.exports = Login;