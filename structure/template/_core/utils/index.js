exports.randomString = (length) => {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

exports.randomInt = (min, max) => Math.random() * (max - min) + min;

exports.zeroPad = (num, places) => String(num).padStart(places, '0');