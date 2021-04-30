const winston = require('winston');
const moment = require('moment');
const fs = require('fs-extra');
const tsFormat = moment().format("YYYY-MM-DD HH:mm:ss");

module.exports = (_ => {
	if(fs.existsSync(__dirname + '/../logger.js'))
		// eslint-disable-next-line global-require
		return require(__dirname + '/../logger.js');

	const logger = new winston.Logger({
		transports: [
			new winston.transports.Console({
				level: "info",
				timestamp: tsFormat,
				colorize: true
			}),
			new winston.transports.File({
				level: "silly",
				timestamp: tsFormat,
				filename: __dirname + '/../winston_workspace.log'
			})
		]
	});

	return logger;
})()