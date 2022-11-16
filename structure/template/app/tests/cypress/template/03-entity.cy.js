const various = require('../../../fixtures/various');
const entity_fixtures = require('../../../fixtures/entity')['__CURRENT_ENTITY__'];
const attributes = require('../../../../../models/attributes/__CURRENT_ENTITY__');
const relations = require('../../../../../models/options/__CURRENT_ENTITY__');
const current_user = '__CURRENT_USER__';
const current_entity = '__CURRENT_ENTITY__';
const current_url_entity = current_entity.substring(2);
let usable_id;

// Test structure based on default entity behavior
describe('ENTITY __CURRENT_ENTITY__', () => {

	beforeEach(() => {
		cy.login(current_user, various.valid_pwd);
	})

	it('[HAPPY] - CREATE', () => {
		const exist = entity_fixtures.find(x => x.method && x.method.toLowerCase() == 'get' && x.path && x.path.toLowerCase() == '/create_form');
		if(!exist){
			cy.log('MISSING ENTITY ROUTE: CREATE_FORM');
			return;
		}

		cy.visit(`/${current_url_entity}/create_form`);

		cy.url().then(url => {
			if(!url.includes(`/${current_url_entity}/create_form`))
				return cy.request(url).its('status').should('eq', 200);

			cy.fillForm(`form[action="/${current_url_entity}/create"], form[action]`, attributes, relations);
			cy.get(`form[action="/${current_url_entity}/create"], form[action]`).submit();
			cy.url().then(url => {
				if(url.includes(`/${current_url_entity}/`) && url.includes('id='))
					usable_id = url.split('id=')[1].split('&')[0];
				cy.request(url).its('status').should('eq', 200);
			});
		})
	})

	it('[HAPPY] - LIST', () => {
		const exist = entity_fixtures.find(x => x.method && x.method.toLowerCase() == 'get' && x.path && x.path.toLowerCase() == '/list');
		if(!exist){
			cy.log('MISSING ENTITY ROUTE: LIST');
			return;
		}

		cy.visit(`/${current_url_entity}/list`);

		cy.get('.dataTables_wrapper').within(_ => {
			cy.get('.dataTable').then($table => {
				if($table.find('.btn-show.ajax').length > 0) {
					// Look for usable ID for next tests
					cy.get('.btn-show.ajax').first().then($btn => {
						const href = $btn.attr('href');
						cy.log(href);
						if(href.includes(current_url_entity) && href.includes('id='))
							usable_id = href.split('id=')[1].split('&')[0];
					})
				}
			})
		})

		cy.testDatatable('.dataTables_wrapper');
	})

	it('[HAPPY] - SHOW', () => {
		const exist = entity_fixtures.find(x => x.method && x.method.toLowerCase() == 'get' && x.path && x.path.toLowerCase() == '/show');
		if(!exist){
			cy.log('MISSING ENTITY ROUTE: SHOW');
			return;
		}

		if(!usable_id) {
			cy.log('NO USABLE ID');
			return;
		}

		cy.visit(`/${current_url_entity}/show?id=${usable_id}`);

		cy.url().then(url => {
			if(!url.includes(`/${current_url_entity}/show`))
				return cy.request(url).its('status').should('eq', 200);

			cy.get('.card').find('.card-body').then($body => {
				if($body.find('#tabs').length > 0) {
					cy.get('.card').find('.card-body').within(_ => {
						cy.get('li.nav-item a').each(($el, index, $list) => {
							const tab_id = $el.attr('href');
							const tab_type = $el.attr('data-tabtype');
							cy.get(`${tab_id}.tab-pane`).then(tab => {
								const asso_alias = tab.attr('data-asso-alias');
								if(!asso_alias)
									return;
								const tab_relation = relations.find(x => x.as == asso_alias);
								const assoc_attributes = require('../../../../../models/attributes/' + tab_relation.target);
								const assoc_relations = require('../../../../../models/options/' + tab_relation.target);
								cy.wrap($el).wait(500).click();
								switch(tab_type) {
									case 'hasOne':
										cy.handleHasOneTab(tab, tab_relation, assoc_attributes, assoc_relations);
										break;
									case 'hasMany':
										cy.handleHasManyTab(tab, tab_relation, assoc_attributes, assoc_relations);
										break;
								}
							})
						})
					})
				}
			})
		})
	})

	it('[HAPPY] - UPDATE', () => {
		const exist = entity_fixtures.find(x => x.method && x.method.toLowerCase() == 'get' && x.path && x.path.toLowerCase() == '/update_form');
		if(!exist){
			cy.log('MISSING ENTITY ROUTE: UPDATE_FORM');
			return;
		}

		if(!usable_id) {
			cy.log('NO USABLE ID');
			return;
		}

		cy.visit(`/${current_url_entity}/update_form?id=${usable_id}`);

		cy.url().then(url => {
			if(!url.includes(`/${current_url_entity}/update_form`))
				return cy.request(url).its('status').should('eq', 200);

			cy.fillForm(`form[action="/${current_url_entity}/update"], form[action]`, attributes, relations);
			cy.get(`form[action="/${current_url_entity}/update"], form[action]`).submit();
			cy.url().then(url => {
				cy.request(url).its('status').should('eq', 200);
			});
		})
	})
})