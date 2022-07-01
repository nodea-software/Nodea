const globalConf = require('@config/global');
const models = require('@app/models');
const attributes = require('@app/models/attributes/e_task');
const options = require('@app/models/options/e_task');

const multer = require('multer');
const upload = multer().single('file');
const moment = require('moment');
const fs = require('fs-extra');

const ApiEntity = require('@core/abstract_routes/api_entity');

class ApiE_inline_help extends ApiEntity {
	constructor() {
		const additionalRoutes = ['download_program', 'error_file'];
		super('e_task', attributes, options, additionalRoutes)
	}

	download_program() {
		this.router.get('/:id/downloadProgram', this.asyncRoute(async (req, res) => {
			const task = await models.E_task.findOne({
				where: {id: req.params.id},
				include: {
					model: models.E_process,
					as: 'r_process',
					include: {
						model: models.E_program,
						as: 'r_program'
					}
				}
			});
			if (!task || !task.r_process || !task.r_process.r_program || !task.r_process.r_program.f_program_file)
				return res.sendStatus(404);
			const fileField = task.r_process.r_program.f_program_file;
			const fileFolder = fileField.split('-')[0];
			const filePath = globalConf.localstorage+'/e_program/'+fileFolder+'/'+fileField;

			res.download(filePath);
		}));
	}

	error_file() {
		this.router.post('/:id/error_file', this.asyncRoute(async (req, res) => {
			upload(req, res, error => {
				if (error) {
					console.error(error);
					return res.status(500).end(error);
				}
				if (!req.file) {
					console.error("No file found in request");
					return res.status(500).end("No file found in request");
				}

				const id_task = req.params.id;
				const folderName = moment().format('YYYYMMDD');
				const fileName = `${folderName}-${moment().format('hhmmss')}_${req.file.originalname}`;
				const basePath = `${globalConf.localstorage}/e_documents_task/${folderName}/`;
				fs.mkdirs(basePath, err => {
					if (err) {
						console.error(err);
						return res.status(500).end(error);
					}
					const outStream = fs.createWriteStream(basePath+fileName);
					outStream.write(req.file.buffer);
					outStream.end();
					outStream.on('finish', err => {
						if (err) {
							console.error("Couldn't create task's error file");
							console.error(err);
							return res.status(500).end();
						}
						models.E_documents_task.create({
							f_name: req.file.originalname,
							f_filename: fileName,
							fk_id_task: id_task
						}, {user: req.user}).then(_ => {
							console.log("Task's error file created");
							res.end();
						}).catch(err => {
							console.error("Couldn't create Documents task DB row");
							console.error(err);
							res.status(500).end();
						});
					});
				});
			});
		}));
	}

	get hooks() {
		return {
			find:{},
			findOne:{},
			findAssociation:{},
			create:{},
			update:{},
			destroy:{}
		}
	}

	get middlewares() {
		return {
			find:[],
			findOne:[],
			findAssociation:[],
			create:[],
			update:[],
			destroy:[]
		}
	}
}

module.exports = ApiE_inline_help;
