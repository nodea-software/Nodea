const fs = require('fs-extra');
const moment = require("moment");
const exec = require('child_process');

const dbConfig = require('@config/database');
const globalConf = require('@config/global');
const Route = require("@core/abstract_routes/route");
const models = require('@app/models/');
const file_helper = require('@core/helpers/file');
const access_helper = require('@core/helpers/access');

class CoreImportExport extends Route {

	constructor() {
		super([
			'db_show',
			'db_export',
			'db_import',
			'access_show',
			'access_export',
			'access_import'
		]);
	}

	db_show() {
		this.router.get('/db_show', ...this.middlewares.db_show, (req, res) => {
			if (dbConfig.dialect != "mysql" && dbConfig.dialect != "mariadb") {
				req.session.toastr = [{
					message: 'administration.import_export.db.wrong_dialect',
					level: "error"
				}];
				return res.redirect("/module/administration")
			}

			const data = {};
			let entities = [];
			const through = [];
			const association_table = [];

			fs.readdirSync(__appPath + '/models/options/').filter(file => file.indexOf('.') !== 0 && file.slice(-5) === '.json' && file.substring(0, 2) == 'e_').forEach(file => {
				// Get primary tables
				const entityName = file.substring(0, file.length - 5);
				const modelName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
				let tableName;
				try {
					tableName = models[modelName].getTableName();
				} catch(err) {
					console.error(err);
				}
				const entityObject = {
					tradKey: 'entity.' + entityName + '.label_entity',
					tableName: tableName
				};
				entities.push(entityObject);

				const currentFile = JSON.parse(fs.readFileSync(__appPath + '/models/options/' + file))
				// Get through tables
				for (let i = 0; i < currentFile.length; i++) {
					if (typeof currentFile[i].through === "string" && through.indexOf(currentFile[i].through) == -1) {
						through.push(currentFile[i].through);
						association_table.push({
							tradKey: 'N,N - ' + entityName.substring(2) + '_' + currentFile[i].target.substring(2) + ' | ' + currentFile[i].as,
							tableName: currentFile[i].through
						});
					}
				}
			})

			entities = entities.concat(association_table);

			data.entities = entities;
			res.render('import_export/db_show', data);
		})
	}

	db_export() {
		this.router.post('/db_export', ...this.middlewares.db_export, (req, res) => {
			if (dbConfig.password != req.body.db_password) {
				req.session.toastr = [{
					message: 'administration.import_export.db.wrong_db_pwd',
					level: "error"
				}];
				return res.redirect("/import_export/db_show")
			}

			const tables = [];
			for (const prop in req.body)
				if (prop != "all_db" && req.body[prop] == "true")
					tables.push(prop);

			if (tables.length == 0 && req.body.all_db == "false") {
				req.session.toastr = [{
					message: 'administration.import_export.db.no_choice',
					level: "error"
				}];
				return res.redirect("/import_export/db_show")
			}

			const cmd = "mysqldump";
			let cmdArgs = [
				"--default-character-set=utf8",
				"--add-drop-table",
				"--no-tablespaces",
				"--complete-insert",
				"-u",
				dbConfig.user,
				"-p" + dbConfig.password,
				dbConfig.database,
				"-h" + dbConfig.host,
			];

			// Export selected tables
			if (cmdArgs.length && req.body.all_db == "false") {
				cmdArgs.push("--tables");
				cmdArgs = cmdArgs.concat(tables);
			}

			function fullStdoutToFile(cmd, args, filePath) {
				return new Promise((resolve, reject) => {
					// Create and open file writeStream
					const fileStream = fs.createWriteStream(filePath);
					fileStream.on('open', _ => {

						// Exec instruction
						const childProcess = exec.spawn(cmd, args);
						childProcess.stdout.setEncoding('utf8');
						childProcess.stderr.setEncoding('utf8');

						// Child Success output
						childProcess.stdout.on('data', stdout => {
							fileStream.write(stdout);
						})
						// Child Error output
						childProcess.stderr.on('data', stderr => {
							// Avoid reject if only warning
							if (stderr.toLowerCase().indexOf("warning") != -1) {
								console.log("!! mysqldump ignored warning !!: " + stderr)
								return;
							}
							fileStream.end();
							childProcess.kill();
							reject(stderr);
						})

						// Child error
						childProcess.on('error', err => {
							fileStream.end();
							childProcess.kill();
							console.error(err);
							reject(err);
						})
						// Child close
						childProcess.on('close', _ => {
							fileStream.end();
							resolve();
						})
					})
				})
			}

			const dumpName = 'dump_db_data_' + moment().format("YYYYMMDD-HHmmss") + '.sql';
			const dumpPath = __dirname + '/../../' + dumpName;

			fullStdoutToFile(cmd, cmdArgs, dumpPath).then(_ => {
				res.download(dumpPath, dumpName, err => {
					if (err)
						console.error(err);
					fs.unlinkSync(dumpPath);
				})
			}).catch(err => {
				console.error(err);
			})
		})
	}

	db_import() {
		this.router.post('/db_import', ...this.middlewares.db_import, this.asyncRoute(async (data) => {

			if (data.req.files.import_file.length == 0) {
				data.req.session.toastr = [{
					message: 'administration.import_export.db.file_needed',
					level: "error"
				}];
				return data.res.error(async _ => data.res.redirect("/import_export/db_show"));
			}

			const file = data.req.files.import_file[0];
			const filePath = globalConf.localstorage + file.originalname;
			await file_helper.write(filePath, file.buffer);

			if (dbConfig.password != data.req.body.db_password) {
				data.req.session.toastr = [{
					message: 'administration.import_export.db.wrong_db_pwd',
					level: "error"
				}];
				fs.unlinkSync(filePath);
				return data.res.error(async _ => data.res.redirect("/import_export/db_show"));
			}

			const cmd = "mysql";
			const cmdArgs = [
				"-u",
				dbConfig.user,
				"-p" + dbConfig.password,
				dbConfig.database,
				"-h" + dbConfig.host,
				"--default-character-set=utf8",
				"<",
				filePath
			];

			function handleExecStdout(cmd, args) {
				return new Promise((resolve, reject) => {

					// Exec instruction
					const childProcess = exec.spawn(cmd, args, {
						shell: true,
						detached: true
					});
					childProcess.stdout.setEncoding('utf8');
					childProcess.stderr.setEncoding('utf8');

					// Child Success output
					childProcess.stdout.on('data', stdout => {
						console.log(stdout)
					});

					// Child Error output
					childProcess.stderr.on('data', stderr => {
						// Avoid reject if only warning
						if (stderr.toLowerCase().indexOf("warning") != -1) {
							console.log("!! mysql ignored warning !!: " + stderr)
							return;
						}
						reject(stderr);
						childProcess.kill();
					});

					// Child error
					childProcess.on('error', error => {
						reject(error);
						childProcess.kill();
					});

					// Child close
					childProcess.on('close', _ => {
						resolve();
					});
				});
			}

			handleExecStdout(cmd, cmdArgs).then(_ => {
				fs.unlinkSync(filePath);
				data.req.session.toastr = [{
					message: 'administration.import_export.db.import_success',
					level: "success"
				}];
				data.res.success(async _ => data.res.redirect("/import_export/db_show"));
			}).catch(err => {
				console.error(err);
				data.req.session.toastr = [{
					message: "administration.import_export.db.import_error",
					level: "error"
				}];
				data.res.error(async _ => data.res.redirect("/import_export/db_show"));
			})
		}));
	}

	access_show() {
		this.router.get('/access_show', ...this.middlewares.access_show, (req, res) => {
			res.render('import_export/access_show');
		})
	}

	access_export() {
		this.router.get('/access_export', ...this.middlewares.access_export, (req, res) => {
			const dumpPath = __configPath + '/access.json';
			res.download(dumpPath, "access_conf_" + moment().format("YYYYMMDD-HHmmss") + ".json", err => {
				if (err) {
					console.error(err);
					req.session.toastr.push({
						message: err,
						level: "error"
					});
					return res.redirect("/import_export/access_show");
				}
			})
		})
	}

	access_import() {
		this.router.post('/access_import', ...this.middlewares.access_import, this.asyncRoute(async (data) => {
			const access_file = data.req.files.import_file[0];
			fs.writeFileSync(__configPath + "/access.json", access_file.buffer, 'utf8');
			data.req.session.toastr.push({
				message: "settings.tool_success",
				level: "success"
			});
			access_helper.reloadAccess();
			return data.res.success(_ => data.res.redirect("/import_export/access_show"));
		}));
	}
}

module.exports = CoreImportExport;