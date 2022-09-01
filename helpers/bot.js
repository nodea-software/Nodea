const designer = require('../services/designer.js');
const dataHelper = require('../utils/data_helper');
const metadata = require('../database/metadata')();
const session_manager = require('../services/session.js');
const parser = require('../services/bot.js');
const nodeaTypes = {
	"string" : [],
	"color": [
		"colour",
		"couleur"
	],
	"currency": [
		"money",
		"dollar",
		"euro",
		"devise",
		"argent"
	],
	"qrcode": [],
	"barcode": [
		"ean8",
		"isbn",
		"issn",
		"ean13",
		"upca",
		"code39",
		"code128"
	],
	"url": [
		"lien",
		"link"
	],
	"password": [
		"mot de passe",
		"secret"
	],
	"number": [
		"nombre",
		"int",
		"integer"
	],
	"big number": [
		"big int",
		"big integer",
		"grand nombre"
	],
	"decimal": [
		"double",
		"float",
		"figures"
	],
	"date": [],
	"datetime": [],
	"time": [
		"heure"
	],
	"email": [
		"mail",
		"e-mail",
		"mel"
	],
	"phone": [
		"tel",
		"téléphone",
		"portable"
	],
	"fax": [],
	"boolean": [
		"checkbox",
		"à cocher",
		"case à cocher"
	],
	"radio": [
		"case à sélectionner"
	],
	"enum": [],
	"text": [
		"texte"
	],
	"regular text": [
		"texte standard"
	],
	"file": [
		"fichier"
	],
	"picture": [
		"img",
		"image",
		"photo"
	]
}

async function execute(req, instruction, __, data = {}, saveMetadata = true) {
	// Lower the first word for the basic parser json
	instruction = dataHelper.prepareInstruction(instruction);

	// Instruction to be executed
	data = {
		...data,
		...parser.parse(instruction)
	};

	// Rework the data to get value for the code / url / show
	data = dataHelper.reworkData(data);

	if (typeof data.error !== 'undefined')
		throw data.error;

	data.app_name = req.session.app_name;
	data.module_name = req.session.module_name;
	data.entity_name = req.session.entity_name;
	data.googleTranslate = req.session.toTranslate || false;
	data.lang_user = req.session.lang_user;
	data.currentUser = req.session.passport.user;
	data.code_platform = req.session.code_platform;
	data.isGeneration = true;

	if(data.function != 'createNewApplication' && data.function != 'deleteApplication')
		data.application = metadata.getApplication(data.app_name);

	let info;
	try {
		info = await designer[data.function](data);
	} catch (err) {
		console.error('Error on function: ' + data.function + '(Instruction: ' + instruction + ')');
		console.error(err);
		throw __(err.message ? err.message : err, err.messageParams || []);
	}

	if(data.function == 'deleteApplication' && req.session.nodea_chats && req.session.nodea_chats[data.options.value])
		req.session.nodea_chats[data.options.value] = {}

	const newData = session_manager.setSession(data.function, req, info, data);

	// Save metadata
	if(data.application && data.function != 'deleteApplication' && saveMetadata)
		data.application.save();

	newData.message = info.message;
	newData.messageParams = info.messageParams;
	newData.restartServer = typeof info.restartServer === 'undefined';
	return newData;
}

module.exports = {
	getNodeaTypes: _ => {
		const results = [];
		for(const nodeaType in nodeaTypes)
			results.push(nodeaType, ...nodeaTypes[nodeaType]);
		return results;
	},
	matchNodeaType: type => {
		for(const nodeaType in nodeaTypes) {
			if(type == nodeaType)
				return nodeaType;
			if(nodeaTypes[nodeaType].includes(type))
				return nodeaType;
		}
		return "string";
	},
	checkAndCreateAttr: (instructionsFunction, options, valueToCheck) => {
		const data = {
			function: instructionsFunction,
			options: options
		};

		if (!isNaN(valueToCheck))
			throw new Error('error.oneLetter');

		// Check foreign key length validation for database
		if(options.foreignKey && options.foreignKey.length > 60) {
			console.log(`Foreign key is too long => ${options.foreignKey}`);
			const err = new Error('error.fkValueTooLong');
			err.messageParams = [options.foreignKey];
			throw err;
		}

		if (valueToCheck.length > 30) {
			console.log("Value is too long => " + valueToCheck + "(" + valueToCheck.length + ")");
			const err = new Error('error.valueTooLong');
			err.messageParams = [valueToCheck];
			throw err;
		}

		return data;
	},
	execute
}