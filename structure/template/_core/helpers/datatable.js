const models = require('@app/models');
const model_builder = require('./model_builder');

async function getDatalistData(modelName, params, order, start, length, search, searchTerm, speWhere, toInclude) {
	// If request come from widget lastrecord, then default query order is ID DESC
	if(params.widgetType == 'lastrecords')
		order = [['id', 'DESC']];

	// Building final query object
	let queryObject;
	if (search[searchTerm].length == 0)
		queryObject = {where: {}, order: order};
	else
		queryObject = {where: search, order: order}

	if (length != -1) {
		queryObject.limit = length
		queryObject.offset = start
	}

	if (speWhere)
		for (const prop of Reflect.ownKeys(speWhere)) // Reflect.onwKeys fetch and concat ownProperty and ownSymbol
			queryObject.where[prop] = speWhere[prop];

	// TODO: handle attributes
	// queryObject.attributes = attributes;

	// If postgres, then we have to parse all value to text, postgres cannot compare varchar with integer for example
	if (models.sequelize.options.dialect == "postgres" && typeof queryObject.where !== "undefined")
		for (const item in queryObject.where[searchTerm]) {
			const currentItem = queryObject.where[searchTerm][item];
			const attribute = Object.keys(currentItem)[0];
			// Don't convert boolean to text, postgres need real boolean in order to work correctly
			if(typeof currentItem[attribute] !== 'boolean')
				currentItem[attribute] = models.sequelize.where(models.sequelize.cast(models.sequelize.col(modelName + '.' + attribute), 'text'), currentItem[attribute])
		}

	// Build include from field array
	// At the moment queryObject.include = [ 'id', 'r_user.f_nom', 'r_user.r_parent.f_email']
	// `model_builder.getIncludeFromFields()` transform this array into a squelize include object
	const entityName = `e_${modelName.substring(2)}`;
	queryObject.include = model_builder.getIncludeFromFields(models, entityName, toInclude);

	// Execute query with filters and get total count
	const result = await models[modelName].findAndCountAll(queryObject);
	const lightRows = result.rows.map(elem => elem.get({plain: true}));

	return {
		recordsTotal: result.count,
		recordsFiltered: result.count,
		data: lightRows
	};
}

async function getSubdatalistData(modelName, params, order, start, length, search, searchTerm, toInclude) {
	const sourceId = params.sourceId;
	const subentityAlias = params.subentityAlias, subentityName = params.subentityModel;
	const subentityModel = params.subentityModel.capitalizeFirstLetter();
	const doPagination = params.paginate;

	const include = {
		model: models[subentityModel],
		as: subentityAlias,
		order: order,
		include: model_builder.getIncludeFromFields(models, subentityName, toInclude) // Get sequelize include object
	}
	if (search[searchTerm].length > 0)
		include.where = search;

	if (doPagination == "true") {
		include.limit = length;
		include.offset = start;
	}

	include.required = false;

	const entity = await models[modelName].findOne({
		where: { id: parseInt(sourceId) },
		include: include
	});

	if (!entity['count' + subentityAlias.capitalizeFirstLetter()])
		throw new Error('count' + subentityAlias.capitalizeFirstLetter() + 'is undefined');

	// Remove attributes to avoid nonaggregated column error on count with includes
	for (const entity of include.include)
		entity.attributes = [];

	const count = await entity['count' + subentityAlias.capitalizeFirstLetter()]({where: include.where, include: include.include});
	return {
		recordsTotal: count,
		recordsFiltered: count,
		data: entity[subentityAlias].map(elem => elem.get({plain: true}))
	};
}

// Prototype:
//  - modelName: 'E_user'
//  - params: {columnsTypes:[], columns:[], search:{}} - body from datatables (req.body)
//  - speInclude - optional: ['r_inclusion.r_specific.id',] - array of field path used to build query's include
//  - speWhere - optional: {id: 1, property: 'value'}
module.exports = async (modelName, params, speInclude, speWhere, isSubdatalist = false) => {
	const start = params.start ? parseInt(params.start) : 1;
	const length = params.length ? parseInt(params.length) : 10;

	const toInclude = speInclude || [];
	const isGlobalSearch = params.search.value != "";
	const search = {}, searchTerm = isGlobalSearch ? models.$or : models.$and;
	search[searchTerm] = [];

	// Loop over columns array
	for (let i = 0, columns = params.columns; i < columns.length; i++) {
		if (columns[i].searchable == 'false')
			continue;

		// Push column's field into toInclude. toInclude will be used to build the sequelize include. Ex: toInclude = ['r_alias.r_other_alias.f_field', 'f_name']
		toInclude.push(columns[i].data);

		// Add column own search
		if (columns[i].search.value != "") {
			const { type, value } = JSON.parse(columns[i].search.value);
			search[searchTerm].push(model_builder.formatSearch(columns[i].data, value, type));
		}
		// Add column global search
		if (isGlobalSearch)
			search[searchTerm].push(model_builder.formatSearch(columns[i].data, params.search.value, params.columnsTypes[columns[i].data]));
	}

	// ORDER BY Managment
	const stringOrder = params.columns[params.order[0].column].data;
	// If ordering on an association field, use Sequelize.literal so it can match field path 'r_alias.f_name'
	const order = stringOrder.indexOf('.') != -1 ? [[models.Sequelize.literal(stringOrder), params.order[0].dir]] : [[stringOrder, params.order[0].dir]];

	if(isSubdatalist)
		return getSubdatalistData(modelName, params, order, start, length, search, searchTerm, toInclude);

	return getDatalistData(modelName, params, order, start, length, search, searchTerm, speWhere, toInclude);
}