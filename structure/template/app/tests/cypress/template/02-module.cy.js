const various = require('../../../fixtures/various');
const current_user = '__CURRENT_USER__';

describe('MODULES', () => {

	beforeEach(() => {
		cy.login(current_user, various.valid_pwd);
	})

	it('[HAPPY] - A HREF - GET', () => {
		cy.visit('/module/home');
		cy.get('#module-select option').each(($el, index, $list) => {
			cy.visit($el.attr('value'));
			cy.get('.sidebar');
			cy.get('.main-header');
			cy.get('a').each(($el, index, $list) => {
				const href = $el.attr('href');
				if(!href.includes('/logout')) {
					cy.wrap($el).invoke('css', 'background', 'green');
					cy.request(href).its('status').should('eq', 200);
				}
			})
		})
	})
})