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

module.exports = {
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
		if (valueToCheck.length > 30) {
			console.log("Value is too long => " + valueToCheck + "(" + valueToCheck.length + ")");
			const err = new Error('error.valueTooLong');
			err.messageParams = [valueToCheck];
			throw err;
		}
		return data;
	}
}