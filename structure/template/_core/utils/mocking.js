/* eslint-disable no-undef */
const { getMockReq } = require('@jest-mock/express');
const fs = require('fs');

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
		case 'password':
			return randomString(100);
		case 'number':
			return Math.floor(Math.random() * (9999 - -9999) + -9999);
		case 'big number':
			return Math.floor(Math.random() * (9999999 - -9999999) + -9999999);
		case 'decimal':
			return Math.random() * (9999 - -9999) + -9999;
		case 'currency':
			return '17.99';
		case 'date':
		case 'datetime':
		case 'time':
			return new Date();
		case 'color':
			return '#FFF';
		case 'boolean':
			return true;
		case 'email':
			return 'test@test.com';
		case 'phone':
		case 'fax':
			return '0666666666';
		case 'qrcode':
		case 'url':
			return 'https://nodea-software.com'
		case 'barcode':
			return '12345678';
		case 'enum':
		case 'VIRTUAL':
			return randomString(100);
		case 'file':
		case 'picture':
			return null;
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

	const mockedRoute = async data => new Promise((resolve, reject) => {
		const fnSuccess = data.res.success;
		const fnError = data.res.error;
		data.res.success = async callback => {
			mockedSuccess();
			await fnSuccess(callback);
			resolve();
		}
		data.res.error = async callback => {
			mockedError();
			await fnError(callback);
			resolve();
		}
		params.func(data).catch(reject);
	});

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

		if(attr.type.toLowerCase() == 'enum')
			body[attrName] = attr.values[0];
		else
			body[attrName] = generateValueByType(attr.nodeaType || attr.type);
	}
	return body;
}

/**
 * Generate tests files
 * @param e_entity {String} - Entity name that we will generate body for
 */
exports.generateEntityFiles = (e_entity) => {
	// eslint-disable-next-line global-require
	const attributes = require('@app/models/attributes/' + e_entity);
	const files = {};
	for (const attrName in attributes) {
		const attr = attributes[attrName];

		if (!attr.nodeaType || !['file', 'picture'].includes(attr.nodeaType.toLowerCase()))
			continue;

		if(attr.nodeaType.toLowerCase() == 'file')
			files[attrName] = [{
				fieldname: attrName,
				originalname: 'test.pdf',
				encoding: '7bit',
				mimetype: 'application/pdf',
				buffer: fs.readFileSync(__dirname + '/../public/tests/test.pdf'),
				size: fs.statSync(__dirname + '/../public/tests/test.pdf').size
			}];
		else
			files[attrName] = [{
				fieldname: attrName,
				originalname: 'test.png',
				encoding: '7bit',
				mimetype: 'image/png',
				buffer: fs.readFileSync(__dirname + '/../public/tests/test.png'),
				size: fs.statSync(__dirname + '/../public/tests/test.png').size
			}];
	}
	return files;
}