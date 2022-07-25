// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import 'cypress-file-upload';
require('./commands');
require('./helpers');


let warn_spy, error_spy;
Cypress.on('window:before:load', (win) => {
	warn_spy = cy.spy(win.console, 'warn');
	error_spy = cy.spy(win.console, 'error');
});

// Throw an error if console.error is called
afterEach(() => {
	cy.window().then((win) => {
		if(error_spy)
			expect(error_spy).not.to.be.called;
	});
});

after(() => {
	Cypress.session.clearAllSavedSessions()
});