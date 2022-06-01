module.exports = {
	moduleNameMapper: {
		"^@app(.*)$": "<rootDir>/app/$1",
		"^@config(.*)$": "<rootDir>/config/$1",
		"^@core(.*)$": "<rootDir>/_core/$1"
	},
	globals: {
		'__configPath': __dirname + '/config',
		'__corePath': __dirname + '/_core',
		'__appPath': __dirname + '/app',
		"__jestUser": {
			id: 1,
			f_login: "JestTests",
			r_group: [{
				"f_label": "admin"
			}],
			r_role: [{
				"f_label": "admin"
			}]
		}
	},
	globalSetup: './jest.setup',
	setupFilesAfterEnv: ["jest-extended"]
}