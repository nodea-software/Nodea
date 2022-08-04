const dayjs = require('dayjs');

const randomString = function(length) {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 */+-,;:!ù=)àç_è-('<\"\\é&";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
exports.randomString = randomString;

function randomInt(min, max) {
	return Math.random() * (max - min) + min
}

exports.handleInput = function($el, input_type, app_type, type_param = null) {

	if(input_type == 'hidden')
		return;

	// HTML input color and radio take over app_type for cypress test
	if(input_type == 'color' || input_type == 'radio' || input_type == 'select2')
		app_type = input_type;

	const element = cy.wrap($el);

	switch(app_type) {
		case 'string':
		case 'password':
		case 'regular text':
			element.clear({force: true});
			return element.type(randomString(20), {
				force: true
			});
		case 'text':
			return element.invoke('summernote', 'insertText', randomString(20));
		case 'color':
			const random_color = Math.floor(Math.random() * 16777215).toString(16);
			return element.invoke('val', '#' + random_color).trigger('change', {
				force: true
			})
		case 'number':
			element.clear({force: true});
			return element.type(Math.floor(randomInt(-9999, 9999)), {
				force: true
			});
		case 'big number':
			element.clear({force: true});
			return element.type(Math.floor(randomInt(-9999999, 9999999)), {
				force: true
			});
		case 'decimal':
		case 'currency':
			element.clear({force: true});
			let decimal = randomInt(-9999, 9999);
			if(type_param)
				decimal = parseFloat(decimal.toFixed(type_param.split(',')[1]));
			return element.type(decimal);
		case 'date':
		case 'datetime':
			return element.wait(500).click({
				force: true
			}).wait(200).next('.bootstrap-datetimepicker-widget').find('td[data-action="selectDay"]').first().click();
		case 'time':
			element.click({
				force: true
			});
			return element.next('.bootstrap-datetimepicker-widget').should('be.visible');
		case 'boolean':
			return element.check({
				force: true
			}).should('be.checked');
		case 'email':
			element.clear({force: true});
			return element.type('test@test.com');
		case 'phone':
		case 'fax':
			element.clear({force: true});
			return element.type('0666666666');
		case 'qrcode':
		case 'url':
			element.clear({force: true});
			return element.type('https://nodea-software.com')
		case 'barcode':
			element.clear({force: true});
			return element.type('47581562');
		case 'file':
			return cy.get($el).attachFile('test.pdf');
		case 'picture':
			return cy.get($el).attachFile('test.png');
		case 'enum':
			const choice_length = $el.find('option').length;
			return element.select(Math.floor(randomInt(1, choice_length)), {
				force: true
			});
		case 'radio':
			return cy.get(`input[type="radio"][name="${$el.attr('name')}"]`).click({
				force: true,
				multiple: true
			});
		case 'relatedTo':
		case 'select2':
			element.invoke('select2', 'open');
			cy.document().its('body').find('li.select2-results__option:not(.loading-results)').should('have.length.gt', 0);
			return cy.document().its('body').find('li.select2-results__option:not(.loading-results)').last().click({
				force: true
			});
		case 'relatedToMultiple':
		case 'select2_multiple':
			element.invoke('on', 'select2:closing', e => {
				e.preventDefault();
			});
			element.invoke('select2', 'open');
			cy.document().its('body').find('li.select2-results__option:not(.loading-results)').should('have.length.gt', 0);
			return cy.document().its('body').find('ul.select2-results__options').then($results => {
				let multiple = false;
				if($results.find('li.select2-results__option[aria-selected="false"], li.select2-results__message').length > 1)
					multiple = true;
				$results.find('li.select2-results__option[aria-selected="false"], li.select2-results__message').click({
					force: true,
					multiple
				});
			})
		case 'address_component':
			element.find('#address_search_input').type('1 Rue Fernand Philippart');
			return cy.document().its('body').wait(500).find('ul.ui-autocomplete').find('li.ui-menu-item').first().click();
	}
}