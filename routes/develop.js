const express = require('express');
const router = express.Router();
const middlewares = require('../helpers/middlewares');
const app_helpers = require('../helpers/application');
const helper = require('../utils/data_helper');
const models = require('../models/');
const code_platform = require('../services/code_platform');
const metadata = require('../database/metadata')();

router.get('/', middlewares.hasAccessApplication, (req, res) => {

	if(req.query.app_name)
		req.session.app_name = req.query.app_name;

	(async() => {

		// Get all accessible application
		const applications = await models.Application.findAll({
			order: [
				['id', 'DESC']
			],
			include: [{
				model: models.User,
				as: "users",
				where: {
					id: req.session.passport.user.id
				},
				required: true
			}]
		});

		if(!req.session.app_name){
			return {
				currentApp: req.session.app_name,
				allApps: applications
			}
		}

		// Get current db_app and launch the process / Needed to access the documentation part
		const db_app = applications.find(x => x.name == req.session.app_name);
		const iframe_url = await app_helpers.launchApplication(req.session.app_name, db_app, req.sessionID);

		// Get all user for current app
		const appUsers = await models.User.findAll({
			include: [{
				model: models.Application,
				where: {
					name: req.session.app_name
				},
				required: true
			}]
		});

		// Code platform disabled
		if (!code_platform.config.enabled)
			return {
				...app_helpers.checkJSDOC(req.session.app_name), // Check is JSDOC is already generated
				iframe_url,
				currentApp: req.session.app_name,
				allApps: applications
			}

		// Get current project last activities (commit)
		const metadataApp = metadata.getApplication(req.session.app_name);

		const projectCommits = await code_platform.getProjectCommits(metadataApp.repoID);
		const projectLabels = await code_platform.getProjectLabels(metadataApp.repoID);
		const projectTags = await code_platform.getProjectTags(metadataApp.repoID);

		// Show only last 10 commits
		const lastCommits = projectCommits.filter((x, idx) => idx < 10);

		return {
			iframe_url,
			projectID: metadataApp.repoID,
			currentApp: req.session.app_name,
			currentRepoUrl: metadataApp.codePlatformRepoHTTP.replace('.git', ''),
			allApps: applications,
			appUsers: appUsers,
			projectLabels: projectLabels,
			projectTags: projectTags,
			projectCommits: projectCommits,
			lastCommits: lastCommits
		}
	})().then(data => {
		console.log(data);
		res.render('front/develop/main', data);
	}).catch(err => {
		console.error(err);
		req.session.toastr = [{
			message: err.message || 'error.oops'
		}]
		res.render('front/develop/main');
	})
});

router.post('/new-issue', middlewares.hasAccessApplication, (req, res) => {
	(async () => {
		// Get gitlab user from nodea user
		const assignToUsers = await models.User.findAll({
			where: {
				id: {
					[models.$in]: req.body.assignto
				}
			}
		});

		req.body.assignto = [];
		for (let i = 0; i < assignToUsers.length; i++) {
			// eslint-disable-next-line no-await-in-loop
			const user = await code_platform.getUser(assignToUsers[i]);
			req.body.assignto.push(user.id)
		}

		await code_platform.createIssue(req.body.projectID, {
			title: req.body.title,
			labels: req.body.labels,
			description: req.body.description,
			assignee_ids: req.body.assignto
		});
	})().then(_ => {
		res.status(200).send(true);
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	})
});

router.post('/get-issues', middlewares.hasAccessApplication, (req, res) => {
	(async () => {
		const issues = await code_platform.getProjectIssues(req.body.projectID, req.body.mytasks == 'true' ? req.session.code_platform.user.id : null);
		const data = [];
		for (let i = 0; i < issues.length; i++) {
			data.push({
				id: issues[i].id,
				title: issues[i].title,
				description: issues[i].description,
				created_at: issues[i].created_at,
				labels: issues[i].labels,
				assignees: issues[i].assignees[0] ? issues[i].assignees[0].name : '',
				state: issues[i].state,
				web_url: issues[i].web_url
			})
		}
		return data;
	})().then(data => {
		res.status(200).send({
			data: data
		});
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	})
});

router.post('/new-tag', middlewares.hasAccessApplication, (req, res) => {
	(async () => {
		req.body.title = helper.clearString(req.body.title).replace(/ /g, '_');

		if(!req.body.commit || req.body.commit == '')
			throw new Error('Missing commit ref for tag creation.');

		await code_platform.createTag(req.body.projectID, {
			tag_name: req.body.title,
			message: req.body.description,
			ref: req.body.commit
		});
	})().then(_ => {
		res.status(200).send(true);
	}).catch(err => {
		console.error(err);
		res.status(500).send(err);
	})
});

router.post('/check-js-doc', middlewares.hasAccessApplication, (req, res) => {
	
});

router.post('/generate-js-doc', middlewares.hasAccessApplication, (req, res) => {
	
});


module.exports = router;