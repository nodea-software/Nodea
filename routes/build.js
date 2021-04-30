const express = require('express');
const router = express.Router();
const fs = require("fs-extra");

const globalConf = require('../config/global.js');
const code_platform = require('../services/code_platform');
const block_access = require('../utils/block_access');
const metadata = require('../database/metadata')();
const models = require('../models/');

router.get('/', block_access.isLoggedIn, function(req, res) {
	(async () => {
		const data = {
			code_platform_user: null
		};

		// Set ReturnTo URL in cas of unauthenticated users trying to reach a page
		req.session.returnTo = req.protocol + '://' + req.get('host') + req.originalUrl;

		const applications = await models.Application.findAll({
			order: [['id', 'DESC']],
			include: [{
				model: models.User,
				as: "users",
				where: {
					id: req.session.passport.user.id
				},
				required: true
			}]
		});

		const host = globalConf.host;

		// Get user project for clone url generation
		if(req.session.code_platform && req.session.code_platform.user)
			data.code_platform_user = req.session.code_platform.user;

		const promises = [];
		for (let i = 0; i < applications.length; i++) {
			promises.push((async () => {
				const port = 9000 + parseInt(applications[i].id);
				let app_url = globalConf.protocol + '://' + host + ":" + port + "/";

				const appName = applications[i].name.substring(2);
				if (globalConf.env == 'studio')
					app_url = 'https://' + globalConf.sub_domain + '-' + appName + "." + globalConf.dns + '/';

				applications[i].dataValues.url = app_url;

				let metadataApp;
				try {
					metadataApp = metadata.getApplication(applications[i].name);
				} catch(err) {
					return;
				}
				applications[i].dataValues.createdBy = metadataApp.createdBy;

				if (code_platform.config.enabled && data.code_platform_user) {
					let codePlatformProject = null;

					// Missing metadata code plateform info
					if(!metadataApp.repoID) {
						codePlatformProject = await code_platform.getProjectByName(globalConf.host + "-" + applications[i].name.substring(2));
						metadataApp.repoID = codePlatformProject.id;
						metadataApp.codePlatformRepoHTTP = codePlatformProject.http_url_to_repo;
						metadataApp.codePlatformRepoSSH = codePlatformProject.ssh_url_to_repo;
						metadataApp.save();
					} else if(!metadataApp.codePlatformRepoHTTP) {
						try {
							codePlatformProject = await code_platform.getProjectByID(metadataApp.repoID);
							metadataApp.codePlatformRepoHTTP = codePlatformProject.http_url_to_repo;
							metadataApp.codePlatformRepoSSH = codePlatformProject.ssh_url_to_repo;
							metadataApp.save();
						} catch(err){
							console.log("ERROR while retrieving: " + applications[i].name + "(" + metadataApp.repoID + ")");
						}
					} else {
						codePlatformProject = {
							http_url_to_repo: metadataApp.codePlatformRepoHTTP,
							ssh_url_to_repo: metadataApp.codePlatformRepoSSH
						};
					}

					if (codePlatformProject){
						applications[i].dataValues.repo_url = codePlatformProject.http_url_to_repo;
						applications[i].dataValues.repo_ssh_url = codePlatformProject.ssh_url_to_repo;
					}
					else
						console.warn("Cannot find code platform project: " + metadataApp.name);
				}
			})())
		}

		await Promise.all(promises);

		data.applications = applications
		data.nb_application = data.applications.length;
		data.version = '';

		if (fs.existsSync(__dirname + "/../public/version.txt"))
			data.version = fs.readFileSync(__dirname + "/../public/version.txt", "utf-8").split("\n")[0];

		return data;
	})().then(data => {
		res.render('front/build/main', data);
	}).catch(err => {
		console.error(err);
		res.render('common/error', {code: 500});
	});
});

module.exports = router;
