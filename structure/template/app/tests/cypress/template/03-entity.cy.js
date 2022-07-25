const various = require('../../../fixtures/various');
const entity_fixtures = require('../../../fixtures/entity')['__CURRENT_ENTITY__'];
const attributes = require('../../../../../models/attributes/__CURRENT_ENTITY__');
const relations = require('../../../../../models/options/__CURRENT_ENTITY__');
const current_user = '__CURRENT_USER__';
const current_entity = '__CURRENT_ENTITY__';
const current_url_entity = current_entity.substring(2);

// Test structure based on default entity behavior
describe('ENTITY __CURRENT_ENTITY__', () => {

	beforeEach(() => {
		cy.login(current_user, various.valid_pwd);
	})

	it('[HAPPY] - CREATE_FORM - GET', () => {
		const exist = entity_fixtures.find(x => x.method && x.method.toLowerCase() == 'get' && x.path && x.path.toLowerCase() == '/create_form');
		if(!exist){
			cy.log('MISSING ENTITY ROUTE: CREATE_FORM');
			return;
		}

		cy.visit(`/${current_url_entity}/create_form`);

		cy.url().then(url => {
			if(!url.includes(`/${current_url_entity}/create_form`))
				cy.request(url).its('status').should('eq', 200);
			else {
				cy.fillForm(`form[action="/${current_url_entity}/create"]`, attributes, relations);
				cy.get(`form[action="/${current_url_entity}/create"]`).submit();
				cy.url().then(url => {
					cy.request(url).its('status').should('eq', 200);
				});
			}
		})
	})
})