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

function randomInt(min, max) {
	return Math.random() * (max - min) + min
}

const zeroPad = (num, places) => String(num).padStart(places, '0')

function generateValueByType(type, type_param = null) {
	switch (type.toLowerCase()) {
		case 'string':
		case 'text':
		case 'regular text':
		case 'password':
			return randomString(100);
		case 'number':
			return Math.floor(randomInt(-9999, 9999));
		case 'big number':
			return Math.floor(randomInt(-9999999, 9999999));
		case 'decimal':
		case 'currency':
			// eslint-disable-next-line no-case-declarations
			let value = randomInt(-9999, 9999);
			if(type_param)
				value = parseFloat(value.toFixed(type_param.split(',')[1]));
			return value;
		case 'date':
		case 'datetime':
			// eslint-disable-next-line no-case-declarations
			const date = new Date();
			date.setMilliseconds(0)
			return date;
		case 'time':
			return zeroPad(Math.floor(randomInt(0, 23)), 2) + ':' + zeroPad(Math.floor(randomInt(0, 59)), 2) + ':' + zeroPad(Math.floor(randomInt(0, 59)), 2);
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
			return randomString(100);
		case 'file':
		case 'picture':
			return null;
		case 'virtual':
			return undefined;
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

	mockedRes.json = json => {
		mockedRes.json = json;
		return mockedRes;
	};

	mockedRes.sendStatus = sendStatus => {
		mockedRes.sendStatus = sendStatus;
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

		if (['id', 'version'].includes(attrName))
			continue;
		else if (['createdBy', 'updatedBy'].includes(attrName))
			body[attrName] = null;
		else if(attr.type.toLowerCase() == 'enum')
			body[attrName] = attr.values[0];
		else
			body[attrName] = generateValueByType(attr.nodeaType || attr.type, attr.type_parameter);
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