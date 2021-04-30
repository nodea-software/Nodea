const Entity = require('@core/abstract_routes/entity');
const block_access = require('@core/helpers/access');

const models = require('@app/models/');
const options = require('@app/models/options/e_user');
const attributes = require('@app/models/attributes/e_user');
const helpers = require('@core/helpers');
const mailer = require('@core/services/mailer');

const globalConfig = require('@config/global');

const bcrypt = require('bcrypt-nodejs');

class E_user extends Entity {
	constructor() {
		const additionalRoutes = [
			'settingsGET',
			'settingsPOST',
			'resendFirstConnectionEmail'
		];
		super('e_user', attributes, options, helpers, additionalRoutes);
	}

	settingsGET() {
		this.router.get('/settings', this.middlewares.settingsGET, this.asyncRoute(async({req, res}) => {

			const id_e_user = req.user.id;
			if(!id_e_user)
				throw new Error('Missing current user in session.');

			const e_user = await models.E_user.findOne({
				attributes: ["id", "f_login", "f_email"],
				where: {
					id: id_e_user
				},
				include: [{
					model: models.E_group,
					as: 'r_group'
				}, {
					model: models.E_role,
					as: 'r_role'
				}]
			});

			if (!e_user)
				throw new Error('Cannot find current user in database.');

			const data = {
				e_user: e_user,
				isLocal: false
			};
			if(globalConfig.authStrategy && globalConfig.authStrategy.toLowerCase() == "local")
				data.isLocal = true;

			res.success(_ => res.render('e_user/settings', data));
		}));
	}

	settingsPOST() {
		this.router.post('/settings', this.middlewares.settingsPOST, this.asyncRoute(async({req, res}) => {

			let updateObject = {};

			if (req.body.f_email && req.body.f_email != '')
				updateObject.f_email = req.body.f_email

			const user = await models.E_user.findByPk(req.session.passport.user.id);

			const newPassword = new Promise((resolve, reject) => {
				if (!req.body.old_password || req.body.old_password == "")
					return resolve(updateObject);

				if(!user.f_password) {
					updateObject.f_password = bcrypt.hashSync(req.body.new_password_1, null, null)
					return resolve(updateObject);
				}
				else if (req.body.new_password_1 == "" && req.body.new_password_2 == "")
					return reject(new Error("settings.error1"));
				else if (req.body.new_password_1 != req.body.new_password_2)
					return reject(new Error("settings.error2"));
				else if (req.body.new_password_1.length < 4)
					return reject(new Error("settings.error3"));

				bcrypt.compare(req.body.old_password, user.f_password, (err, check) => {
					if (!check)
						return reject(new Error("settings.error4"));

					updateObject.f_password = bcrypt.hashSync(req.body.new_password_1, null, null);
					resolve(updateObject);
				})
			})

			try {
				updateObject = await newPassword;
			} catch(err) {
				if(err.message.includes('settings.')) {
					req.session.toastr = [{
						message: err.message,
						level: "error"
					}];
					return res.success(_ => res.redirect("/user/settings"));
				}

				throw err;
			}

			await user.update(updateObject, {user: req.user});

			req.session.toastr = [{
				message: "settings.success",
				level: "success"
			}];

			res.success(_ => res.redirect("/user/settings"));
		}));
	}

	resendFirstConnectionEmail() {
		this.router.post('/resend_first_connection', this.middlewares.resendFirstConnectionEmail, this.asyncRoute(async({req, res}) => {
			// Send first connection email to new user
			try {
				await mailer.sendTemplate('first_connection', {
					data: {
						first_connection_url: mailer.config.host + `/first_connection?login=${req.body.f_login}`,
						user: req.body
					},
					from: mailer.config.from,
					to: req.body.f_email,
					subject: 'Inscription'
				});
				res.success(_ => res.status(200).send(true));
			} catch (err) {
				console.error(err);
				res.success(_ => res.status(500).send(err));
			}
		}));
	}

	get hooks() {
		return {
			list: {
				// start: async(data) => {},
				// beforeRender: async(data) => {},
			},
			datalist: {
				// start: async(data) => {},
				// beforeDatatableQuery: async(data) => {},
				// afterDatatableQuery: async(data) => {},
				// beforeResponse: async(data) => {}
			},
			subdatalist: {
				// start: async (data) => {},
				// beforeDatatableQuery: async (data) => {},
				// afterDatatableQuery: async (data) => {},
				// beforeResponse: async (data) => {},
			},
			show: {
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create_form: {
				// start: async (data) => {},

				// ifFromAssociation: async(data) => {},
				// beforeRender: async(data) => {}
			},
			create: {
				// start: async (data) => {},
				// beforeCreateQuery: async(data) => {},
				beforeRedirect: async({req}) => {
					if(req.body.send_first_connection_mail == 'true' && req.body.f_email) {
						// Send first connection email to new user
						try {
							mailer.sendTemplate('first_connection', {
								data: {
									first_connection_url: mailer.config.host + `/first_connection?login=${req.body.f_login}`,
									user: req.body
								},
								from: mailer.config.from,
								to: req.body.f_email,
								subject: 'Inscription'
							});
						} catch(err) {
							console.error(err);
						}
					}
				}
			},
			update_form: {
				start: async (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/user/list'));
						return false;
					}
				},
				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				start: async (data) => {
					if(data.idEntity == 1) {
						data.req.session.toastr = [{
							message: 'administration.user.cannot_modify_admin',
							level: 'error'
						}]
						data.res.success(_ => data.res.redirect('/user/list'));
						return false;
					}
				},
				// beforeRedirect: async(data) => {}
			},
			loadtab: {
				// start: async (data) => {},
				// beforeValidityCheck: (data) => {},
				// afterValidityCheck: (data) => {},
				// beforeDataQuery: (data) => {},
				// beforeRender: (data) => {},
			},
			set_status: {
				// start: async (data) => {},
				// beforeRedirect: async(data) => {}
			},
			search: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_remove: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			fieldset_add: {
				// start: async (data) => {},
				// beforeResponse: async (data) => {}
			},
			destroy: {
				start: async (data) => {
					if(data.idEntity == 1) {
						if(data.req.query.ajax) {
							data.res.success(_ => data.res.status(403).send(helpers.language(data.req.session.lang_user).__('administration.user.cannot_delete_admin')));
						}
						else {
							data.req.session.toastr = [{
								message: 'administration.user.cannot_delete_admin',
								level: 'error'
							}]
							data.res.redirect('/user/list')
						}
						return false;
					}
				},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			list: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			update_form: [
				block_access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				block_access.actionAccessMiddleware(this.entity, "update")
			],
			loadtab: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				block_access.actionAccessMiddleware(this.entity, "read"),
				block_access.statusGroupAccess
			],
			search: [
				block_access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				block_access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				block_access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				block_access.actionAccessMiddleware(this.entity, "delete")
			],
			settingsGET: [
				block_access.isLoggedIn
			],
			settingsPOST: [
				block_access.isLoggedIn
			],
			resendFirstConnectionEmail: [
				block_access.actionAccessMiddleware(this.entity, "read")
			]
		}
	}
}

module.exports = E_user;