// Browse a specific locales .json files and check in specified folder if the trad key is used
// Use to clean unused locals trad key and clean json files
const path = require('path');
const fs = require('fs-extra');

// Configuration
const searchFolder = __dirname + '/../';
const searchExt = ['.dust', '.js', '.json'];
const ignoredFolder = ['.git', 'node_modules', 'locales'];
const locales = require('../structure/template/app/locales/en-EN');

async function getFilesInDirectoryAsync(dir, ext, ignoreFolder) {
	let files = [];

	if(ignoreFolder.filter(x => dir.indexOf(x) != -1).length != 0){
		console.log(`Ignored => ${dir}`);
		return files;
	}

	const filesFromDirectory = fs.readdirSync(dir);

	for (const file of filesFromDirectory) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			// eslint-disable-next-line no-await-in-loop
			const nestedFiles = await getFilesInDirectoryAsync(filePath, ext, ignoreFolder);
			files = files.concat(nestedFiles);
		} else if (ext.includes(path.extname(file))) {
			files.push(filePath);
		}
	}

	return files;
}

function searchInFiles(files, filter) {
	for (const file of files) {
		const fileContent = fs.readFileSync(file);

		// We want full words, so we use full word boundary in regex.
		const regex = new RegExp('\\b' + filter + '\\b');
		if (regex.test(fileContent))
			return true;
	}

	return false;
}

function propertiesToArray(obj) {
	const isObject = val =>
		typeof val === 'object' && !Array.isArray(val);

	// eslint-disable-next-line no-confusing-arrow
	const addDelimiter = (a, b) => a ? `${a}.${b}` : b;

	const paths = (obj = {}, head = '') => Object.entries(obj).reduce((product, [key, value]) => {
		const fullPath = addDelimiter(head, key)
		return isObject(value) ?
			product.concat(paths(value, fullPath)) :
			product.concat(fullPath)
	}, []);


	return paths(obj);
}

let cpt = 0;
(async () => {

	const localesKeys = propertiesToArray(locales);

	const files = await getFilesInDirectoryAsync(searchFolder, searchExt, ignoredFolder);

	for (let i = 0; i < localesKeys.length; i++) {
		const found = searchInFiles(files, localesKeys[i]);

		if(!found){
			cpt++;
			console.log(`Key not found => ${localesKeys[i]}`);
		}
	}

})().then(_ => {
	console.log(`Analize done. Keys not found => ${cpt}`);
	process.exit(1);
}).catch(err => {
	console.error(err);
	process.exit(1);
});
