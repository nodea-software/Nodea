const fs = require('fs-extra');
const request = require('request');
const moment = require('moment');
const exec = require('child_process');

const Route = require('@core/abstract_routes/route');

const helpers = require('@core/helpers');
const language = helpers.language;
const entity = helpers.entity;
const model_builder = helpers.model_builder;
const datatable = helpers.datatable;
const block_access = helpers.access;

const sqliteImporter = require('@core/utils/sqlite_importer');

const globalConf = require('@config/global');
const dbconfig = require('@config/database');

const models = require('@app/models/');
const options = require('@app/models/options/e_synchronization');

// Write process stdout to given file
// To avoid buffer overflow, we use two streams that read/write on data event
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
			childProcess.stdout.on('data', function(stdout) {
				fileStream.write(stdout);
			});
			// Child Error output
			childProcess.stderr.on('data', function(stderr) {
				// There is no difference between error and warning
				// If we find a warning label, ignore error (which is not one)
				if (stderr.indexOf("Warning:") == 0)
					return;
				console.error(stderr);
				fileStream.end();
				childProcess.kill();
				reject(stderr);
			});

			// Child error
			childProcess.on('error', function(error) {
				console.error(error);
				fileStream.end();
				childProcess.kill();
				reject(error);
			});
			// Child close
			childProcess.on('close', _ => {
				fileStream.end();
				resolve();
			});
		});
	});
}

class Synchronization extends Route {

	constructor(additionalRoutes = []) {
		const registeredRoutes = [
			'show',
			'list_dump',
			'datalist',
			'delete',
			'generate',
			'check_state',
			'synchronize',
			...additionalRoutes
		];
		super(registeredRoutes);
		this.SYNCHRO_STATE = false;
	}

	show() {
		this.router.get('/show', this.middlewares.show, this.asyncRoute(async(req, res) => {
			const tab = req.query.tab;
			const data = {
				menu: "e_synchronization",
				sub_menu: "list_e_synchronization",
				tab: tab,
				env: globalConf.env
			};

			// Load list of entities to select for synchronyzation
			// Filter list depending on config/application.json - ignore_list array
			const entities = [];
			const dumpConfigEntities = JSON.parse(fs.readFileSync(__dirname + '/../config/synchro_dump.json', 'utf8'));
			fs.readdirSync(__dirname + '/../models/attributes/').filter(function(file) {
				return file.indexOf('.') !== 0 &&
					file.slice(-5) === '.json' &&
					file.substring(0, 2) == 'e_' &&
					globalConf.synchronization.ignore_list.indexOf(file.slice(0, -5)) == -1;
			}).forEach(function(file) {

				const fields = [];
				const entityName = file.substring(0, file.length - 5);
				const modelName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
				const tableName = models[modelName].getTableName();

				const entityObject = {
					tradKey: 'entity.' + entityName + '.label_entity',
					entity: entityName,
					fields: fields,
					tableName: tableName
				};
				for (let i = 0; i < dumpConfigEntities.length; i++)
					if (dumpConfigEntities[i] == entityName)
						entityObject.checked = true;

				entities.push(entityObject);
			});

			data.entities = entities;

			res.render('e_synchronization/show', data);
		}));
	}

	list_dump() {
		this.router.get('/list_dump', this.middlewares.list_dump, this.asyncRoute(async(req, res) => {
			res.render('e_synchronization/list');
		}));
	}

	datalist() {
		this.router.post('/datalist', this.middlewares.datalist, this.asyncRoute(async(req, res) => {
			const include = model_builder.getDatalistInclude(models, options, req.body.columns);
			const rawData = await datatable("E_synchronization", req.body, include);
			const preparedData = await entity.prepareDatalistResult('e_synchronization', rawData, req.session.lang_user);
			res.send(preparedData).end();
		}));
	}

	delete() {
		this.router.post('/delete', this.middlewares.delete, this.asyncRoute(async(req, res) => {
			const id = parseInt(req.body.id);

			const deleteObject = await models.E_synchronization.findOne({where: {id: id}});
			await deleteObject.destroy();
			req.session.toastr = [{
				message: 'message.delete.success',
				level: "success"
			}];

			res.redirect('/synchronization/list_dump');
		}));
	}

	// *********** Cloud function *************
	// This method is called to generate data that must be sent to tablets
	// *****************************************
	generate() {
		this.router.post('/generate', this.middlewares.generate, this.asyncRoute(async(req, res) => {

			const tables = [], entityList = [];
			// Build to synchronize entity list from client form
			for (const key in req.body)
				if (req.body[key] == "true") {
					const tableName = models[entity.capitalizeFirstLetter(key)].getTableName();
					tables.push(tableName);
					entityList.push(key);
				}

			const cmd = "mysqldump";
			// Build process arguments array, each one need to be in a separate array cell
			// "--add-drop-table",
			let cmdArgs = [
				"--default-character-set=utf8",
				"-u",
				dbconfig.user,
				"-p" + dbconfig.password,
				dbconfig.database,
				"-h" + dbconfig.host,
			];

			// Export selected tables
			if (cmdArgs.length) {
				cmdArgs.push("--tables");
				cmdArgs = cmdArgs.concat(tables);
			}

			// Execute dump and write output to file
			try {
				await fullStdoutToFile(cmd, cmdArgs, globalConf.syncfolder + '/dump_mysql_data.sql');
			} catch(err) {
				// node couldn't execute the command
				req.session.toastr = [{
					message: 'message.update.failure',
					level: "error"
				}];
				console.error(err);

				return res.redirect('/synchronization/show');
			}

			console.log('Cloud data file generated');
			req.session.toastr = [{
				message: 'synchro.process.dumped',
				level: "success"
			}];

			// Write entity dump list to config file
			fs.writeFileSync(__dirname+'/../config/synchro_dump.json', JSON.stringify(entityList, null, 4), 'utf8');

			const cwd = globalConf.syncfolder;

			// Check if windows of linux for exec syntax
			exec.exec('./mysql2sqlite.sh ' + cwd + '/dump_mysql_data.sql > ' + cwd + '/dump_cloud_data.sql', {cwd: cwd}, error => {
				// work with result
				if (error)
					console.log(error);
				return res.redirect('/synchronization/show');
			});
		}));
	}

	// *********** Tablet function *************
	// This method is called in AJAX by Tablet to synchronize its data with the Cloud instance
	// *****************************************
	// Route called by tablet's client to check for synchro status.
	// Just return global var this.SYNCHRO_STATE to query, content is set in /synchronize
	check_state() {
		this.router.get('/check_state', this.middlewares.check_state, this.asyncRoute((req, res) => {
			res.json(this.SYNCHRO_STATE).end();
		}));
	}

	synchronize() {
		this.router.get('/synchronize', this.middlewares.synchronize, this.asyncRoute(async(req, res) => {

			// End request right away to monitor synchro through `/check_state`
			res.end();

			this.SYNCHRO_STATE = {done: false, error: null};

			// Récupération du token
			let token = '';
			const credentials = await models.E_synchro_credentials.findAll();

			// API credentials
			let cloudHost = "", clientKey = "", clientSecret = "";
			if (!credentials || credentials.length == 0) {
				this.SYNCHRO_STATE.error = language(req.session.lang_user).__("synchro.process.no_credentials");
				return console.error("Synchronize: No Synchro credentials found");
			}
			cloudHost = credentials[0].f_cloud_host;
			clientKey = credentials[0].f_client_key;
			clientSecret = credentials[0].f_client_secret;

			// Base64 encoding
			const auth = 'Basic ' + new Buffer(clientKey + ':' + clientSecret).toString('base64');
			const apiBaseUrl = cloudHost + "/api";

			request({
				url : apiBaseUrl + "/getToken",
				headers : {"Authorization" : auth}
			}, (error, response, body) => {
				if (error || response.statusCode != 200) {
					this.SYNCHRO_STATE.error = language(req.session.lang_user).__("synchro.process.connection_failed");
					return console.error("Synchronize: API /getToken failed");
				}

				body = JSON.parse(body);
				token = body.token;

				// Send journal file to cloud
				const requestCall = request.post({
					url: apiBaseUrl+'/synchronization/situation?token='+token
				}, (err, response) => {
					if (err || response.statusCode != 200) {
						this.SYNCHRO_STATE.error = "Couldn't send `journal.json` to API";
						return console.error(err);
					}

					// Save Journal locally
					const current_date = new moment().format("DDMMYYYYHHmmssSSS");
					fs.copySync(globalConf.syncfolder + '/journal.json', globalConf.syncfolder + '/journal' + current_date + '.json');

					// Empty journal
					fs.writeFile(globalConf.syncfolder + '/journal.json', '{"transactions":[]}', (error) => {
						if (error) {
							console.log('Synchronize: Journal couldn\'t be emptied');
							console.error(error);
						}
						else
							console.log('Synchronize: Journal emptied');
					});

					// Write Cloud dump into file
					fs.writeFile(globalConf.syncfolder + '/dump_cloud_data.sql', response.body, (err) => {
						if (err) {
							this.SYNCHRO_STATE.error = "Impossible to create MySQL dump file";
							return console.error(err);
						}

						console.log('Synchronize: Cloud data file stored locally');

						// Only manual Dump enables to define relevant options
						sqliteImporter.importSQL(globalConf.syncfolder + '/dump_cloud_data.sql').then( () => {

							console.log('Synchronize: Cloud database loaded');

							// Start file uploads to CLOUD
							const daysFoldersPath = [];
							try {
								// Recusively parse upload folder to get all files URI
								fs.readdirSync(globalConf.localstorage).filter((entityFolder) =>
									entityFolder != 'thumbnail'
								).forEach(function(entityFolder) {
									if (!fs.statSync(globalConf.localstorage+entityFolder).isDirectory())
										return;
									fs.readdirSync(globalConf.localstorage+entityFolder).forEach((dayFolder) => {
										daysFoldersPath.push({entity: entityFolder, URI: __dirname+'/../upload/'+entityFolder+'/'+dayFolder});
									});
								});
							} catch(e) {
								if (e.code != 'ENOENT')
									console.error(e);
							}

							// Build object with URI/entityName
							const fullPathFiles = [];
							for (let i = 0; i < daysFoldersPath.length; i++) {
								fs.readdirSync(daysFoldersPath[i].URI).forEach((file) => {
									fullPathFiles.push({URI: daysFoldersPath[i].URI+'/'+file, entity: daysFoldersPath[i].entity});
								});
							}
							// Send each file and delete it when done
							if (fullPathFiles.length > 0) {
								function sendFile(fileList, idx) { // eslint-disable-line
									const current = fileList[idx];
									const requestCall = request.post({
										url: apiBaseUrl+'/synchronization/file_upload?token='+token+'&entity='+current.entity,
									}, err => {
										if (err) {
											console.error(err);
											console.error("Synchronize: Couldn't send file "+current.URI);
										}
										else
											fs.unlink(current.URI, (err) => {if (err) console.error('Couldn\'t delete '+current.URI);});

										console.log("File ["+current.URI+"] uploaded");
										if (!fileList[idx+1]) {
											console.log("Synchronize: Upload done");
											this.SYNCHRO_STATE.done = true;
										}
										else
											sendFile(fileList, idx+1);
									});
									const requestForm = requestCall.form();
									requestForm.append('file', fs.createReadStream(current.URI));
								}
								console.log("Synchronize: Starting files upload");
								sendFile(fullPathFiles, 0);
							}
							else {
								console.log("Synchronize: Nothing to upload");
								this.SYNCHRO_STATE.done = true;
							}
						});
					});
				});
				const requestForm = requestCall.form();
				// requestForm.append('file', fs.createReadStream(__dirname + '/../sync/journal.json'));
				requestForm.append('file', fs.createReadStream(globalConf.syncfolder + '/journal.json'));
			});
		}));
	}

	get middlewares() {
		return {
			show: [
				block_access.actionAccessMiddleware("synchronization", "read")
			],
			list_dump: [
				block_access.actionAccessMiddleware("synchronization", "read")
			],
			datalist: [
				block_access.actionAccessMiddleware("synchronization", "read")
			],
			delete: [
				block_access.actionAccessMiddleware("synchronization", "read")
			],
			generate: [
				block_access.actionAccessMiddleware("synchronization", "create")
			],
			check_state: [
				block_access.actionAccessMiddleware("synchronization", "read")
			],
			synchronize: [
				block_access.actionAccessMiddleware("synchronization", "read")
			]
		}
	}
}

module.exports = Synchronization;