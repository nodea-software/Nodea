module.exports = function(attribute) { // eslint-disable-line
	/** Define attributes validation here
	 * Any validator defined here will have priority over existing validator defined in `@core/models/validators`
	 * Expected return value :
	 * [{
	 * 	types: ['nodeaType', ...],
	 *	validator: value => {} // Can be either a custom function or a sequelize validator (see https://sequelize.org/master/manual/validations-and-constraints.html#validators)
	 * }]
	 */
	return [];
}