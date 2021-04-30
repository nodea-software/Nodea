const CoreImportExport = require('@core/routes/import_export.js');
const access = require('@core/helpers/access');

const upload = require('multer');
const multer = upload();

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
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("db_tool"),
				access.actionAccessMiddleware("db_tool", "read")
			],
			db_export: [
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("db_tool"),
				access.actionAccessMiddleware("db_tool", "create")
			],
			db_import: [
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("db_tool"),
				access.actionAccessMiddleware("db_tool", "create"),
				(req, res, next) => {
					const fileMiddleware = multer.fields([{
						name: 'import_file',
						maxCount: 1
					}]);

					fileMiddleware(req, res, err => {
						if (err)
							return next(err);
						next();
					});
				}
			],
			access_show: [
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("access_tool"),
				access.actionAccessMiddleware("access_tool", "read")
			],
			access_export: [
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("access_tool"),
				access.actionAccessMiddleware("access_tool", "create")
			],
			access_import: [
				access.entityAccessMiddleware("import_export"),
				access.entityAccessMiddleware("access_tool"),
				access.actionAccessMiddleware("access_tool", "create")
			]
		}
	}
}

module.exports = ImportExport;