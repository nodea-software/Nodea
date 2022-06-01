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

async function generatePages(idProgram, zipPath, user = false) {
	const tmpProgFolder = `${__dirname}/../tmpProgram_${idProgram}/`;
	const transaction = await models.sequelize.transaction();
	try {
		fs.mkdirsSync(tmpProgFolder);
		zipper.sync.unzip(zipPath).save(tmpProgFolder);

		let config;
		try {
			const confFile = fs.readFileSync(`${tmpProgFolder}/config.json`, 'utf8');
			config = JSON.parse(confFile);
		} catch(err) {
			throw new Error("Couldn't parse config.json file");
		}
		await models.E_page.destroy({where: {fk_id_program: idProgram}, transaction});

		let stepOrder = 0;
		// eslint-disable-next-line no-inner-declarations
		async function createPage(step, isError = false) {
			const page = {
				fk_id_program: idProgram,
				f_title: step.name,
				f_type: step.type == "action" ? 'script' : 'sequence',
				f_order: ++stepOrder,
				f_delay: step.delay || 0,
				f_timeout: step.timeout || 30000,
				f_execute_on_error: isError
			}
			if (step.startWith) {
				page.f_startwith_url = step.startWith.url;
				page.f_startwith_method = step.startWith.method || "get"
			}
			if (step.endWith) {
				page.f_endwith_url = step.endWith.url;
				page.f_endwith_method = step.endWith.method || "get"
			}
			if (step.download) {
				page.f_download_url = step.download.url;
				page.f_download_filename = step.download.filename
			}

			if (step.snippet) {
				if (!fs.existsSync(`${tmpProgFolder}/${step.snippet}`))
					console.warn(`Snippet file of step ${step.f_name || stepOrder} doesn't exists`);
				else {
					const snippet = fs.readFileSync(`${tmpProgFolder}/${step.snippet}`, 'utf8');
					page.f_script = snippet
				}
			}

			await models.E_page.create(page, {transaction, user});
		}

		const pagePromises = [];
		for (const step of config.steps || [])
			pagePromises.push(createPage(step, false));

		for (const step of config.onError || [])
			pagePromises.push(createPage(step, true));

		await Promise.all(pagePromises);

		await transaction.commit();
	} catch(err) {
		console.error(err);
		await transaction.rollback();
	} finally {
		if (fs.exists(tmpProgFolder))
			rmdirRecursive(tmpProgFolder);
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
	generateZip,
	generatePages
};