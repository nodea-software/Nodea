'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const dbConfig = require('../config/database');
const basename = path.basename(module.filename);

const {Op} = Sequelize;
const db = {
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

const dialectOptions = {
	multipleStatements: true
};

if(dbConfig.dialect == 'mariadb')
	dialectOptions.allowPublicKeyRetrieval = true;

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
	host: dbConfig.host,
	logging: false,
	port: dbConfig.port,
	dialect: dbConfig.dialect,
	dialectOptions,
	define: {
		timestamps: true
	},
	charset: 'utf8',
	collate: 'utf8_general_ci'
})

fs.readdirSync(__dirname).filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js').forEach(function(file) {
	// eslint-disable-next-line global-require
	const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
	db[model.name] = model;
})

Object.keys(db).forEach(modelName => {
	if (db[modelName].associate)
		db[modelName].associate(db);
})

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;