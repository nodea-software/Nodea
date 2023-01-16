const readline = require('readline');
const fs = require('fs-extra');

const process_manager = require('../services/process_manager.js');
const parser = require('../services/bot.js');

const mandatoryInstructions = require('../structure/mandatory_instructions');
const structure_application = require('../structure/structure_application');
const bot = require('../helpers/bot');
const instruction_helper = require('../utils/data_helper');

function scriptGeneratingEnd(path, user_id, script_infos, script_processing, resolve = false) {
	// Delete instructions file
	if (fs.existsSync(path))
		fs.unlinkSync(path);
	// Tell client that the script is over
	script_infos[user_id].over = true;
	// Tell the server that script processing is done
	script_processing.state = false;
	// Save application metadata if exist
	if(script_infos[user_id].data && script_infos[user_id].data.application)
		script_infos[user_id].data.application.save();
	if(resolve)
		resolve();
}
exports.scriptGeneratingEnd = scriptGeneratingEnd;

// Execution all the script
exports.executeFile = (req, user_id, __, script_infos, script_processing) => new Promise(resolve => {
	// Open file descriptor
	const rl = readline.createInterface({
		input: fs.createReadStream(req.file.path)
	});

	/* If one of theses value is to 2 after readings all lines then there is an error,
	line to 1 are set because they are mandatory lines added by the generator */
	const exceptions = {
		createNewApplication : {
			error: 0,
			errorMessage: "You can't create or select more than one application in the same script."
		},
		createModuleHome: {
			error: 1,
			errorMessage: "You can't create a module home, because it's a default module in the application."
		},
		createModuleAuthentication: {
			error: 1,
			errorMessage: "You can't create a module authentication, because it's a default module in the application."
		},
		createEntityUser: {
			error: 1,
			errorMessage: "You can't create a entity user, because it's a default entity in the application."
		},
		createEntityRole: {
			error: 1,
			errorMessage: "You can't create a entity role, because it's a default entity in the application."
		},
		createEntityGroup: {
			error: 1,
			errorMessage: "You can't create a entity group, because it's a default entity in the application."
		},
		setFieldUnique: {
			error: 1,
			errorMessage: "You can't set a field unique in a script, please execute the instruction in preview."
		},
		delete: {
			error: 1,
			errorMessage: "Please do not use delete instruction in script mode."
		}
	};

	// Read file line by line, check for empty line, line comment, scope comment
	let fileLines = [];
	let commenting = false;

	// Checking file
	let lineIdx = -1;
	rl.on('line', line => {
		// Empty line || One line comment scope
		if (line.trim() == '' || (line.indexOf('/*') != -1 && line.indexOf('*/') != -1 || line.indexOf('//*') != -1))
			return;

		// Comment scope start
		if (line.indexOf('/*') != -1 && !commenting)
			commenting = true;

		// Comment scope end
		else if (line.indexOf('*/') != -1 && commenting)
			commenting = false;

		else if (!commenting) {
			const positionComment = line.indexOf('//');
			// Line start with comment
			if (positionComment == 0)
				return;
			// Line comment is after or in the instruction
			if (positionComment != -1)
				line = line.substring(0, line.indexOf('//'));

			// Get the wanted function given by the bot to do some checks
			let parserResult;
			try {
				line = instruction_helper.prepareInstruction(line);
				parserResult = parser.parse(line);
				lineIdx++;
			} catch (err) {
				// Update script logs
				script_infos[user_id].answers.unshift({
					instruction: line,
					message: __(err.message, err.messageParams || []),
					error: true
				});
				return scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing, resolve);
			}

			const designerFunction = parserResult.function;

			let designerValue = '';
			if (typeof parserResult.options !== "undefined")
				designerValue = parserResult.options.value ? parserResult.options.value.toLowerCase() : '';

			if (designerFunction == "createNewApplication") {
				script_infos[user_id].isNewApp = true;
				// Getting all new app instructions indexes
				if(typeof script_infos[user_id].newAppIndexes === 'undefined')
					script_infos[user_id].newAppIndexes = [];
				script_infos[user_id].newAppIndexes.push(lineIdx);
			}

			if (designerFunction == "createNewApplication" || designerFunction == "selectApplication")
				exceptions.createNewApplication.nbAuthorized++;

			if(designerFunction == "createNewModule" && designerValue == "home")
				exceptions.createModuleHome.nbAuthorized++;

			if(designerFunction == "createNewModule" && designerValue == "authentication")
				exceptions.createModuleAuthentication.nbAuthorized++;

			if(designerFunction == "createNewEntity" && designerValue == "user")
				exceptions.createEntityUser.nbAuthorized++;

			if(designerFunction == "createNewEntity" && designerValue == "role")
				exceptions.createEntityRole.nbAuthorized++;

			if(designerFunction == "createNewEntity" && designerValue == "group")
				exceptions.createEntityGroup.nbAuthorized++;

			if(typeof designerFunction !== 'undefined' && designerFunction.indexOf('delete') != -1)
				exceptions.delete.nbAuthorized++;

			fileLines.push(line);
		}
	});

	// All lines read, execute instructions
	rl.on('close', async () => {

		if(script_infos[user_id].over)
			return;

		let errorMsg = '';
		for(const item in exceptions){
			if(item == "createNewApplication" && exceptions[item].value == 0)
				errorMsg += 'You have to create or select an application in your script.<br><br>';
			if(exceptions[item].value > 1)
				errorMsg += exceptions[item].errorMessage + '<br><br>';
		}

		// File content not valid
		if(errorMsg.length > 0){
			script_infos[user_id].answers = [];
			script_infos[user_id].answers.push({
				message: errorMsg
			});
			return scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing, resolve);
		}

		script_infos[user_id].totalInstruction = fileLines.length;

		// If new app created, then add mandatory instructions
		if(script_infos[user_id].isNewApp) {
			const newFileLines = [];
			for (let i = 0; i < fileLines.length; i++) {
				newFileLines.push(fileLines[i]);
				if(script_infos[user_id].newAppIndexes.indexOf(i) != -1) {
					script_infos[user_id].totalInstruction += mandatoryInstructions.length;
					newFileLines.push(...mandatoryInstructions);
				}
			}
			fileLines = newFileLines;
		}

		// Set default theme if different than blue-light
		if (typeof req.session.defaultTheme !== "undefined" && req.session.defaultTheme != "blue-light")
			fileLines.push("set theme " + req.session.defaultTheme);

		let currentApplication;
		// Executing all instructions !
		for (let i = 0; i < fileLines.length; i++) {
			// Re-create data object to avoid custom parameters set in bot being used multiple times
			let data = {
				app_name: req.session.app_name,
				module_name: req.session.module_name,
				entity_name: req.session.entity_name,
				googleTranslate: req.session.toTranslate || false,
				lang_user: req.session.lang_user,
				currentUser: req.session.passport.user,
				code_platform_user: null,
				isGeneration: true,
				application: currentApplication,
			}

			// Mandatory instructions are done, then init application before continuing
			if(script_infos[user_id].isNewApp && i == mandatoryInstructions.length + 1)
				await structure_application.initializeApplication(data.application); // eslint-disable-line

			try {
				data = await bot.execute(req, fileLines[i], data, false); // eslint-disable-line

				if (data.application)
					currentApplication = data.application;

				script_infos[user_id].data = data;
				script_infos[user_id].doneInstruction++;

				// Update script logs
				script_infos[user_id].answers.unshift({
					instruction: fileLines[i],
					message: __(data.message, data.messageParams || [])
				});
			} catch(err) {
				console.trace(err);
				// Update script logs
				script_infos[user_id].answers.unshift({
					instruction: fileLines[i],
					message: __(err.message, err.messageParams || []),
					error: true
				});
				return scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing, resolve);
			}
		}

		// Write source script in generated workspace
		const historyPath = __dirname + '/../workspace/' + req.session.app_name + "/history_script.nps";

		let instructionsToWrite = '';
		if(script_infos[user_id].isNewApp){
			instructionsToWrite = fileLines[0] + '\n';
			instructionsToWrite += fileLines.slice(Math.max(mandatoryInstructions.length, 1)).join("\n");
		} else {
			instructionsToWrite = fs.readFileSync(historyPath, 'utf8');
			instructionsToWrite += '// --- Start of the script --- //\n\n';
			instructionsToWrite += fileLines.join("\n");
		}
		instructionsToWrite += "\n\n// --- End of the script --- //\n";
		fs.writeFileSync(historyPath, instructionsToWrite);

		try {

			// eslint-disable-next-line global-require
			const moduleAlias = require('module-alias');
			moduleAlias.addAlias('@config', global.__workspacePath + '/' + currentApplication.name + '/config');
			moduleAlias.addAlias('@core', global.__workspacePath + '/' + currentApplication.name + '/_core');
			moduleAlias.addAlias('@app', global.__workspacePath + '/' + currentApplication.name + '/app');

			// Workspace sequelize instance
			delete require.cache[require.resolve(global.__workspacePath + '/' + currentApplication.name + '/app/models/')]; // eslint-disable-line
			const workspaceSequelize = require(global.__workspacePath + '/' + currentApplication.name + '/app/models/'); // eslint-disable-line

			// We need to clear toSync.json
			const toSyncFileName = global.__workspacePath + '/' + currentApplication.name + '/app/models/toSync.json';
			const toSyncObject = JSON.parse(fs.readFileSync(toSyncFileName));

			const tableName = workspaceSequelize.sequelize.options.dialect == "postgres" ? "table_name" : "TABLE_NAME";

			// Looking for already exisiting table in workspace BDD
			const result = await workspaceSequelize.sequelize.query("SELECT * FROM INFORMATION_SCHEMA.TABLES;", {type: workspaceSequelize.sequelize.QueryTypes.SELECT});
			const workspaceTables = [];
			for (let i = 0; i < result.length; i++)
				workspaceTables.push(result[i][tableName]);

			for(const entity in toSyncObject)
				if(workspaceTables.indexOf(entity) == -1 && !toSyncObject[entity].force){
					toSyncObject[entity].attributes = {};
					// We have to remove options from toSync.json that will be generate with sequelize sync
					// But we have to keep relation toSync on already existing entities
					if (typeof toSyncObject[entity].options !== "undefined") {
						const cleanOptions = [];
						for (let i = 0; i < toSyncObject[entity].options.length; i++)
							if (workspaceTables.indexOf(toSyncObject[entity].options[i].target) != -1 && toSyncObject[entity].options[i].relation != "belongsTo")
								cleanOptions.push(toSyncObject[entity].options[i]);
						toSyncObject[entity].options = cleanOptions;
					}
				}
			fs.writeFileSync(toSyncFileName, JSON.stringify(toSyncObject, null, '\t'), 'utf8');
		} catch(err) {
			console.error(err);
		}

		// Kill the application server if it's running, it will be restarted when accessing it
		const process_server_per_app = process_manager.process_server_per_app;
		if (process_server_per_app[currentApplication.name] != null && typeof process_server_per_app[currentApplication.name] !== "undefined"){
			await process_manager.killChildProcess(process_server_per_app[currentApplication.name])
			process_server_per_app[currentApplication.name] = null;
		}

		// Delete instructions file
		return scriptGeneratingEnd(req.file.path, user_id, script_infos, script_processing, resolve);
	});
})