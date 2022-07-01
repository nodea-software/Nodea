// ----------- Custom Dust Locals | Helper | Filters ----------- //

// Example:
// {@myHelper} for global helpers
// {#myHelper} for context helpers
// {variable|myFilter} for context filters

// See documentation: https://docs.nodea-software.com/en/developer/views#nodea-dustjs-helpers-locals-and-filters

// Add your custom Dust Locals | Helper | Filters here =>
module.exports = {
	// eslint-disable-next-line no-unused-vars
	locals: function(locals, req, language, access) {
		// Use example: {#logCurrentUser param="myParam"}{/logCurrentUser}
		locals.logCurrentUser = function(chunk, context, bodies, params) {
			console.log(params.param);
			console.log(req.user);
		}
		return locals;
	},
	helpers: function(dust) {
		// Use example: {@myDustHelper param="myParam"}{/myDustHelper}
		dust.helpers.myDustHelper = function(chunk, context, bodies, params) {
			console.log(params.param);
		}
		return dust;
	},
	// eslint-disable-next-line no-unused-vars
	filters: function(dust, lang) {
		// Use example: {myDate|convertToDateFormat}
		dust.filters.convertToDateFormat = function(value) {
			console.log('Converting date: ', value);
		}
		return dust;
	}
};