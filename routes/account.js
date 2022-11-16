const express = require('express');
const router = express.Router();
const middlewares = require('../helpers/middlewares');
const code_platform = require('../config/code_platform.js');
const models = require('../models/');

router.get('/', middlewares.isLoggedIn, (req, res) => {
	const data = {};
	data.user = req.session.passport.user;
	models.Role.findByPk(data.user.id_role).then(userRole => {
		data.user.role = userRole;

		if (code_platform.enabled) {
			data.code_platform_user = req.session.code_platform.user;
			data.code_platform_host = code_platform.protocol + "://" + code_platform.url;
		}

		res.render('front/account', data);
	});
});

router.get('/disabled_demo_popup', middlewares.isLoggedIn, (req, res) => {
	req.session.show_demo_popup = false;
	res.status(200).send(true);
});

module.exports = router;