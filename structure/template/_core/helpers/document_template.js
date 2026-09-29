const dayjs = require('dayjs');
const fs = require('fs-extra');
const dust = require('dustjs-linkedin');
const puppeteer = require('puppeteer');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const expressionParser = require('docxtemplater/expressions.js');

function extractFieldsWithContext(string) {
	// eslint-disable-next-line no-control-regex
	const regExp = new RegExp('{(((?:[#/]|[a-zA-Z]))(?!__)[^\n}]*)}', 'g');
	const fieldsArray = [];
	let matches, currentPath = '';
	while ((matches = regExp.exec(string)) !== null) {
		let [fullMatch, fieldPath, openingChar] = [...matches]; // eslint-disable-line
		// New context, add to currentPath
		if (openingChar == '#')
			currentPath = currentPath == '' ? fieldPath.substr(1) : currentPath + '.' + fieldPath.substr(1);
		// Closing context, remove from currentPath if exist
		else if (openingChar == '/') {
			if (currentPath.includes('.'))
				currentPath = currentPath.substring(0, currentPath.lastIndexOf('.'));
			else
				currentPath = '';
		}
		// Field
		else {
			// Clear dust formating option Ex: `{field|h}`
			fieldPath = fieldPath.split('|')[0].trim();
			fieldsArray.push(currentPath == '' ? fieldPath : currentPath + '.' + fieldPath)
		}
	}

	return fieldsArray;
}

// Get value in json object using docxtemplater
function getValue(itemPath /*array*/, data, scope /*where value is expected*/) {
	try {
		let i = 0;
		let key = itemPath[i];
		if (scope && scope.scopePath &&
			scope.scopePathItem &&
			scope.scopePath.length &&
			scope.scopePath.length === scope.scopePathItem.length) {
			//Go to data scope  before search value
			for (let j = 0; j < scope.scopePath.length; j++)
				data = data[scope.scopePath[j]][scope.scopePathItem[j]];
		}
		do {
			if (data != null && typeof data !== "undefined" && typeof data[key] !== 'undefined')
				data = data[key];
			else
				return '';
			i++;
			key = itemPath[i];
		} while (i < itemPath.length);
		if (data == null)
			data = "";

		// Formatting date directly in the output, usefull for 3 and more level include data
		// TODO: FR / EN Differenciation
		if (typeof data === "object" && dayjs(new Date(data)).isValid())
			data = dayjs(new Date(data)).format("DD/MM/YYYY");

		return data;
	} catch (e) {
		console.log(e);
		return '';
	}
}

function dustDataParser({ filePath }) {
	const fileStr = fs.readFileSync(filePath, 'utf8');

	return extractFieldsWithContext(fileStr);
}

async function docxDataParser({ filePath }) {
	const content = fs.readFileSync(filePath, 'binary');
	const zip = new PizZip(content);
	const fileStr = zip.files['word/document.xml'].asText()
		.replace(/(<w:p )[\s\S]*?>/g, "\n<w:p")
		.replace(/(<([^>]+)>)/ig, "");

	return extractFieldsWithContext(fileStr);
}

async function docxToDocx({ templateData, filePath }) {
	const content = fs.readFileSync(filePath, 'binary'); // Important : 'binary' pour PizZip
	const zip = new PizZip(content);
	const templateOptions = {
		parser: expressionParser,
		nullGetter: function (part, scope) {
			if (!part || !part.value) return "";
			const parts = part.value.split('.');
			if (parts.length) return getValue(parts, templateData, scope);
			return "";
		}
	};

	// Initialiser Docxtemplater
	const doc = new Docxtemplater(zip, templateOptions);
	await doc.renderAsync(templateData);

	const buffer = doc.getZip().generate({
		type: 'nodebuffer',
		compression: "DEFLATE"
	});

	return {
		buffer: buffer,
		contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		ext: '.docx'
	};
}

/* eslint-disable */
function docxToPdf({ templateData, filePath, req }) { }
function dustToDocx({ templateData, filePath, req }) { }
/* eslint-enable */

async function dustToPdf({ templateData, filePath, req }) {
	templateData.staticImagePath = __appPath + '/public/img';

	let dustSrc = fs.readFileSync(filePath, 'utf8');
	// Add Bootstrap to template
	// See Docs on => https://simplegrid.io/
	const simpleGridCss = fs.readFileSync(__appPath + '/public/css/plugins/simple-grid/simple-grid.min.css', 'utf8');
	dustSrc = dustSrc.replace("<!-- INSERT SIMPLE GRID HERE - DO NOT REMOVE -->", "<style>" + simpleGridCss + "</style>");
	dust.insertLocalsFn(templateData ? templateData : {}, req);

	const tmpFileName = __dirname + '/../' + new Date().getTime() + '' + Math.floor(Math.random() * Math.floor(100)) + '.pdf';

	const html = await new Promise((resolve, reject) => {
		dust.renderSource(dustSrc, templateData, function (err, html) {
			if (err)
				return reject(err);
			resolve(html);
		});
	});

	// https://pptr.dev/next/api
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();
	await page.setContent(html);
	// https://pptr.dev/api/puppeteer.pdfoptions
	let format = 'A4';
	let landscape = false;
	let displayHeaderFooter = true;
	let margin = ['50px', '50px', '20px', '20px'];
	let headerTemplate = '';
	let footerTemplate = '';
	let width = null;
	let height = null;

	try {
		format = await page.$eval("pdfconf", el => el.getAttribute("data-format"));
		if (format.includes(',')) {
			width = format.split(',')[0];
			height = format.split(',')[1];
			format = null;
		}
		landscape = await page.$eval("pdfconf", el => el.getAttribute("data-landscape"));
		landscape = landscape == '1';
		margin = await page.$eval("pdfconf", el => el.getAttribute("data-pdf-margin"));
		if (margin)
			margin = margin.split(',');

		headerTemplate = await page.$eval('#header', el => el.innerHTML);
		footerTemplate = await page.$eval('#footer', el => el.innerHTML);
		await page.$eval('#header', el => el.remove());
		await page.$eval('#footer', el => el.remove());
	} catch (err) {
		console.error(err.message);
	}

	if (headerTemplate == '' && footerTemplate == '')
		displayHeaderFooter = false;

	await page.pdf({
		path: tmpFileName,
		height,
		width,
		format,
		landscape,
		displayHeaderFooter,
		headerTemplate: headerTemplate,
		footerTemplate: footerTemplate,
		margin: {
			top: margin[0],
			bottom: margin[1],
			right: margin[2],
			left: margin[3]
		},
		printBackground: true
	});
	await browser.close();

	const fileContent = fs.readFileSync(tmpFileName);
	fs.unlinkSync(tmpFileName);

	return {
		buffer: fileContent,
		contentType: "application/pdf",
		ext: '.pdf'
	};
}

function getGlobalVariables() {
	return [{
		ref: 'g_user_login',
		func: data => data.req.user.f_login,
		description: "global_component.document_template.global_variables.user_login"
	}, {
		ref: 'g_user_email',
		func: data => data.req.user.f_email,
		description: "global_component.document_template.global_variables.user_email"
	}, {
		ref: 'g_datetime',
		func: _ => dayjs().format('DD/MM/YYYY hh:mm:ss'),
		description: "global_component.document_template.global_variables.datetime"
	}, {
		ref: 'g_time',
		func: _ => dayjs().format('hh:mm:ss'),
		description: "global_component.document_template.global_variables.time"
	}, {
		ref: 'g_date',
		func: _ => dayjs().format('DD/MM/YYYY'),
		description: "global_component.document_template.global_variables.date"
	}];
}

function getDataParser(templateExtention) {
	switch (templateExtention) {
		case "dust":
		case "html":
			return dustDataParser;

		case "odt":
		case "doc":
		case "docx":
			return docxDataParser;

		// TODO: Default data finder with simple readfile
		default:
			return _ => { throw new Error("Unhandled source template file type '" + templateExtention + "'. Provide your own by setting `data.templateDataParser` through DocumentTemplate hooks") }
	}
}

function getTemplateGenerator(inputType, outputType) {
	if (['dust', 'html'].includes(inputType)) {
		if (outputType === 'pdf')
			return dustToPdf;
		if (outputType === 'docx')
			return dustToDocx;
	}
	if (['docx', 'doc'].includes(inputType)) {
		if (outputType === 'docx')
			return docxToDocx;
		if (outputType === 'pdf')
			return docxToPdf;
	}

	return _ => { throw new Error("Unhandled template output type '" + outputType + "' for input type '" + inputType + "', no template generator available. Provide your own by setting `data.templateGenerator` through DocumentTemplate hooks") }
}

module.exports = {
	getDataParser,
	getTemplateGenerator,
	getGlobalVariables
}
