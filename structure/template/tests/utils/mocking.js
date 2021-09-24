const { getMockReq } = require('@jest-mock/express');

/**
 * @param params.route {Object} - Route function to mock
 * @param params.req {Object} - request object params (body/params/query...)
 * @param params.res {Object} - response object params (redirect/render/end...)
 */
exports.getMockedEnv = (params) => {
	const mockedRes = {
		redirect: jest.fn(redirect => redirect),
		render: jest.fn(render => render),
		end: jest.fn(),
	};
	mockedRes.status = status => mockedRes;

	const mockedReq = getMockReq(params.req || {});

	const mockedSuccess = jest.fn();
	const mockedError = jest.fn();
	const mockedRoute = async data => {
		const {success, error} = data.res;

		data.res.success = fn => {
			success(mockedSuccess);
			fn();
		}
		data.res.error = fn => {
			error(mockedError);
			fn();
		}
		await params.route(data);
	}

	return {
		mockedRes,
		mockedReq,
		mockedRoute,
		mockedSuccess,
		mockedError
	};
}

const ignoreFields = ['id', 'createdBy', 'updatedBy', 'version'];
const defaultValuesByType = (type) => {
	switch (type) {
		case 'string':
			return 'TestString';
		case 'number':
			return 42;
		case 'decimal':
			return 42.42
		case 'date':
		case 'datetime':
		case 'time':
			return new Date();
		default:
			throw new Error("Unknown type "+type)
	}
}
exports.getEntityFormData = (e_entity) => {
	const attributes = require('@app/models/attributes/'+e_entity);
	const formData = {};
	for (const attrName in attributes) {
		const attr = attributes[attrName];

		if (ignoreFields.includes(attrName))
			continue;
		if (attr.allowNull === true || attr.defaultValue === null)
			continue;

		formData[attrName] = defaultValuesByType(attr.nodeaType);
	}
	return formData;
}
