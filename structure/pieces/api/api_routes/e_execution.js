const attributes = require('@app/models/attributes/e_execution');
const options = require('@app/models/options/e_execution');
const models = require('@app/models');

const ApiEntity = require('@core/abstract_routes/api_entity');

const middlewares = require('@core/helpers/middlewares');
const file_helper = require('@core/helpers/file');

class ApiExecution extends ApiEntity {
	constructor() {
		const additionalRoutes = ['log_file'];
		super('e_execution', attributes, options, additionalRoutes)
	}

	log_file() {
		this.router.get('/:id/logFile', middlewares.fileInfo(['file']), this.asyncRoute(async (data) => {
			const { req, res } = data;
			const execution = await models.E_execution.findOne({where: {id: req.params.id}});
			if (!execution) {
				console.error("Execution not found");
				return res.error(_ => res.status(404).end("Execution not found"));
			}

			const file = req.files['file'] && req.files['file'][0];
			if (!file)
				throw new Error("No file found in request");

			const [filePath, filename] = file_helper.createPathAndName(this.e_entity, file.originalname);
			const finalPath = filePath + filename;
			data.files.push({
				...file,
				finalPath
			});
			await execution.update({
				f_logs: filename,
			}, {user: req.user})

			res.success(_ => res.end());
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
			find:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			findOne:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			findAssociation:[
				middlewares.apiActionAccess(this.entity, "read")
			],
			create:[
				middlewares.apiActionAccess(this.entity, "create")
			],
			update:[
				middlewares.apiActionAccess(this.entity, "update")
			],
			destroy:[
				middlewares.apiActionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = ApiExecution;
