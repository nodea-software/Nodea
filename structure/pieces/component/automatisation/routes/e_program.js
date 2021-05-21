const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_program');
const attributes = require('@app/models/attributes/e_program');
const models = require('@app/models');

const helpers = require('@core/helpers');
const access = helpers.access;

const upload = require('multer');
const multer = upload();
const duplicate = require('@core/utils/duplicate_entity');
const moment = require('moment');
const fs = require('fs-extra');

class Program extends Entity {
	constructor() {
		const additionalRoutes = ['generate_and_replace', 'generate', 'duplicate'];
		super('e_program', attributes, options, helpers, additionalRoutes);
	}

	generate_and_replace() {
		this.router.get('/generate_and_replace', access.actionAccessMiddleware('program', 'create'), this.asyncRoute(async (data) => {
			const idProgram = data.req.query.id;
			const zipFilePath = await helpers.program.generateZip(idProgram);

			const program = await models.E_program.findOne({where: {id: idProgram}});
			if (!program)
				throw new Error("Couldn't find Program");

			let dateFolder;
			if (program.f_program_file && program.f_program_file.length)
				dateFolder = program.f_program_file.substring(0, 8);
			else {
				dateFolder = moment().format('YYYYMMDD');
				await program.update({f_program_file: `${dateFolder}-${moment().format('hhmmss')}_Program_file.zip`}, {transaction: data.transaction});
			}
			fs.copySync(zipFilePath, `${__appPath}/../upload/e_program/${dateFolder}/${program.f_program_file}`);
			fs.unlink(zipFilePath);

			data.req.session.toastr = [{level: 'success', message: "automation.zip_created_replaced"}]
			data.res.success(_ => data.res.redirect('/program/show?id='+idProgram));

		}));
	}

	generate() {
		this.router.get('/generate', access.actionAccessMiddleware('program', 'create'), this.asyncRoute(async (data) => {
			const idProgram = data.req.query.id;

			const zipFilePath = await helpers.program.generateZip(idProgram);
			data.res.success(_ => data.res.download(zipFilePath, function() {
				fs.unlink(zipFilePath);
			}));
		}));
	}

	duplicate() {
		this.router.get('/duplicate', access.actionAccessMiddleware('program', 'create'), this.asyncRoute(async (data) => {
			const idProgram = data.req.query.id;

			const include = helpers.model_builder.getIncludeFromFields(models, 'e_program', ['r_page.id' ]);
			const [newId] = await duplicate(idProgram, 'e_program', include);
			data.req.session.toastr = [{level: 'success', message:'automation.duplication_success'}];
			data.res.success(_ => data.res.redirect('/program/show?id='+newId));
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
				// beforeRedirect: async(data) => {}
			},
			update_form: {
				// start: async (data) => {},

				// afterEntityQuery: async(data) => {},
				// beforeRender: async(data) => {}
			},
			update: {
				// start: async (data) => {},
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
				// start: async (data) => {},
				// beforeEntityQuery: async(data) => {},
				// beforeDestroy: async(data) => {},
				// beforeRedirect: async(data) => {},
			}
		};
	}

	get middlewares() {
		return {
			list: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			datalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			subdatalist: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			show: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			create_form: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			create: [
				access.actionAccessMiddleware(this.entity, "create"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.nodeaType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			update_form: [
				access.actionAccessMiddleware(this.entity, "update")
			],
			update: [
				access.actionAccessMiddleware(this.entity, "update"),
				(req, res, next) => {
					const fileFields = [];
					for (const fieldName in this.attributes) {
						const field = this.attributes[fieldName];
						if (['file', 'picture'].includes(field.nodeaType))
							fileFields.push({name: fieldName, maxCount: field.maxCount || 1});
					}
					let fileMiddleware;
					if (fileFields.length == 0)
						fileMiddleware = multer.none();
					else
						fileMiddleware = multer.fields(fileFields);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			loadtab: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			set_status: [
				access.actionAccessMiddleware(this.entity, "read"),
				access.statusGroupAccess
			],
			search: [
				access.actionAccessMiddleware(this.entity, "read")
			],
			fieldset_remove: [
				access.actionAccessMiddleware(this.entity, "delete")
			],
			fieldset_add: [
				access.actionAccessMiddleware(this.entity, "create")
			],
			destroy: [
				access.actionAccessMiddleware(this.entity, "delete")
			]
		}
	}
}

module.exports = Program;