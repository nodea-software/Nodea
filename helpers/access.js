const models = require('../models');

exports.generateDemoAccess = async () => {
	// Generate demo user
	const demo_user = await models.User.create({
		login: 'demo_' + Date.now(),
		enabled: true,
		nb_instruction: 0
	});
	// Set user role
	await demo_user.setRole(2);
	return demo_user;
}

exports.logout_user = async (user_id) => {
	const all_sessions = await models.sequelize.query('SELECT * FROM sessions', {type: models.sequelize.QueryTypes.SELECT});
	const user_session = all_sessions.find(x => {
		try {
			const data = JSON.parse(x.data);
			if(data.passport.user.id == user_id)
				return true
		} catch(err) {
			console.error(err);
		}
		return false;
	});

	if(!user_session)
		return;

	// Destroy session
	try {
		await models.sequelize.query(`DELETE FROM sessions WHERE session_id="${user_session.session_id}"`);
	} catch(err) {
		console.error(err);
	}
}