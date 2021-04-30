String.prototype.capitalizeFirstLetter = function () {
	const str = this;
	return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1);
}