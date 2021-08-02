const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(module.filename);
const dbConfig = require('@config/database');
const fs = require('fs-extra');
const modelBuilder = require('@core/helpers/model_builder');

const Op = Sequelize.Op;
const operators = {
	$eq: Op.eq,
	$ne: Op.ne,
	$gte: Op.gte,
	$gt: Op.gt,
	$lte: Op.lte,
	$lt: Op.lt,
	$not: Op.not,
	$in: Op.in,
	$notIn: Op.notIn,
	$is: Op.is,
	$like: Op.like,
	$notLike: Op.notLike,
	$iLike: Op.iLike,
	$notILike: Op.notILike,
	$regexp: Op.regexp,
	$notRegexp: Op.notRegexp,
	$iRegexp: Op.iRegexp,
	$notIRegexp: Op.notIRegexp,
	$between: Op.between,
	$notBetween: Op.notBetween,
	$overlap: Op.overlap,
	$contains: Op.contains,
	$contained: Op.contained,
	$adjacent: Op.adjacent,
	$strictLeft: Op.strictLeft,
	$strictRight: Op.strictRight,
	$noExtendRight: Op.noExtendRight,
	$noExtendLeft: Op.noExtendLeft,
	$and: Op.and,
	$or: Op.or,
	$any: Op.any,
	$all: Op.all,
	$values: Op.values,
	$col: Op.col
};

let sequelizeOptions;
if (dbConfig.dialect == 'sqlite')
	sequelizeOptions = {
		dialect: dbConfig.dialect,
		storage: dbConfig.storage,
		logging: false
	}
else
	sequelizeOptions = {
		host: dbConfig.host,
		logging: false,
		port: dbConfig.port,
		dialect: dbConfig.dialect,
		dialectOptions: {
			multipleStatements: true
		},
		define: {
			timestamps: false
		},
		charset: 'utf8',
		collate: 'utf8_general_ci',
		timezone: '+00:00' // For writing to database
	}
const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, sequelizeOptions);

const models = [];
fs.readdirSync(__dirname).filter(function(file) {
	const excludeFiles = ['hooks.js', 'validators.js'];
	return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js' && excludeFiles.indexOf(file) == -1;
}).forEach(function(file) {
	try {
		// eslint-disable-next-line global-require
		const ModelClass = require(path.join(__dirname, file));
		const model = new ModelClass();

		const modelOptions = model.data;
		const hooks = model.hooks;

		const sequelizeAttributes = modelBuilder.buildSequelizeAttributes(Sequelize.DataTypes, model.attributes);
		const sequelizeModel = sequelize.define(model.modelName, sequelizeAttributes, modelOptions)

		modelBuilder.buildSequelizeHooks(sequelizeModel, hooks);

		model.setInstanceMethods(sequelizeModel);
		model.setClassMethods(sequelizeModel);

		models.push(model);

	} catch(err) {
		console.error("Couldn't load model "+file);
		console.error(err);
	}
});

Object.keys(models).forEach(function(modelName) {
	if (models[modelName].associate)
		models[modelName].associate(sequelize.models);
});

// Add operators to default sequelize models object
sequelize.models = {...sequelize.models, ...operators}

module.exports = {
	...sequelize.models,
	sequelize,
	Sequelize
};