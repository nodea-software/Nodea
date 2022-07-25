const { randomString } = require("../../../support/helpers");
const users = require('../../../fixtures/users');
const various = require('../../../fixtures/various');
const current_user = '__CURRENT_USER__';

describe('LOGIN', () => {

	it('[HAPPY] - LOGIN - GET', () => {
		cy.visit('/');
		cy.get('form').should('have.attr', 'action', '/login?r=').within(_ => {
			cy.get('input[name="login"]').should('have.attr', 'required');
			cy.get('input[name="password"]').should('have.attr', 'required');
			cy.get('button[type="submit"]');
		})
		cy.get('a:first').should('have.attr', 'href', '/reset_password');
		cy.get('a:eq(1)').should('have.attr', 'href', '/first_connection');
	})

	it.skip('[UNHAPPY - EMPTY] - LOGIN', () => {
		cy.visit('/login');
		// Form should not be submitted in this case
		cy.get('form').invoke('submit', (e) => {
			e.preventDefault()
			throw new Error("Form is submitting, it shouldn't.");
		});
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').clear().type('{enter}');
		cy.get('input[name="password"]').clear().type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').type(randomString(10)).type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').clear();
		cy.get('input[name="password"]').type(randomString(10)).type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="password"]').clear();
		cy.reload();
	})

	it.skip('[UNHAPPY - WRONG CRENDENTIALS] - LOGIN', () => {
		cy.visit('/login');
		cy.get('input[name="login"]').type(randomString(10));
		cy.get('input[name="password"]').type(randomString(10));
		cy.get('button[type="submit"]').click();
		cy.get('#error-box').should('be.visible');
	})

	it('[HAPPY] - FIRST CONNECTION - GET', () => {
		cy.visit('/first_connection');
		cy.get('form').should('have.attr', 'action', '/first_connection').within(_ => {
			cy.get('input[name="login"]').should('have.attr', 'required');
			cy.get('input[name="password"]').should('have.attr', 'required');
			cy.get('input[name="confirm_password"]').should('have.attr', 'required');
			cy.get('button[type="submit"]');
		})
	})

	it.skip('[UNHAPPY - EMPTY] - FIRST CONNECTION', () => {
		cy.visit('/first_connection');
		// Form should not be submitted in this case
		cy.get('form').invoke('submit', (e) => {
			e.preventDefault()
			throw new Error("Form is submitting, it shouldn't.");
		});
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').clear().type('{enter}');
		cy.get('input[name="password"]').clear().type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').type(randomString(10)).type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="login"]').clear();
		cy.get('input[name="password"]').type(randomString(10)).type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="password"]').clear();
		cy.get('input[name="confirm_password"]').type(randomString(10)).type('{enter}');
		cy.get('button[type="submit"]').click();
		cy.get('input[name="password"]').clear();
		cy.reload();
	})

	it.skip('[UNHAPPY - WRONG CRENDENTIALS] - FIRST CONNECTION', () => {
		cy.visit('/first_connection');
		cy.get('input[name="login"]').type(randomString(10));
		cy.get('input[name="password"]').type(randomString(10));
		cy.get('input[name="confirm_password"]').type(randomString(10));
		cy.get('button[type="submit"]').click();
		cy.get('#error-box').should('be.visible');
		cy.get('input[name="login"]').clear();
		cy.get('input[name="password"]').clear();
		cy.get('input[name="confirm_password"]').clear();
	})

	it.skip('[UNHAPPY - PASSWORD VALIDITY] - FIRST CONNECTION', () => {
		cy.visit('/first_connection');
		const user = current_user;
		// NO MATCHING
		cy.get('input[name="login"]').type(user);
		cy.get('input[name="password"]').type(randomString(10));
		cy.get('input[name="confirm_password"]').type(randomString(10));
		cy.get('button[type="submit"]').click();
		cy.get('#error-box').should('be.visible');
		cy.reload();
		// NO SECURITY
		cy.get('input[name="login"]').type(user);
		cy.get('input[name="password"]').type(various.invalid_pwd);
		cy.get('input[name="confirm_password"]').type(various.invalid_pwd);
		cy.get('button[type="submit"]').click();
		cy.get('#error-box').should('be.visible');
		cy.reload();
	})

	it('[HAPPY] - FIRST CONNECTION - POST', () => {
		cy.visit('/first_connection');
		cy.get('input[name="login"]').type(current_user);
		cy.get('input[name="password"]').type(various.valid_pwd);
		cy.get('input[name="confirm_password"]').type(various.valid_pwd);
		cy.get('button[type="submit"]').click();
		cy.location('pathname').then(pathname => {
			if(pathname != '/first_connection')
				cy.location('pathname').should('eq', '/module/home');
		})
	})

	it('[HAPPY] - LOGOUT - POST', () => {
		cy.visit('/logout')
		cy.location('pathname').should('eq', '/login');
	})

	it('[HAPPY] - LOGIN - POST', () => {
		cy.visit('/login');
		cy.get('input[name="login"]').type(current_user);
		cy.get('input[name="password"]').type(various.valid_pwd);
		cy.get('button[type="submit"]').click();
		cy.location('pathname').should('eq', '/module/home');
	})
})