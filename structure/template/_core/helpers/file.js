const globalConf = require('@config/global');
const moment = require('moment');
const uuidV4 = require('uuid').v4;
const fs = require('fs-extra');
const path = require('path');
const Jimp = require("jimp");

function securePath(...paths) {
	const securedPaths = [];
	let securedPath = "";
	// Remove null bytes
	for (const path of paths)
		if (path && path.replace)
			securedPaths.push(path.replace('\0', ''));
	if (!securedPaths.length)
		throw new Error("No path provided");
	// Resolve to full path
	securedPath = path.resolve(...securedPaths);
	// Check that path is inside globalConf.localestorage
	if (securedPath.indexOf(path.resolve(globalConf.localstorage)) != 0)
		throw new Error("Illegal file path : "+securedPath);

	return securedPath;
}

function createPathAndName(baseFolder, filename) {
	if (!filename || filename == "")
		throw new Error("No filename provided to createPath");

	const uuid = uuidV4();
	const date = moment();
	const year = date.year(), month = date.month(), day = date.date();

	const newFilename = `${uuid}-${filename}`;
	const filePath = `${baseFolder}/${year}/${month}/${day}/`;
	return [filePath, newFilename];
}

function originalFilename(filePath) {
	try {
		const fileInfo = path.parse(filePath);
		const filename = fileInfo.base;
		const originalName = filename.substr(37); // 36 to remove uuid, +1 to remove separating '-'

		return originalName;
	} catch(err) {
		console.error("Couldn't extract originalFilename of "+filePath);
		console.error(err);
		return "No name";
	}
}

function write(filePath, buffer, encoding = 'utf8') {
	return new Promise((resolve, reject) => {
		let securedPath, folderPath;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
			folderPath = path.parse(securedPath).dir;
			fs.ensureDirSync(folderPath);
		} catch(err) {
			return reject(err);
		}
		fs.writeFile(securedPath, buffer, {encoding}, err => {
			if (err) return reject(err);
			resolve();
		});
	});
}

function writeThumbnail(filePath, buffer, encoding = 'utf8') {
	return new Promise((resolve, reject) => {

		Jimp.read(buffer, (err, imgThumb) => {
			if (err)
				return console.error(err);

			const thumbnailWidth = globalConf.thumbnail.width;
			const thumbnailHeight = globalConf.thumbnail.height;
			const thumbnailQuality = globalConf.thumbnail.quality;
			imgThumb.resize(thumbnailWidth, thumbnailHeight).quality(thumbnailQuality).getBuffer(Jimp.AUTO, (err, buffer) => {
				if (err)
					return reject(err);
				resolve(write(filePath, buffer, encoding));
			});
		});
	});
}

function read(filePath, options = {}) {
	return new Promise((resolve, reject) => {
		const securedPath = securePath(globalConf.localstorage, filePath);
		fs.readFile(securedPath, options, (err, data) => {
			if (err)
				return reject(err);
			resolve(data);
		});
	})
}

async function readBuffer(path, options = {}) {
	let fileData;
	try {
		fileData = await read(path, options);
	} catch(err) {
		console.error("Couldn't read buffer of "+path);
		return null;
	}

	const encoding = options.encoding || 'base64';
	return Buffer.from(fileData).toString(encoding);
}

function remove(filePath) {
	return new Promise((resolve, reject) => {
		let securedPath;
		try {
			securedPath = securePath(globalConf.localstorage, filePath);
		} catch(err) {
			return reject(err);
		}
		fs.unlink(securedPath, err => {
			if (err) return reject(err);
			resolve();
		});
	});
}

function fullPath(filePath) {
	const securedPath = securePath(globalConf.localstorage, filePath);
	return securedPath;
}

module.exports = {
	createPathAndName,
	originalFilename,
	write,
	writeThumbnail,
	read,
	readBuffer,
	remove,
	securePath,
	fullPath
}