const models = require('../models');

exports.generateDemoAccess = async () => {
	let last_user_ID = await models.User.max('id');
	// Generate demo user
	const demo_user = await models.User.create({
		login: 'demo' + ++last_user_ID
	});
	// Set user role
	await demo_user.setRole(2);
	return demo_user;
}