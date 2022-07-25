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

const zeroPad = (num, places) => String(num).padStart(places, '0');

function generateValueByType(type, type_param = null) {
	switch (type.toLowerCase()) {
		case 'string':
		case 'text':
		case 'regular text':
		case 'password':
			return randomString(100);
		case 'number':
			return Math.floor(randomInt(-9999, 9999));
		case 'big number':
			return Math.floor(randomInt(-9999999, 9999999));
		case 'decimal':
		case 'currency':
			// eslint-disable-next-line no-case-declarations
			let value = randomInt(-9999, 9999);
			if(type_param)
				value = parseFloat(value.toFixed(type_param.split(',')[1]));
			return value;
		case 'date':
			return dayjs().format('DD/MM/YYYY');
		case 'datetime':
			return dayjs().format('DD/MM/YYYY HH:mm:ss');
		case 'time':
			return ' ';
		case 'color':
			return '#FFF';
		case 'boolean':
			return true;
		case 'email':
			return 'test@test.com';
		case 'phone':
		case 'fax':
			return '0666666666';
		case 'qrcode':
		case 'url':
			return 'https://nodea-software.com'
		case 'barcode':
			return '12345678';
		case 'enum':
			return randomString(100);
		case 'file':
		case 'picture':
			return null;
		case 'virtual':
			return undefined;
		default:
			console.log('UNKNOWN TYPE: ' + type);
			return randomString(100);
	}
}

exports.handleInput = function($el, input_type, app_type, type_param = null) {

	// HTML input color and radio take over app_type for cypress test
	if(input_type == 'color' || input_type == 'radio')
		app_type = input_type;

	const element = cy.wrap($el);
	switch(app_type) {
		case 'string':
		case 'password':
		case 'regular text':
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
			return element.type(Math.floor(randomInt(-9999, 9999)), {
				force: true
			});
		case 'big number':
			return element.type(Math.floor(randomInt(-9999999, 9999999)), {
				force: true
			});
		case 'decimal':
		case 'currency':
			let decimal = randomInt(-9999, 9999);
			if(type_param)
				decimal = parseFloat(decimal.toFixed(type_param.split(',')[1]));
			return element.type(decimal);
		case 'date':
		case 'datetime':
			return element.wait(500).click({
				force: true,
				timeout: 50000
			}).next('.bootstrap-datetimepicker-widget').find('td[data-action="selectDay"]').first().click();
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
			return element.type('test@test.com');
		case 'phone':
		case 'fax':
			return element.type('0666666666');
		case 'qrcode':
		case 'url':
			return element.type('https://nodea-software.com')
		case 'barcode':
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
			element.invoke('select2', 'open');
			cy.document().its('body').find('li.select2-results__option:not(.loading-results)').should('have.length.gt', 0);
			return cy.document().its('body').find('li.select2-results__option:not(.loading-results)').last().click();
		case 'relatedToMultiple':
			element.invoke('on', 'select2:closing', e => {
				e.preventDefault();
			});
			element.invoke('select2', 'open');
			cy.document().its('body').find('li.select2-results__option:not(.loading-results)').should('have.length.gt', 0);
			return cy.document().its('body').find('ul.select2-results__options').find('li.select2-results__option[aria-selected="false"], li.select2-results__message').click({
				multiple: true
			});
		case 'address_component':
			element.find('#address_search_input').type('1 Rue Fernand Philippart');
			return cy.document().its('body').find('ul.ui-autocomplete').find('li.ui-menu-item').first().click();
	}
}