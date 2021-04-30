// ----------- Custom Dust Locals | Helper | Filters ----------- //

// Example:
// {@myHelper} for global helpers
// {#myHelper} for context helpers

// TODO:
// See documentation for standard Nodea Dust utils => https://thebeautifuldoc

// Add your custom Dust Locals | Helper | Filters here =>
module.exports = {
	locals: function(locals, req, language, block_access) {
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
	filters: function(dust, lang) {
		// Use example: {myDate|convertToDateFormat}
		dust.filters.convertToDateFormat = function(value) {
			console.log('Converting date: ', value);
		}
		return dust;
	}
};