const fs = require('fs-extra');
const path = require('path');
const basename = path.basename(module.filename);

const helpers = {};

fs.readdirSync(__corePath + '/helpers')
	.filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
	.forEach(file => {
		// eslint-disable-next-line global-require
		helpers[file.replace('.js', '')] = require('@core/helpers/' + file);
	});

module.exports = (_ => {
	return {...helpers};
})();