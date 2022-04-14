module.exports = {
	frameguard: process.env.IS_GENERATOR != '1', // X-Frame-Options - Disable in studio to enable preview iframe
	contentSecurityPolicy: {
		useDefaults: false,
		directives: {
			"default-src": [
				"'self'",
				"'unsafe-eval'",
				"'unsafe-inline'",
				'data:',
				'blob:',
				'https://api-adresse.data.gouv.fr/search/'
			]
		}
	}
}