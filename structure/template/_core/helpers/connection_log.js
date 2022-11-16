const { logConnexionFolder } = require('@config/global');
const fs = require('fs-extra');
const path = require('path');
const dayjs = require('dayjs');

// Handle morgan for create and write the file for connection traceability
if(logConnexionFolder && !fs.existsSync(logConnexionFolder)){
	fs.mkdirSync(logConnexionFolder);
}

const filenameLog = `connection.log`;

exports.writeConnectionLog = (line) => fs.appendFileSync(path.join(logConnexionFolder, filenameLog), `${dayjs().format("YYYY-MM-DD HH:mm:ss-SSS")} ${line}\n`);