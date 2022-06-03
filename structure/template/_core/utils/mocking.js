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
		case 'file':
		case 'picture':
		case 'enum':
		case 'VIRTUAL':
			return randomString(100);
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

		if(attr.type.toLowerCase() == 'enum')
			body[attrName] = attr.values[0];
		else
			body[attrName] = generateValueByType(attr.nodeaType || attr.type);
	}
	return body;
}

// f_localfile: [
// {
// 	fieldname: 'f_localfile',
// 	originalname: 'steam-deck-frandroid-2021.png',
// 	encoding: '7bit',
// 	mimetype: 'image/png',
// 	buffer: <Buffer 89 50 4e 47 0d 0a 1a 0a 00 00 00 0d 49 48 44 52 00 00 02 44 00 00 02 44 08 03 00 00 00 c0 3e cb 68 00 00 03 00 50 4c 54 45 47 70 4c 19 19 19 55 55 55 ... 51386 more bytes>,
// 	size: 51436
// }
// ],
// f_image: [
// {
// 	fieldname: 'f_image',
// 	originalname: 'Emmaus.jpg',
// 	encoding: '7bit',
// 	mimetype: 'image/jpeg',
// 	buffer: <Buffer ff d8 ff e1 00 18 45 78 69 66 00 00 49 49 2a 00 08 00 00 00 00 00 00 00 00 00 00 00 ff ec 00 11 44 75 63 6b 79 00 01 00 04 00 00 00 64 00 00 ff e1 03 ... 155272 more bytes>,
// 	size: 155322
// }
// ]
