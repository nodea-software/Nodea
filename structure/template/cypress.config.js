const {
	defineConfig
} = require("cypress");

module.exports = defineConfig({
	video: false,
	videosFolder: './upload_test/cypress/video',
	screenshotsFolder: './upload_test/cypress/screenshots',
	fixturesFolder: './app/tests/cypress/fixtures/',
	e2e: {
		baseUrl: 'http://127.0.0.1:1337',
		specPattern: './app/tests/cypress/e2e/**/**/*.cy.{js,jsx,ts,tsx}',
		supportFile: './app/tests/cypress/support/e2e.{js,jsx,ts,tsx}',
		experimentalSessionAndOrigin: true
	},
});
