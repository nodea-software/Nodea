const express = require('express');
const router = express.Router();
const request = require('request');

const middlewares = require('../helpers/middlewares');

router.get('/', middlewares.loginAccess, function(req, res) {
	res.redirect('/login');
});

// Waiting room for deploy instruction
router.get('/waiting', function(req, res) {
	res.render('front/waiting_deploy', {
		redirect: req.query.redirect
	});
});

router.post('/waiting', function(req, res) {
	request.get({
		url: req.body.redirect,
		strictSSL: false,
		rejectUnauthorized: false
	}, (error, response) => {
		if(error)
			console.log(error)

		// Stack is not ready
		if (error || response && response.statusCode !== 200 && response.statusCode !== 302)
			return res.sendStatus(503).end();

		// Stack ready, container ready, lets go
		return res.sendStatus(200);
	});
});

router.get('/error/:code', function(req, res) {
	res.render('common/error', {
		code: req.params.code
	});
});

module.exports = router;