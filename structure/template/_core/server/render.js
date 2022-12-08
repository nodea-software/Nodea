const models = require('@app/models/');
const fs = require('fs-extra');

async function getNotifications(user, locals) {
	const notifications = await models.E_notification.findAndCountAll({
		include: [{
			model: models.E_user,
			as: 'r_user',
			where: {
				id: user.id
			}
		}],
		subQuery: false,
		order: [["createdAt", "DESC"]],
		offset: 0,
		limit: 10
	});

	locals.notificationsCount = notifications.count;
	locals.notifications = notifications.rows;
	return locals;
}

async function getInlineHelp(entityName) {
	let options;
	try {
		options = JSON.parse(fs.readFileSync(__appPath + '/models/options/' + entityName + '.json', 'utf8'));
	} catch (err) {
		// Return empty array oh helps
		return [];
	}

	const entityList = [entityName];
	for (let i = 0; i < options.length; i++)
		entityList.push(options[i].target);

	return await models.E_inline_help.findAll({where: {f_entity: {[models.$in]: entityList}}});
}

module.exports = (dust) => (req, res, next) => {

	// Overload res.render to always get and reset toastr, load notifications and inline-help helper
	const render = res.render;
	res.render = (view, locals = {}, cb) => {

		if (req.session.toastr && req.session.toastr.length > 0) {
			locals.toastr = req.session.toastr;
			req.session.toastr = [];
		}

		(async () => {

			// --- User Guide ---
			locals.user_guide = await models.E_user_guide.findByPk(1);

			// --- Notificiation ---
			if(req.user)
				locals = await getNotifications(req.user, locals);

			// --- Inline Help ---
			if (view.indexOf('/create') == -1 && view.indexOf('/update') == -1 && view.indexOf('/show') == -1)
				return;

			// Load inline-help when rendering create, update or show page
			let entityName = view.split('/')[0];
			// For handle ajax form in sub entity
			entityName = entityName === 'overlay' ? req.query.associationSource : entityName;
			const helps = await getInlineHelp(entityName);

			if(helps.length > 0)
				dust.helpers.inline_help = (ch, con, bod, params) => {
					for (let i = 0; i < helps.length; i++) {
						if (params.field == helps[i].f_field)
							return true;
					}
					return false;
				}
		})().then(_ => {
			render.call(res, view, locals, cb);
		}).catch(err => {
			if(err)
				console.error(err);
			render.call(res, view, locals, cb);
		});
	};

	next();
}