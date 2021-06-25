const attributes = require('@app/models/attributes/e_task');
const options = require('@app/models/options/e_task');
const models = require('@app/models');
const file_helper = require('@core/helpers/file');

const ApiEntity = require('@core/abstract_routes/api_entity');

const crypto = require('../utils/crypto_helper');

class ApiTask extends ApiEntity {
	constructor() {
		const additionalRoutes = ['download_program', 'decrypt'];
		super('e_task', attributes, options, additionalRoutes)
	}

	download_program() {
		this.router.get('/:id/downloadProgram', this.asyncRoute(async (data) => {
			const { req, res } = data;
			const task = await models.E_task.findOne({
				where: {id: req.params.id},
				include: {
					model: models.E_traitement,
					as: 'r_traitement',
					include: {
						model: models.E_program,
						as: 'r_program'
					}
				}
			});
			if (!task || !task.r_traitement || !task.r_traitement.r_program || !task.r_traitement.r_program.f_fichier_program)
				return res.error(_ => res.sendStatus(404));

			const filePath = file_helper.fullPath(task.r_traitement.r_program.f_fichier_program);

			res.success(_ => res.download(filePath));
		}));
	}

	decrypt() {
		this.router.post('/decrypt', this.asyncRoute((req, res) => {
			const text = crypto.decrypt(req.body.value);
			res.success(_ => res.status(200).json(text));
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

module.exports = ApiTask;
