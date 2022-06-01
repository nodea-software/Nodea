/* eslint-disable no-undef */
const { getMockReq } = require('@jest-mock/express');

// Utils
function randomString(length) {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function generateValueByType(type) {
	switch (type) {
		case 'string':
		case 'text':
		case 'regular text':
			return randomString(100);
		case 'number':
			return Math.floor(Math.random() * (9999 - -9999) + -9999);
		case 'decimal':
			return Math.random() * (9999 - -9999) + -9999;
		case 'date':
		case 'datetime':
		case 'time':
			return new Date();
		case 'color':
			return '#FFF';
		default:
			console.log('UNKNOWN TYPE: ' + type);
			return randomString(100);
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

		body[attrName] = generateValueByType(attr.nodeaType || attr.type);
	}
	return body;
}
