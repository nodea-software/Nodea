
const globals = {
	parameters: {
		token: {
			field: 'token',
			type: 'STRING',
			description: 'Authentication token',
			required: true
		},
		limit: {
			field: 'limit',
			type: 'INTEGER',
			description: '<code>limit</code> used to fetch data',
			defaultValue: 50
		},
		offset: {
			field: 'offset',
			type: 'INTEGER',
			description: '<code>offset</code> used to fetch data',
			defaultValue: 0
		}
	},
	errors: {
		error500: {
			code: 500,
			description: 'Server error'
		},
		error404: {
			code: 404,
			description: 'Not found'
		}
	}
}

function findAll(entityName, attributes, options) {
	const entity = entityName.substring(2);

	// Base descriptor
	const routeDescriptor = {
		title: 'Find All',
		description: `Find rows of entity ${entityName} from <code>offset</code> until <code>limit</code>`,
		method: 'GET',
		url: `/api/${entityName.substring(2)}/`,
		parameters: {
			query: [
				globals.parameters.token,
				globals.parameters.limit,
				globals.parameters.offset
			]
		},
		response: [],
		errors: [
			globals.errors.error404,
			globals.errors.error500
		]
	}

	const availableIncludes = options.map(x => x.as);
	routeDescriptor.parameters.query.push({
		field: 'include',
		type: 'STRING',
		description: `Include specified association(s) to each ${entity} result.<br>Multiple values can be given separated by a comma <br><br>Available includes : ?include=<code>${availableIncludes.join('</code>,<code>')}</code>`
	});

	const response = {
		[entity]: [{}],
		limit: 'INTEGER',
		offset: 'INTEGER',
		totalCount: 'INTEGER'
	};
	// Fields
	for (const attribute in attributes) {
		const attrDef = attributes[attribute];
		response[entity][0][attribute] = attrDef.type || 'STRING';
	}
	routeDescriptor.response = JSON.stringify(response, null, '\t');

	return routeDescriptor;
}

function findOne(entityName, attributes, options) {
	const entity = entityName.substring(2);

	// Base descriptor
	const routeDescriptor = {
		title: 'Find One',
		description: `Find a row of entity ${entityName}`,
		method: 'GET',
		url: `/api/${entityName.substring(2)}/:id`,
		parameters: {
			query: [
				globals.parameters.token
			],
			params: [{
				field: 'id',
				type: 'INTEGER',
				description: '<code>id</code> of row to find',
				required: true
			}]
		},
		response: [],
		errors: [
			globals.errors.error404,
			globals.errors.error500
		]
	}

	const availableIncludes = options.map(x => x.as);
	routeDescriptor.parameters.query.push({
		field: 'include',
		type: 'STRING',
		description: `Include specified association(s) to each ${entity} result.<br>Multiple values can be given separated by a comma <br><br>Available includes : ?include=<code>${availableIncludes.join('</code>,<code>')}</code>`
	});

	const response = {
		[entity]: {}
	};
	// Fields
	for (const attribute in attributes) {
		const attrDef = attributes[attribute];
		response[entity][attribute] = attrDef.type || 'STRING';
	}
	routeDescriptor.response = JSON.stringify(response, null, '\t');

	return routeDescriptor;
}

function findAssociation(entityName, attributes, options) {
	const entity = entityName.substring(2);

	const availableIncludes = options.map(x => x.as);

	// Base descriptor
	const routeDescriptor = {
		title: 'Find Association',
		description: `Find associated rows of entity ${entityName}`,
		method: 'GET',
		url: `/api/${entityName.substring(2)}/:id/:association`,
		parameters: {
			query: [
				globals.parameters.token,
				globals.parameters.limit,
				globals.parameters.offset
			],
			params: [{
				field: 'id',
				type: 'INTEGER',
				description: `<code>id</code> of ${entity} associations to find`,
				required: true
			}, {
				field: 'association',
				type: 'STRING',
				description: `Alias of association to find. Available aliases are <code>${availableIncludes.join('</code>, <code>')}</code>`,
				required: true
			}]
		},
		errors: [
			globals.errors.error404,
			{
				code: 404,
				description: 'Association not found'
			},
			globals.errors.error500
		]
	}

	routeDescriptor.response = JSON.stringify({
		"{association}": "OBJECT",
		limit: 'INTEGER',
		offset: 'INTEGER',
		totalCount: 'INTEGER'
	}, null, '\t');

	return routeDescriptor;
}

function create(entityName, attributes, options) {
	const entity = entityName.substring(2);

	// Base descriptor
	const routeDescriptor = {
		title: 'Create',
		description: `Create row of entity ${entityName}`,
		method: 'POST',
		url: `/api/${entityName.substring(2)}/`,
		parameters: {
			query: [
				globals.parameters.token
			],
			body: []
		},
		response: {
			[entity]: {}
		},
		errors: [
			globals.errors.error500
		]
	}

	const attrAndFk = attributes;
	for (const option of options)
		if (option.relation === 'belongsTo')
			attrAndFk[option.foreignKey] = {type: 'INTEGER'};

	for (const attribute in attrAndFk) {
		const attrDef = attrAndFk[attribute];
		routeDescriptor.response[entity][attribute] = attrDef.type || 'STRING';

		if (['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'version'].includes(attribute))
			continue;
		routeDescriptor.parameters.body.push({
			field: attribute,
			type: attrDef.type || 'STRING',
			description: `<code>${attribute}</code> of entity ${entity}`,
			defaultValue: attrDef.defaultValue,
			required: attrDef.required === true
		});
	}

	routeDescriptor.response = JSON.stringify(routeDescriptor.response, null, '\t');

	return routeDescriptor;
}

function update(entityName, attributes, options) {
	const entity = entityName.substring(2);

	// Base descriptor
	const routeDescriptor = {
		title: 'Update',
		description: `Update row of entity ${entityName}`,
		method: 'PUT',
		url: `/api/${entityName.substring(2)}/:id`,
		parameters: {
			query: [
				globals.parameters.token
			],
			params: [{
				field: 'id',
				type: 'INTEGER',
				required: true,
				description: `<code>id</code> of ${entity} to update`
			}],
			body: []
		},
		response: {
			[entity]: {}
		},
		errors: [
			globals.errors.error500
		]
	}

	const attrAndFk = attributes;
	for (const option of options)
		if (option.relation === 'belongsTo')
			attrAndFk[option.foreignKey] = {type: 'INTEGER'};

	for (const attribute in attrAndFk) {
		const attrDef = attributes[attribute];
		routeDescriptor.response[entity][attribute] = attrDef.type || 'STRING';

		if (['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'version'].includes(attribute))
			continue;
		routeDescriptor.parameters.body.push({
			field: attribute,
			type: attrDef.type || 'STRING',
			description: `<code>${attribute}</code> of entity ${entity}`,
			defaultValue: attrDef.defaultValue,
			required: attrDef.required === true
		});
	}

	routeDescriptor.response = JSON.stringify(routeDescriptor.response, null, '\t');

	return routeDescriptor;
}

function destroy(entityName) {
	const entity = entityName.substring(2);

	// Base descriptor
	const routeDescriptor = {
		title: 'Delete',
		description: `Delete row of entity ${entityName}`,
		method: 'DELETE',
		url: `/api/${entityName.substring(2)}/:id`,
		parameters: {
			query: [
				globals.parameters.token
			],
			params: [{
				field: 'id',
				type: 'INTEGER',
				required: true,
				description: `<code>id</code> of ${entity} to delete`
			}],
			body: []
		},
		response: "200 Ok",
		errors: [
			globals.errors.error404,
			globals.errors.error500
		]
	}

	return routeDescriptor;
}

function entityDocumentation(entityName, attributes, options) {
	const file = {
		title: `entity.${entityName}.label_entity`,
		code: entityName,
		routes: []
	};
	try {
		const functions = [findAll, findOne, findAssociation, create, update, destroy];
		file.routes = functions.map(fn => fn(entityName, attributes, options));
	} catch (err) {
		console.error("Couldn't build api documentation for entity "+entityName);
		console.error(err);
	}
	return file;
}

module.exports = {
	route: {
		findAll,
		findOne,
		findAssociation,
		create,
		update,
		destroy
	},
	entityDocumentation,
	globals
}