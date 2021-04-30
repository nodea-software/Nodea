const attributes = require('@app/models/attributes/e_execution');
const options = require('@app/models/options/e_execution');
const models = require('@app/models');

const ApiEntity = require('@core/abstract_routes/api_entity');

const globalConf = require('@config/global');
const multer = require('multer');
const upload = multer().single('file');
const moment = require('moment');
const fs = require('fs-extra');

class ApiExecution extends ApiEntity {
	constructor() {
		const additionalRoutes = ['log_file'];
		super('e_execution', attributes, options, additionalRoutes)
	}

	log_file() {
		this.router.get('/:id/logFile', this.asyncRoute(async (req, res) => {
			await new Promise((resolve, reject) => {
				upload(req, res, error => {
					if (error) {
						console.error(error);
						return reject(error);
					}
					if (!req.file) {
						console.error("No file found in request");
						return reject("No file found in request");
					}
					resolve();
				});
			});

			const execution = await models.E_execution.findOne({where: {id: req.params.id}});
			if (!execution) {
				console.error("Execution not found");
				return res.status(500).end("Execution not found");
			}
			const folderName = moment().format('YYYYMMDD');
			const fileName = `${folderName}-${moment().format('hhmmss')}_${req.file.originalname}`;
			const basePath = `${globalConf.localstorage}/e_execution/${folderName}/`;
			fs.mkdirSync(basePath, {recursive: true});
			const outStream = fs.createWriteStream(basePath+fileName);
			await new Promise((resolve, reject) => {
				outStream.write(req.file.buffer);
				outStream.end();
				outStream.on('finish', err => {
					if (err) {
						console.error("Couldn't create task's error file");
						return reject(err);
					}
					resolve();
				})
			});
			await execution.update({
				f_logs: fileName,
			}, {user: req.user})
			console.log("Execution's error file created");
			res.end();
		}));
	}

	get hooks() {
		return {
			find:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			findOne:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			findAssociation:{
				// beforeFind: async _ => {},
				// afterFind: async _ => {},
			},
			create:{
				// beforeCreate: async _ => {},
				// beforeAssociations: async _ => {},
				// afterAssociations: async _ => {},
			},
			update:{
				// beforeUpdate: async _ => {},
				// beforeAssociations: async _ => {},
				// afterAssociations: async _ => {},
			},
			destroy:{
				// beforeDestroy: async _ => {},
				// afterDestroy: async _ => {},
			}
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

module.exports = ApiExecution;
