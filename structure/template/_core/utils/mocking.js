/* eslint-disable no-undef */
const { getMockReq } = require('@jest-mock/express');

// Utils
const generateValueByType = (type) => {
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

/**
 * @param params.req {Object} - request object params (body/params/query...)
 * @param params.res {Object} - response object params (redirect/render/end...)
 * @param params.route {Object} - Route function to mock
 */
exports.getMockedEnv = (params) => {
	// Define res.redirect, render, end, ...
	const mockedRes = {
		redirect: jest.fn(redirect => redirect),
		render: jest.fn(render => render),
		end: jest.fn()
	};

	// Save res.status() and return res.redirect, render, ...
	mockedRes.status = status => {
		mockedRes.status = status;
		return mockedRes;
	};

	// Save res.send() and return res.redirect, render, ...
	mockedRes.send = send => {
		mockedRes.send = send;
		return mockedRes;
	};

	const mockedReq = getMockReq(params.req || {});
	const mockedSuccess = jest.fn();
	const mockedError = jest.fn();

	const mockedRoute = async data => {
		const fnSuccess = data.res.success;
		const fnError = data.res.error;
		data.res.success = callback => {
			mockedSuccess();
			fnSuccess(callback);
		}
		data.res.error = callback => {
			mockedError();
			fnError(callback);
		}
		await params.func(data);
	}

	return {
		mockedRes,
		mockedReq,
		mockedRoute,
		mockedSuccess,
		mockedError
	};
}

/**
 * Generate random body values
 * @param e_entity {String} - Entity name that we will generate body for
 */
exports.generateEntityBody = (e_entity) => {
	// eslint-disable-next-line global-require
	const attributes = require('@app/models/attributes/' + e_entity);
	const body = {};
	for (const attrName in attributes) {
		const attr = attributes[attrName];

		if (['id', 'createdBy', 'updatedBy', 'version'].includes(attrName))
			continue;
		if (attr.allowNull === true || attr.defaultValue === null)
			continue;

		body[attrName] = generateValueByType(attr.nodeaType);
	}
	return body;
}
