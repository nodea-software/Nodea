const Entity = require('@core/abstract_routes/entity');

const options = require('@app/models/options/e_program');
const attributes = require('@app/models/attributes/e_program');
const models = require('@app/models');

const helpers = require('@core/helpers');
const middlewares = helpers.middlewares;

const duplicate = require('@core/utils/duplicate_entity');
const fs = require('fs-extra');

class Program extends Entity {
	constructor() {
		const additionalRoutes = ['generate_and_replace', 'generate_pages', 'generate_zip', 'duplicate'];
		super('e_program', attributes, options, helpers, additionalRoutes);
	}

	generate_pages() {
		this.router.get('/generate_pages', middlewares.actionAccess("program", "create"), middlewares.actionAccess("page", "create"), this.asyncRoute(async data => {
			const {req, res} = data;
			const idProgram = req.query.id;

			const program = await models.E_program.findOne({where: {id: idProgram}})
			if (!program) {
				req.session.toastr = [{level: 'error', message: "error.404"}];
				return res.error(_ => res.redirect("/program/show?id="+idProgram+"#r_page"));
			}
			if (!program.f_program_file) {
				req.session.toastr = [{level: 'error', message: "automation.no_zip_for_pages"}];
				return res.error(_ => res.redirect("/program/show?id="+idProgram+"#r_page"));
			}

			const zipPath = helpers.file.fullPath(program.f_program_file);
			await helpers.program.generatePages(program.id, zipPath, req.user)
			req.session.toastr = [{level: 'success', message: 'Pages générées'}];
			res.success(_ => res.redirect(`/program/show?id=${program.id}#r_page`));
		}));
	}

	generate_and_replace() {
		this.router.get('/generate_and_replace', middlewares.actionAccess('program', 'create'), this.asyncRoute(async (data) => {
			const idProgram = data.req.query.id;

			const program = await models.E_program.findOne({where: {id: idProgram}});
			if (!program)
				throw new Error("Couldn't find Program");

			const zipFilePath = await helpers.program.generateZip(idProgram);
			let programFile;
			if (program.f_program_file && program.f_program_file.length)
				programFile = program.f_program_file;
			else {
				const [filePath, fileName] = helpers.file.createPathAndName('e_program', 'program_file.zip');
				programFile = `${filePath}/${fileName}`;
				await program.update({f_program_file: programFile}, {transaction: data.transaction});
			}
			fs.copySync(zipFilePath, helpers.file.fullPath(programFile));
			fs.unlink(zipFilePath);

			data.req.session.toastr = [{level: 'success', message: "automation.zip_created_replaced"}]
			data.res.success(_ => data.res.redirect('/program/show?id='+idProgram));

		}));
	}

	generate_zip() {
		this.router.get('/generate', middlewares.actionAccess('program', 'create'), this.asyncRoute(async (data) => {
			const idProgram = data.req.query.id;

			const zipFilePath = await helpers.program.generateZip(idProgram);
			data.res.success(_ => data.res.download(zipFilePath, function() {
				fs.unlink(zipFilePath);
			}));
		}));
	}

	duplicate() {
		this.router.get('/duplicate', middlewares.actionAccess('program', 'create'), this.asyncRoute(async (data) => {
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
				middlewares.actionAccess(this.entity, "read")
			],
			datalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			subdatalist: [
				middlewares.actionAccess(this.entity, "read")
			],
			show: [
				middlewares.actionAccess(this.entity, "read")
			],
			create_form: [
				middlewares.actionAccess(this.entity, "create")
			],
			create: [
				middlewares.actionAccess(this.entity, "create"),
				middlewares.fileInfo(this.fileFields)
			],
			update_form: [
				middlewares.actionAccess(this.entity, "update")
			],
			update: [
				middlewares.actionAccess(this.entity, "update"),
				middlewares.fileInfo(this.fileFields)
			],
			loadtab: [
				middlewares.actionAccess(this.entity, "read")
			],
			set_status: [
				middlewares.actionAccess(this.entity, "read"),
				middlewares.statusGroupAccess
			],
			search: [
				middlewares.actionAccess(this.entity, "read")
			],
			fieldset_remove: [
				middlewares.actionAccess(this.entity, "delete")
			],
			fieldset_add: [
				middlewares.actionAccess(this.entity, "create")
			],
			destroy: [
				middlewares.actionAccess(this.entity, "delete")
			]
		}
	}
}

module.exports = Program;