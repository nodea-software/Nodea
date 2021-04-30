const morgan = require('morgan');
const momentTZ = require('moment-timezone');
const split = require('split');
const consoleStamp = require('console-stamp');

const appConf = require('@config/application');

// Log every request (not /) to the console
const morganConf = {
	skip: req => {
		if(req.originalUrl == "/")
			return true;
	}
}

if (!global.auto_login) { // Mean not started from a generator

	// Add timestamp to standard logs
	morganConf.stream = split().on('data', line => {
		process.stdout.write(momentTZ().tz(appConf.timezone).format("YYYY-MM-DD HH:mm:ss-SSS") + " " + line + "\n")
	});

	// Add timestamp to console
	consoleStamp(console, {
		formatter: function() {
			return momentTZ().tz(appConf.timezone).format('YYYY-MM-DD HH:mm:ss-SSS');
		},
		label: false,
		datePrefix: "",
		dateSuffix: ""
	});
}

// Overide console.warn & console.error to file + line
['warn', 'error'].forEach(methodName => {
	const originalMethod = console[methodName];
	console[methodName] = (...args) => {
		let initiator = 'unknown place';
		try {
			throw new Error();
		} catch (e) {
			if (typeof e.stack === 'string') {
				let isFirst = true;
				for (const line of e.stack.split('\n')) {
					const matches = line.match(/^\s+at\s+(.*)/);
					if (matches) {
						if (!isFirst) {
							// first line - current function
							// second line - caller (what we are looking for)
							initiator = matches[1];
							break;
						}
						isFirst = false;
					}
				}
			}
		}
		const at = initiator.split(__dirname)[1];
		if (!at)
			originalMethod.apply(console, [...args]);
		else
			originalMethod.apply(console, [...args, `   - ${at}`]);
	};
});

module.exports = morgan('dev', morganConf);