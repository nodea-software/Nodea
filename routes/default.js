const express = require('express');
const router = express.Router();
const block_access = require('../utils/block_access');
const fs = require("fs-extra");
const language = require("../services/language");
const readLastLines = require('read-last-lines');

// Bot completion
const bot = require('../services/bot.js');

router.get('/home', block_access.isLoggedIn, function(req, res) {

	// Set ReturnTo URL in cas of unauthenticated users trying to reach a page
	req.session.returnTo = req.protocol + '://' + req.get('host') + req.originalUrl;

	const data = {
		version: ''
	};

	if (fs.existsSync(__dirname + "/../public/version.txt"))
		data.version = fs.readFileSync(__dirname + "/../public/version.txt", "utf-8").split("\n")[0];

	res.render('front/home', data);
});

router.post('/update_logs', block_access.isLoggedIn, function(req, res) {
	try {
		if (req.body.appName && typeof req.body.appName === 'string')
			readLastLines.read(__dirname + "/../workspace/logs/app_" + req.body.appName + ".log", 1000).then(lines => {
				res.status(200).send(lines);
			});
		else
			readLastLines.read(__dirname + "/../all.log", 1000).then(lines => {
				res.status(200).send(lines);
			});
	} catch (e) {
		console.log(e);
		res.send(false);
	}
});

router.get('/completion', block_access.isLoggedIn, function(req, res) {
	try {
		res.send(bot.complete(req.query.str, req.query.app_name));
	} catch (e) {
		console.log(e);
		res.send(false);
	}
});

router.post('/ajaxtranslate', block_access.isLoggedIn, function(req, res) {
	res.json({
		value: language(req.body.lang).__(req.body.key, req.body.params)
	});
});

module.exports = router;
