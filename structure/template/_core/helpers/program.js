const fs = require('fs-extra');
const models = require('@app/models');
const zipper = require('zip-local');

function rmdirRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(file => {
			const curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				// recurse
				rmdirRecursive(curPath);
			} else {
				// delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

async function generateZip(idProgram) {
	const program = await models.E_program.findOne({
		where: {id: idProgram},
		include: {
			model: models.E_page,
			as: 'r_page'
		},
		order: [[{model: models.E_page, as: 'r_page'}, 'f_order', 'ASC']]
	});
	if (!program)
		throw "Couldn't find Program";

	const json = {steps: []};
	const filesToCreate = [];
	const errorSteps = [];
	for (const [idx, page] of program.r_page.entries()) {
		const step = {
			name: page.f_titre,
			type: 'action'
		};

		if (page.f_type == 'sequence') {
			step.type = 'sequence';
		}

		if (page.f_startwith_url) {
			step.startWith = {
				url: page.f_startwith_url,
				method: page.f_startwith_method || 'GET'
			}
		}

		if (page.f_script !== null && page.f_script !== "") {
			const filename = `script_step_${idx}.js`;
			filesToCreate.push({
				filename,
				content: page.f_script
			});
			step.snippet = filename;
		}

		if (page.f_endwith_url) {
			step.endWith = {
				url: page.f_endwith_url,
				method: page.f_endwith_method || 'GET'
			}
		}

		if (page.f_download_url) {
			step.download = {
				url: page.f_download_url,
				filename: page.f_download_filename
			}
		}

		if (page.f_delay !== null)
			step.delay = page.f_delay;

		if (page.f_timeout !== null)
			step.timeout = page.f_timeout || false;

		if (page.f_execute_on_error === true)
			errorSteps.push(step);
		else
			json.steps.push(step);
	}

	if (errorSteps.length)
		json.onError = errorSteps;

	const tmpProgFolder = `${__appPath}/../tmpProgram_${idProgram}/`;
	const tmpZip = `${__appPath}/../program_${idProgram}.zip`;
	try {
		fs.mkdirsSync(tmpProgFolder);

		fs.writeFileSync(tmpProgFolder+'/config.json', JSON.stringify(json, null, 4), 'utf8');
		for (const file of filesToCreate)
			fs.writeFileSync(`${tmpProgFolder}/${file.filename}`, file.content, 'utf8');

		zipper.sync.zip(tmpProgFolder).compress().save(tmpZip);
	} catch(err) {
		console.error(err);
		rmdirRecursive(tmpProgFolder);

		throw "Impossible de créer les fichiers sur le disque"
	}

	rmdirRecursive(tmpProgFolder);

	return tmpZip;
}

module.exports = {
	generateZip
};