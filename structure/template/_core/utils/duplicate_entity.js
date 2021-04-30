const models = require('@app/models');
const fs = require('fs-extra');
const globalConfig = require('@config/global');
const moment = require('moment');

async function duplicateFile(entityName, entitySource, fileAttribute) {
	const sourceFileName = entitySource[fileAttribute];
	const sourceFolder = sourceFileName.split('-')[0];
	const sourceFilePath = `${globalConfig.localstorage}${entityName}/${sourceFolder}/${sourceFileName}`;

	const dateStr = moment().format("YYYYMMDD-HHmmss");
	const newFolderName = dateStr.split('-')[0];
	const newFileName = `${dateStr}_DUPLICATE_${sourceFileName.split('-')[1]}`;
	const newFilePath = `${globalConfig.localstorage}${entityName}/${newFolderName}/${newFileName}`;

	try {
		await fs.copy(sourceFilePath, newFilePath);
	} catch (err) {
		console.error(`WARN: Couldn't duplicate file ${sourceFileName}`);
		console.error(err);
	}

	return [newFilePath, newFileName];
}

module.exports = async function(entityId, entityName, includes) {
	const transaction = await models.sequelize.transaction();
	const duplicatedInfos = [];
	const duplicatedFilesPath = [];

	async function duplicate(params) {
		const {
			entityId,
			entityName,
			alias,
			includes
		} = params;
		const modelName = `E_${entityName.slice(2)}`;

		// Find entity to copy
		const source = await models[modelName].findOne({where: {id: entityId}});
		if (!source)
			throw `ERROR: duplicate() - ${modelName} id ${entityId} not found`;

		// Copy source values to new object
		const duplicateValues = {...source.get()};
		// Delete id to allow autoincrement
		delete duplicateValues.id;

		// Copy files and update filename in duplicatedValues
		// eslint-disable-next-line global-require
		const attributes = require(`@app/models/attributes/${entityName}`);
		for (const attrName in attributes) {
			if (attributes[attrName].newmipsType === 'file' && source[attrName]) {
				// eslint-disable-next-line no-await-in-loop
				const [filePath, fileName] = await duplicateFile(entityName, source, attrName);
				duplicateValues[attrName] = fileName;
				duplicatedFilesPath.push(filePath);
			}
		}

		// Create duplicate
		const duplicated = await models[modelName].create(duplicateValues, {transaction, hooks: false});

		// eslint-disable-next-line global-require
		const options = require(`@app/models/options/${entityName}`);
		for (const currentInclude of includes || []) {
			console.log(currentInclude);
			const aliasFunc = `R_${currentInclude.as.slice(2)}`;
			const [option] = options.filter(opt => opt.as == currentInclude.as);

			// Copy related entity and link to duplicated entity
			if (option.relation == 'belongsTo') {
				if (source[option.foreignKey] != null) {
					// eslint-disable-next-line no-await-in-loop
					const subSourceDuplicateId = await duplicate({
						entityId: source[option.foreignKey],
						entityName: option.target,
						alias: currentInclude.as,
						includes: currentInclude.include
					});

					// eslint-disable-next-line no-await-in-loop
					await duplicated[`setR_${option.as.slice(2)}`](subSourceDuplicateId, {transaction, hooks: false});
				}
			}
			// Duplicate each related entity and link to duplicated entity
			else if (option.relation == 'hasMany') {
				let offset = 0, subSources;
				const subDuplicatesIds = [], limit = 50;
				do {
					// eslint-disable-next-line no-await-in-loop
					subSources = await source[`get${aliasFunc}`]({
						limit,
						offset
					});
					for (const subDuplicate of subSources) {
						// eslint-disable-next-line no-await-in-loop
						const newId = await duplicate({
							entityId: subDuplicate.id,
							entityName: option.target,
							alias: currentInclude.as,
							includes: currentInclude.include
						});
						subDuplicatesIds.push(newId);
					}
					offset += limit;
				} while (subSources.length == limit)

				// eslint-disable-next-line no-await-in-loop
				await duplicated[`set${aliasFunc}`](subDuplicatesIds, {transaction, hooks: false});
			}
			// Only duplicate entries in belongsToMany `through` table, poiting to the duplicated entity
			else if (option.relation == 'belongsToMany') {
				// eslint-disable-next-line no-await-in-loop
				const belongsToMany = await models.sequelize.query(`
					SELECT ${option.otherKey} FROM ${option.through} WHERE ${option.foreignKey} = ${source.id}
				`, { type: models.sequelize.QueryTypes.SELECT });
				const belongsToManyIds = belongsToMany.map(rel => rel[option.otherKey]);

				// eslint-disable-next-line no-await-in-loop
				await duplicated[`set${aliasFunc}`](belongsToManyIds, {transaction, hooks: false});
			}
		}

		duplicatedInfos.push({
			entityName,
			alias,
			originId: entityId,
			duplicatedId: duplicated.id
		});
		return duplicated.id;
	}

	try {
		const newId = await duplicate({
			entityId,
			entityName,
			includes
		});
		await transaction.commit();

		return [newId, duplicatedInfos];
	} catch (err) {
		// Delete duplicated files
		const unlinkPromises = []
		for (const filePath of duplicatedFilesPath) {
			try {
				unlinkPromises.push(fs.unlink(filePath));
			// eslint-disable-next-line no-empty
			} catch(err) {}
		}
		await Promise.all(unlinkPromises);

		// Rollback all sql queries
		await transaction.rollback();
		throw err;
	}
}