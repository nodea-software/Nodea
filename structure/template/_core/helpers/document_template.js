const moment = require('moment');
const fs = require('fs-extra');
const dust = require('dustjs-linkedin');
const pdf = require('html-pdf');
const JSZip = require('jszip');
const Docxtemplater = require('docxtemplater');
const decompress = require('decompress');

function extractFieldsWithContext(string) {
	// eslint-disable-next-line no-control-regex
	const regExp = new RegExp('{(((?:[#/]|[a-zA-Z]))(?!__)[^\n}]*)}', 'g');
	const fieldsArray = [];
	let matches, currentPath = '';
	while ((matches = regExp.exec(string)) !== null) {
		let [fullMatch, fieldPath, openingChar] = [...matches]; // eslint-disable-line
		// New context, add to currentPath
		if (openingChar == '#')
			currentPath = currentPath == '' ? fieldPath.substr(1) : currentPath+'.'+fieldPath.substr(1);
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
			fieldsArray.push(currentPath == '' ? fieldPath : currentPath+'.'+fieldPath)
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
		if (typeof data === "object" && moment(new Date(data)).isValid())
			data = moment(new Date(data)).format("DD/MM/YYYY");

		return data;
	} catch (e) {
		console.log(e);
		return '';
	}
}

function dustDataParser({filePath}){
	const fileStr = fs.readFileSync(filePath, 'utf8');

	return extractFieldsWithContext(fileStr);
}

async function docxDataParser({filePath}){
	await decompress(filePath, 'tmp')
	const data = fs.readFileSync(`tmp/word/document.xml`, 'utf8');
	const fileStr = data.replace(/(<w:p )[\s\S]*?>/g, "\n<w:p").replace(/(<([^>]+)>)/ig, "");
	fs.remove('tmp');

	return extractFieldsWithContext(fileStr);
}

async function docxToDocx({templateData, filePath}){
	const content = fs.readFileSync(filePath);
	const zip = new JSZip(content);
	const doc = new Docxtemplater();
	const templateOptions = {
		nullGetter: function (part, scope) {
			if (!part || !part.value)
				return "";
			const parts = part.value.split('.');
			if (parts.length)
				return getValue(parts, templateData, scope);
			return "";
		}
	};
	doc.setOptions(templateOptions);
	doc.loadZip(zip);
	doc.setData(templateData);
	doc.render();
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

function docxToPdf({templateData, filePath, req}){}
function dustToDocx({templateData, filePath, req}){}

async function dustToPdf({templateData, filePath, req}){
	templateData.staticImagePath = __appPath + '/public/img';

	let dustSrc = fs.readFileSync(filePath, 'utf8');
	// Add Bootstrap to template
	// See Docs on => https://simplegrid.io/
	const simpleGridCss = fs.readFileSync(__appPath + '/public/css/plugins/simple-grid/simple-grid.min.css', 'utf8');
	dustSrc = dustSrc.replace("<!-- INSERT SIMPLE GRID HERE - DO NOT REMOVE -->", "<style>" + simpleGridCss + "</style>");
	dust.insertLocalsFn(templateData ? templateData : {}, req);
	return await new Promise((resolve, reject) => {
		dust.renderSource(dustSrc, templateData, function(err, html) {
			if (err)
				return reject(err);

			const tmpFileName = __dirname + '/../' + new Date().getTime() + '' + Math.floor(Math.random() * Math.floor(100)) + '.pdf';

			const headerStartIdx = html.indexOf('<!--HEADER-->');
			const headerEndIdx = html.indexOf('<!--HEADER-->', headerStartIdx + '<!--HEADER-->'.length) + '<!--HEADER-->'.length;
			const header = headerStartIdx >= 0 ? html.substring(headerStartIdx, headerEndIdx) : null;

			const footerStartIdx = html.indexOf('<!--FOOTER-->');
			const footerEndIdx = html.indexOf('<!--FOOTER-->', footerStartIdx + '<!--FOOTER-->'.length) + '<!--FOOTER-->'.length;
			const footer = html.substring(footerStartIdx, footerEndIdx);

			html = html.replace(header, '');
			html = html.replace(footer, '');

			html = html.replace(/\*\*page\*\*/g, '{{page}}');
			html = html.replace(/\*\*pages\*\*/g, '{{pages}}');

			const optionsPDF = {
				orientation: "portrait",
				format: "A4",
				border: {
					top: "10px",
					right: "15px",
					bottom: "10px",
					left: "15px"
				}
			}

			if(!header)
				optionsPDF.header = header;

			pdf.create(html, optionsPDF).toFile(tmpFileName, err => {
				if (err)
					return reject(err);

				const fileContent = fs.readFileSync(tmpFileName);
				fs.unlinkSync(tmpFileName);
				resolve({
					buffer: fileContent,
					contentType: "application/pdf",
					ext: '.pdf'
				});
			});
		});
	})
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
		func: _ => moment().format('DD/MM/YYYY hh:mm:ss'),
		description: "global_component.document_template.global_variables.datetime"
	}, {
		ref: 'g_time',
		func: _ => moment().format('hh:mm:ss'),
		description: "global_component.document_template.global_variables.time"
	}, {
		ref: 'g_date',
		func: _ => moment().format('DD/MM/YYYY'),
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
			return _ => {throw new Error("Unhandled source template file type '"+templateExtention+"'. Provide your own by setting `data.templateDataParser` through DocumentTemplate hooks")}
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

	return _ => {throw new Error("Unhandled template output type '"+outputType+"' for input type '"+inputType+"', no template generator available. Provide your own by setting `data.templateGenerator` through DocumentTemplate hooks")}
}

module.exports = {
	getDataParser,
	getTemplateGenerator,
	getGlobalVariables
}