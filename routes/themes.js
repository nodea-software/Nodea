const express = require('express');
const router = express.Router();
const middlewares = require('../helpers/middlewares');
const fs = require("fs-extra");
const helpers = require("../utils/helpers");
// TODO 3.2 - Rework with other module
// const unzip = require("unzip");
// const through = require('through2');
const multer = require('multer');
const moment = require("moment");
// const dataHelper = require('../utils/data_helper');
// const helper = require('../utils/helpers');

router.get('/', middlewares.isLoggedIn, function(req, res) {
	const data = {};

	const themePath = __dirname + '/../structure/template/public/themes';
	const themeListAvailable = fs.readdirSync(themePath).filter(function(folder) {
		return folder.indexOf('.') == -1 && folder != "my-custom-theme";
	});

	const availableTheme = [];

	for (let i = 0; i < themeListAvailable.length; i++) {
		try {
			const infosTheme = JSON.parse(fs.readFileSync(__dirname + '/../structure/template/public/themes/' + themeListAvailable[i] + '/infos.json'));
			const screenPath = __dirname + '/../structure/template/public/themes/' + themeListAvailable[i] + '/screenshot.png';
			const imgData = fs.readFileSync(screenPath);
			infosTheme.codeName = themeListAvailable[i];
			infosTheme.buffer = new Buffer(imgData).toString('base64');
			availableTheme.push(infosTheme);
		} catch (err) {
			if (err.errno == -2) {
				console.log("Missing infos.json or screenshot.png in theme " + themeListAvailable[i] + ". It will be ignored. See documentation for more information about custom theme.");
			} else {
				console.error(err);
			}
		}
	}

	data.availableTheme = availableTheme;

	if(typeof req.session.defaultTheme !== "undefined")
		data.defaultTheme = req.session.defaultTheme;
	else
		data.defaultTheme = "blue-light";

	res.render('front/themes', data);
});

router.get('/download_default', function(req, res) {
	const p = new Promise(function(resolve, reject) {
		const completeFilePath = __dirname + "/../structure/template/public/themes/my-custom-theme.zip";
		res.download(completeFilePath, "my-custom-theme-"+moment().format("HHmmss")+".zip", function(err) {
			if (err)
				reject(err);
			else
				resolve();
		});
	});

	p.then(function() {
		console.log("Custom theme zip was successfully downloaded !");
		res.end();
	}).catch(function(err) {
		console.error(err);
		req.session.toastr.push({
			level: 'error',
			message: "File not found"
		});
		res.writeHead(303, {
			Location: req.headers.referer
		});
		res.end();
	});
});

router.post('/delete_theme', function(req, res) {
	try{
		helpers.rmdirSyncRecursive(__dirname + "/../structure/template/public/themes/"+req.body.theme);
		res.status(200).send(true);
	} catch(err){
		console.error(err);
		res.status(500).send(err);
	}
});

router.post('/default_theme', function(req, res) {
	req.session.defaultTheme = req.body.theme;
	res.status(200).send(true);
});

router.post('/upload_theme', multer({
	dest: './upload/'
}).single('themefile'), function(req, res) {

	return res.redirect("/themes");

	// function notHandlingFile(file, entry){
	// 	console.log("Not handling this file: "+file);
	// 	entry.autodrain();
	// }

	// if(req.file.size < 15000000){
	// 	if(req.file.mimetype == "application/zip" || req.file.mimetype == "application/x-zip-compressed"){
	// 		const checkTheme = {
	// 			css: false,
	// 			info: false,
	// 			screenshot: false
	// 		};
	// 		// Looking for infos.json
	// 		fs.createReadStream('./' + req.file.path)
	// 			.pipe(unzip.Parse())
	// 			.on('entry', function(entry) {
	// 				if (entry.path.indexOf('/infos.json') != -1) {
	// 					checkTheme.info = true;
	// 					try{
	// 						entry.pipe(through.obj(function(contents) {
	// 							try{
	// 								const infoData = JSON.parse(contents);
	// 								// Create new theme folder
	// 								const themeCodeName = dataHelper.clearString(infoData.name);

	// 								if (!fs.existsSync(__dirname + "/../structure/template/public/themes/" + themeCodeName)) {
	// 									fs.mkdirSync(__dirname + "/../structure/template/public/themes/" + themeCodeName);
	// 									fs.mkdirSync(__dirname + "/../structure/template/public/themes/" + themeCodeName + "/css");
	// 									fs.mkdirSync(__dirname + "/../structure/template/public/themes/" + themeCodeName + "/js");
	// 									fs.mkdirSync(__dirname + "/../structure/template/public/themes/" + themeCodeName + "/img");

	// 									// Unzip
	// 									fs.createReadStream('./' + req.file.path)
	// 										.pipe(unzip.Parse())
	// 										.on('entry', function(entry) {
	// 											try{
	// 												const filePath = entry.path;
	// 												const type = entry.type;

	// 												if(type == "File"){
	// 													const fileName = entry.path.split("/").pop();
	// 													const fileExt = fileName.split(".").pop().toLowerCase();
	// 													let writeStream;
	// 													if(filePath.indexOf("/css/") != -1){
	// 														if(fileExt == "css"){
	// 															writeStream = fs.createWriteStream(__dirname + "/../structure/template/public/themes/"+themeCodeName+"/css/"+fileName);
	// 															checkTheme.css = true;
	// 															entry.pipe(writeStream);
	// 														} else {
	// 															notHandlingFile(filePath, entry);
	// 														}
	// 													} else if(filePath.indexOf("/js/") != -1){
	// 														if(fileExt == "js"){
	// 															writeStream = fs.createWriteStream(__dirname + "/../structure/template/public/themes/"+themeCodeName+"/js/"+fileName);
	// 															entry.pipe(writeStream);
	// 														} else {
	// 															notHandlingFile(filePath, entry);
	// 														}
	// 													} else if(filePath.indexOf("/img/") != -1){
	// 														if (fileExt == "jpg" || fileExt == "jpeg" || fileExt == "png") {
	// 															writeStream = fs.createWriteStream(__dirname + "/../structure/template/public/themes/" + themeCodeName + "/img/" + fileName);
	// 															entry.pipe(writeStream);
	// 														} else {
	// 															notHandlingFile(filePath, entry);
	// 														}
	// 													} else if(filePath.indexOf("/infos.json") != -1){
	// 														if(fileExt == "json"){
	// 															writeStream = fs.createWriteStream(__dirname + "/../structure/template/public/themes/"+themeCodeName+"/"+fileName);
	// 															checkTheme.info = true;
	// 															entry.pipe(writeStream);
	// 														} else {
	// 															notHandlingFile(filePath, entry);
	// 														}
	// 													} else if(filePath.indexOf("/screenshot.png") != -1){
	// 														if(fileExt == "png"){
	// 															writeStream = fs.createWriteStream(__dirname + "/../structure/template/public/themes/"+themeCodeName+"/"+fileName);
	// 															checkTheme.screenshot = true;
	// 															entry.pipe(writeStream);
	// 														} else {
	// 															notHandlingFile(filePath, entry);
	// 														}
	// 													} else {
	// 														notHandlingFile(filePath, entry);
	// 													}
	// 												}
	// 											} catch(err){
	// 												console.error(err);
	// 												entry.autodrain();
	// 											}
	// 										}).on('error', function(err) {
	// 											console.error(err);
	// 											req.session.toastr = [{level: 'error', message: "Sorry, an internal error occured."}];
	// 											res.redirect("/themes");
	// 										}).on('close', function(){
	// 											if(checkTheme.css && checkTheme.info && checkTheme.screenshot){
	// 												req.session.toastr = [{level: 'success', message: "structure.ui.theme.successUpload"}];
	// 												res.redirect("/themes");
	// 											} else {
	// 												helper.rmdirSyncRecursive(__dirname + "/../structure/template/public/themes/"+themeCodeName);
	// 												let message = "";
	// 												if(!checkTheme.css)
	// 													message = "structure.ui.theme.missingCss"
	// 												if(!checkTheme.info)
	// 													message = "structure.ui.theme.missingInfo"
	// 												if(!checkTheme.screenshot)
	// 													message = "structure.ui.theme.missingScreenshot"
	// 												req.session.toastr = [{level: 'error', message: message}];
	// 												res.redirect("/themes");
	// 											}
	// 										});
	// 								} else {
	// 									req.session.toastr = [{level: 'error', message: "structure.ui.theme.alreadyExist"}];
	// 									res.redirect("/themes");
	// 								}
	// 							} catch(err){
	// 								console.error(err);
	// 								entry.autodrain();
	// 							}
	// 						}))
	// 					} catch(err){
	// 						console.error(err);
	// 						entry.autodrain();
	// 					}
	// 				} else {
	// 					entry.autodrain();
	// 				}
	// 			}).on('error', function(err) {
	// 				console.error(err);
	// 				req.session.toastr = [{level: 'error', message: "Sorry, an internal error occured."}];
	// 				res.redirect("/themes");
	// 			}).on('close', function(){
	// 				if(!checkTheme.info){
	// 					const message = "structure.ui.theme.missingInfo"
	// 					req.session.toastr = [{level: 'error', message: message}];
	// 					res.redirect("/themes");
	// 				}
	// 			});
	// 	} else {
	// 		req.session.toastr = [{level: 'error', message: "Error, only .zip are accepted."}];
	// 		res.redirect("/themes");
	// 	}
	// } else {
	// 	req.session.toastr = [{level: 'error', message: "Error, max theme size: 10M."}];
	// 	res.redirect("/themes");
	// }
});

module.exports = router;