const fs = require('fs-extra');
const access = require('@core/helpers/access');
const file_helper = require('@core/helpers/file');
const enums_radios = require('@core/utils/enum_radio.js');
const models = require('@app/models');
const language = require('@core/helpers/language');
const appConf = require('@config/application.json');

const Route = require('@core/abstract_routes/route');

class CoreApp extends Route {

	/**
	 * @constructor
	 * @param {array} [additionalRoutes] - Additional routes implemented in CoreEntity child class.
	 */
	constructor(additionalRoutes = []) {
		const registeredRoutes = [
			'status',
			'widgets',
			'change_language',
			'get_file',
			'download',
			'translate',
			...additionalRoutes
		];
		super(registeredRoutes)
	}

	status() {
		this.router.get('/status', (req, res) => {
			res.sendStatus(200);
		});
	}

	/**
	 * POST - Route that handle ajax call from application widgets
	 * @namespace CoreApp#widgets
	 */
	widgets() {
		this.router.post('/widgets', ...this.middlewares.widgets, this.asyncRoute(async(data) => {
			/**
			 * Called at route start
			 * @function CoreApp#widgets#start
			 * @memberof CoreApp#widgets
			 * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 */
			if (await this.getHook('widgets', 'start', data) === false)
				return;

			const user = data.req.session.passport.user;
			const widgetsInfo = data.req.body.widgets;
			const widgetsPromises = [];

			for (let i = 0; i < widgetsInfo.length; i++) {
				const currentWidget = widgetsInfo[i];
				const modelName = 'E_' + currentWidget.entity.substring(2);

				// Check group and role access to widget's entity
				if (!access.entityAccess(user.r_group, currentWidget.entity.substring(2)) || !access.actionAccess(user.r_role, currentWidget.entity.substring(2), 'read'))
					continue;

				widgetsPromises.push(((widget, model) => new Promise(resolve => {
					const widgetRes = {type: widget.type};
					switch (widget.type) {
						case 'info':
						case 'stats':
							models[model].count().then(widgetData => {
								widgetRes.data = widgetData;
								data[widget.widgetID] = widgetRes;
								resolve();
							}).catch(resolve);
							break;

						case 'piechart':
							if (!widget.field) {
								console.error('No field defined for widget piechart')
								return resolve();
							}
							// RELATED TO PIECHART
							if (widget.field.indexOf('r_') == 0) {
								// Find option matching wdiget's targeted alias
								let targetOption;
								try {
									const options = JSON.parse(fs.readFileSync(__appPath+'/models/options/'+model.toLowerCase()+'.json', 'utf8'));
									for (const option of options) {
										if (option.relation == 'belongsTo' && option.as == widget.field) {
											targetOption = option;
											break;
										}
									}
									if (!targetOption)
										throw new Error();
								} catch(e) {
									console.error("Couldn't load piechart for "+model+" on field "+widget.field);
									return resolve();
								}

								if (targetOption.target == 'e_status') {
									const statusAlias = widget.field;
									models[model].findAll({
										attributes: [statusAlias + '.f_name', statusAlias + '.f_color', [models.sequelize.fn('COUNT', 'id'), 'count']],
										group: [statusAlias + '.f_name', statusAlias + '.f_color', statusAlias + '.id'],
										include: {model: models.E_status, as: statusAlias},
										raw: true
									}).then((piechartData) => {
										const dataSet = {labels: [], backgroundColor: [], data: []};
										for (let i = 0; i < piechartData.length; i++) {
											if (dataSet.labels.indexOf(piechartData[i].f_name) != -1) {
												dataSet.data[dataSet.labels.indexOf(piechartData[i].f_name)] += piechartData[i].count
											} else {
												dataSet.labels.push(piechartData[i].f_name);
												dataSet.backgroundColor.push(piechartData[i].f_color);
												dataSet.data.push(piechartData[i].count);
											}
										}
										widgetRes.data = dataSet;
										data[widget.widgetID] = widgetRes;
										console.log(data[widget.widgetID]);
										resolve();
									}).catch(resolve);
								}
								else {
									// Build all variables required to query piechart data
									const using = targetOption.usingField ? targetOption.usingField : [{value:'id'}];
									const selectAttributes = [];
									for (const attr of using)
										selectAttributes.push('target.'+attr.value);
									const foreignKey = targetOption.foreignKey;
									const target = models['E'+targetOption.target.substring(1)].getTableName();
									const source = models[model].getTableName();

									models.sequelize.query(`
										SELECT
											count(source.id) count, ${selectAttributes.join(', ')}
										FROM
											${source} source
										LEFT JOIN
											${target} target
										ON
											target.id = source.${foreignKey}
										GROUP BY ${foreignKey}
									`, {type: models.sequelize.QueryTypes.SELECT}).then(piechartData => {
										const dataSet = {labels: [], data: []};
										for (const pie of piechartData) {
											const labels = [];
											for (const attr of using)
												labels.push(pie[attr.value])
											dataSet.labels.push(labels.join(' - '));
											dataSet.data.push(pie.count);
										}
										widgetRes.data = dataSet;
										data[widget.widgetID] = widgetRes;
										resolve();
									}).catch(resolve);
								}
							}
							// FIELD PIECHART
							else {
								models[model].findAll({
									attributes: [widget.field, [models.sequelize.fn('COUNT', 'id'), 'count']],
									group: [widget.field],
									raw: true
								}).then((piechartData) => {
									const dataSet = {labels: [], data: []};
									for (let i = 0; i < piechartData.length; i++) {
										let label = piechartData[i][widget.field];
										if (widget.fieldType == 'enum')
											label = enums_radios.translateFieldValue(widget.entity, widget.field, label, data.req.session.lang_user);

										if(dataSet.labels.indexOf(label) != -1)
											dataSet.data[dataSet.labels.indexOf(label)] += piechartData[i].count
										else {
											dataSet.labels.push(label);
											dataSet.data.push(piechartData[i].count);
										}
									}
									widgetRes.data = dataSet;
									data[widget.widgetID] = widgetRes;
									resolve();
								}).catch(resolve);
							}
							break;

						default:
							console.error(`Widget type '${widget.type}' not found`);
							resolve();
							break;
					}
				}))(currentWidget, modelName));
			}

			await Promise.all(widgetsPromises);

			/**
			 * Called before route end
			 * @function CoreApp#widgets#beforeSend
			 * @memberof CoreApp#widgets
			 * @param {object} data
			 * @param {object} data.req - Request - See expressjs definition
			 * @param {object} data.res - Response - See expressjs definition
			 * @param {object} data.transaction - Database transaction. Use this transaction in your hooks. Commit and rollback are handled through res.success() / res.error()
			 */
			if (await this.getHook('widgets', 'beforeSend', data) === false)
				return;

			data.res.success(_ => data.res.json({
				...data,
				transaction: undefined,
				req: undefined,
				res: undefined
			}));
		}));
	}

	change_language() {
		this.router.post('/change_language', ...this.middlewares.change_language, (req, res) => {
			req.session.lang_user = req.body.lang;
			res.locals.lang_user = req.body.lang;

			// Write current lang in application.json
			appConf.lang = req.body.lang;
			fs.writeFileSync(`${__configPath}/application.json`, JSON.stringify(appConf, null, '\t'));

			res.json({
				success: true
			});
		});
	}

	get_file() {
		this.router.get('/get_file', ...this.middlewares.get_file, this.asyncRoute(async (data) => {
			const entity = data.req.query.entity;
			const id = data.req.query.id;
			const field = data.req.query.field;

			if (!access.entityAccess(data.req.session.passport.user.r_group, entity.substring(2)))
				return data.res.error(_ => data.res.status(403).end());

			const row = await models[entity.capitalizeFirstLetter()].findOne({where: {id}});
			if (!row)
				return data.res.error(_ => data.res.status(404).end());

			const buffer = await file_helper.readBuffer(row[field]);
			data.res.success(_ => data.res.json({
				data: buffer,
				file: file_helper.originalFilename(row[field])
			}));
		}));
	}

	download() {
		this.router.get('/download', ...this.middlewares.download, this.asyncRoute(async (data) => {
			const entity = data.req.query.entity;
			const id = data.req.query.id;
			const field = data.req.query.field;

			if (!access.entityAccess(data.req.session.passport.user.r_group, entity.substring(2)))
				return data.res.error(_ => data.res.status(403).end());

			const row = await models[entity.capitalizeFirstLetter()].findOne({where: {id}});
			if (!row)
				return data.res.error(_ => data.res.status(404).end());

			const path = file_helper.fullPath(row[field]);
			const filename = file_helper.originalFilename(row[field]);
			data.res.success(_ => data.res.download(path, filename, function (err) {
				if (err)
					console.error(err);
			}));
		}));
	}

	translate() {
		this.router.post('/translate', ...this.middlewares.translate, this.asyncRoute(async (data) => {
			data.res.success(_ => data.res.send(language(data.req.body.lang).__(data.req.body.key, data.req.body.params)));
		}));
	}
}

module.exports = CoreApp;