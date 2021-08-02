const CoreImportExport = require('@core/routes/import_export.js');
const middlewares = require('@core/helpers/middlewares');

class ImportExport extends CoreImportExport {
	constructor() {
		const additionalRoutes = [];
		super(additionalRoutes);
	}

	get hooks() {
		return {}
	}

	get middlewares() {
		return {
			db_show: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("db_tool"),
				middlewares.actionAccess("db_tool", "read")
			],
			db_export: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("db_tool"),
				middlewares.actionAccess("db_tool", "create")
			],
			db_import: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("db_tool"),
				middlewares.actionAccess("db_tool", "create"),
				middlewares.fileInfo([{
					name: 'import_file',
					maxCount: 1
				}])
			],
			access_show: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("access_tool"),
				middlewares.actionAccess("access_tool", "read")
			],
			access_export: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("access_tool"),
				middlewares.actionAccess("access_tool", "create")
			],
			access_import: [
				middlewares.entityAccess("import_export"),
				middlewares.entityAccess("access_tool"),
				middlewares.actionAccess("access_tool", "create"),
				middlewares.fileInfo([{
					name: 'import_file',
					maxCount: 1
				}])
			]
		}
	}
}

module.exports = ImportExport;