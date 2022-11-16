const sequelize = require('@app/models').sequelize;
const moment = require('moment');
const fs = require('fs-extra');

// After Sequelize sync (see Sequelize doc) we have to handle manually ALTER in database depeding on instructions done on the generator.
// This method use toSync.json and toSyncProd.json
module.exports.customAfterSync = async () => {

	const toSyncProdObject = JSON.parse(fs.readFileSync(__appPath + '/models/toSyncProd.json'));

	/* ----------------- Récupération du toSync.json -----------------*/
	const toSyncObject = JSON.parse(fs.readFileSync(__appPath + '/models/toSync.json'));
	const dialect = sequelize.options.dialect;

	for (const entity in toSyncObject) {
		// Sync attributes
		if (toSyncObject[entity].attributes)
			for (const attribute in toSyncObject[entity].attributes) {
				let type;
				let request = "";
				switch (toSyncObject[entity].attributes[attribute].type) {
					case "STRING":
						type = "VARCHAR(255)";
						break;
					case "INTEGER":
						type = "INT";
						break;
					case "BIGINT":
						type = "BIGINT";
						break;
					case "DATE":
						if (dialect == "postgres")
							type = "timestamp with time zone";
						else
							type = "DATETIME";
						break;
					case "DECIMAL":
						type = "DECIMAL(10,3)";
						break;
					case "ENUM":
						if (dialect == "postgres") {
							const postgresEnumType = attribute + "_enum_" + moment();
							request += "CREATE TYPE " + postgresEnumType + " as ENUM (";
							for (let i = 0; i < toSyncObject[entity].attributes[attribute].values.length; i++) {
								request += "'" + toSyncObject[entity].attributes[attribute].values[i] + "'";
								if (i != toSyncObject[entity].attributes[attribute].values.length - 1)
									request += ",";
							}
							request += ");"
							type = postgresEnumType;
						} else {
							type = "ENUM(";
							for (let i = 0; i < toSyncObject[entity].attributes[attribute].values.length; i++) {
								type += "'" + toSyncObject[entity].attributes[attribute].values[i] + "'";
								if (i != toSyncObject[entity].attributes[attribute].values.length - 1)
									type += ",";
							}
							type += ")";
						}
						break;
					case "TEXT":
					case "BOOLEAN":
					case "TIME":
					case "FLOAT":
						// Same type as the switch parameter
						type = toSyncObject[entity].attributes[attribute].type;
						break;
					case "DOUBLE":
						if (dialect == "postgres") {
							type = 'DOUBLE PRECISION';
						} else {
							// Same type as the switch parameter
							type = toSyncObject[entity].attributes[attribute].type;
						}
						break;
					default:
						type = "VARCHAR(255)";
						break;
				}

				if (typeof toSyncObject[entity].attributes[attribute].defaultValue === "undefined")
					toSyncObject[entity].attributes[attribute].defaultValue = null;
				if (toSyncObject[entity].attributes[attribute].defaultValue != null && toSyncObject[entity].attributes[attribute].defaultValue !== true && toSyncObject[entity].attributes[attribute].defaultValue !== false)
					toSyncObject[entity].attributes[attribute].defaultValue = "'" + toSyncObject[entity].attributes[attribute].defaultValue + "'";

				request += "ALTER TABLE ";
				if (dialect == "mysql" || dialect == "mariadb") {
					request += entity;
					request += " ADD COLUMN `" + attribute + "` " + type + " DEFAULT " + toSyncObject[entity].attributes[attribute].defaultValue + ";";
				} else if (dialect == "postgres") {
					request += '"' + entity + '"';
					request += " ADD COLUMN " + attribute + " " + type + " DEFAULT " + toSyncObject[entity].attributes[attribute].defaultValue + ";";
				}

				try {
					await sequelize.query(request); // eslint-disable-line
				} catch (err) {
					if (typeof err.parent !== "undefined" && err.parent.errno == 1060 || err.parent.code == 42701)
						console.log("WARNING - Duplicate column attempt in BDD - Request: " + request);
					else
						throw err;
				}

				toSyncProdObject.queries.push(request);
			}
		// Sync options
		if (toSyncObject[entity].options)
			for (let j = 0; j < toSyncObject[entity].options.length; j++) {
				if (toSyncObject[entity].options[j].relation != "belongsToMany") {

					const option = toSyncObject[entity].options[j];
					let sourceName;
					try {
						sourceName = sequelize.models[entity.charAt(0).toUpperCase() + entity.slice(1)].getTableName();
					} catch (err) {
						console.error("Unable to find model " + entity + ", skipping toSync query.");
						console.log(toSyncObject[entity].options[j]);
						continue;
					}
					let targetName;
					// Status specific target. Get real history table name from attributes
					if (option.target.indexOf('_history_') != -1) {
						const attris = JSON.parse(fs.readFileSync(__appPath + '/models/attributes/' + entity.substring(entity.indexOf('e_'), entity.length) + '.json', 'utf8'));
						for (const attri in attris)
							if (attris[attri].history_table && attris[attri].history_table == option.target) {
								targetName = attris[attri].history_model;
								break;
							}
					}
					// Regular target
					if (!targetName)
						targetName = option.target;

					targetName = sequelize.models[targetName.charAt(0).toUpperCase() + targetName.slice(1)].getTableName();

					let request;
					if (option.relation == "belongsTo") {
						request = "ALTER TABLE ";
						if (dialect == "mysql" || dialect == "mariadb") {
							request += sourceName;
							request += " ADD COLUMN `" + option.foreignKey + "` INT DEFAULT NULL;";
							request += "ALTER TABLE `" + sourceName + "` ADD FOREIGN KEY (" + option.foreignKey + ") REFERENCES `" + targetName + "` (id) ON DELETE SET NULL ON UPDATE CASCADE;";
						} else if (dialect == "postgres") {
							request += '"' + sourceName + '"';
							request += " ADD COLUMN " + option.foreignKey + " INT DEFAULT NULL;";
							request += "ALTER TABLE \"" + sourceName + "\" ADD FOREIGN KEY (" + option.foreignKey + ") REFERENCES \"" + targetName + "\" (id) ON DELETE SET NULL ON UPDATE CASCADE;";
						}
					} else if (option.relation == 'hasMany') {
						if (dialect == "mysql" || dialect == "mariadb") {
							request = "ALTER TABLE ";
							request += targetName;
							request += " ADD COLUMN `" + option.foreignKey + "` INT DEFAULT NULL;";
							request += "ALTER TABLE `" + targetName + "` ADD FOREIGN KEY (" + option.foreignKey + ") REFERENCES `" + sourceName + "` (id);";
						} else if (dialect == "postgres") {
							request = "ALTER TABLE ";
							request += '"' + targetName + '"';
							request += " ADD COLUMN " + option.foreignKey + " INT DEFAULT NULL;";
							request += "ALTER TABLE \"" + targetName + "\" ADD FOREIGN KEY (" + option.foreignKey + ") REFERENCES \"" + sourceName + "\" (id);";
						}
					}

					try {
						await sequelize.query(request); // eslint-disable-line
					} catch (err) {
						if (typeof err.parent !== "undefined" && err.parent.errno == 1060 || err.parent.code == 42701)
							console.log("WARNING - Duplicate column attempt in BDD - Request: " + request);
						else
							throw err;
					}
					toSyncProdObject.queries.push(request);
				}
			}
	}

	if (toSyncObject.queries)
		for (let i = 0; i < toSyncObject.queries.length; i++) {
			try {
				await sequelize.query(toSyncObject.queries[i]); // eslint-disable-line
			} catch (err) {
				console.error(err);
			}
		}

	fs.writeFileSync(__appPath + '/models/toSyncProd.json', JSON.stringify(toSyncProdObject, null, '\t'));
	fs.writeFileSync(__appPath + '/models/toSync.json', '{}', 'utf8');
};