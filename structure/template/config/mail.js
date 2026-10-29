const globalConf = require("./global");

const mailConf = {
	develop: {
		transport: {
			host: "mail",
			port: 465,
			secure: true,
			auth: {
				user: "",
				pass: "",
			},
		},
		from: "Nodea App <no-reply@nodea-software.com>",
		url: {
			host: "http://127.0.0.1:" + globalConf.port,
		},
		subject: {
			mail_reset: "NODEA - Réinitialisation de mot de passe",
			mail_first: "NODEA - Inscription",
		},
	},
	test: {
		transport: {
			host: "mail",
			port: 465,
			secure: true,
			auth: {
				user: "",
				pass: "",
			},
		},
		from: "Nodea App <no-reply@nodea-software.com>",
		url: {
			host: "http://127.0.0.1:" + globalConf.port,
		},
		subject: {
			mail_reset: "NODEA - Réinitialisation de mot de passe",
			mail_first: "NODEA - Inscription",
		},
	},
	production: {
		transport: {
			host: "mail",
			port: 465,
			secure: true,
			auth: {
				user: "",
				pass: "",
			},
		},
		from: "Nodea App <no-reply@nodea-software.com>",
		url: {
			host: "http://127.0.0.1:" + globalConf.port,
		},
		subject: {
			mail_reset: "NODEA - Réinitialisation de mot de passe",
			mail_first: "NODEA - Inscription",
		},
	},
	studio: {
		transport: {
			host: "mail",
			port: 465,
			secure: true,
			auth: {
				user: "",
				pass: "",
			},
		},
		from: "Nodea App <no-reply@nodea-software.com>",
		url: {
			host: "http://127.0.0.1:" + globalConf.port,
		},
		subject: {
			mail_reset: "NODEA - Réinitialisation de mot de passe",
			mail_first: "NODEA - Inscription",
		},
	},
	cloud: {
		transport: {
			host: "mail",
			port: 465,
			secure: true,
			auth: {
				user: "",
				pass: "",
			},
		},
		from: "Nodea App <no-reply@nodea-software.com>",
		url: {
			host: "http://127.0.0.1:" + globalConf.port,
		},
		subject: {
			mail_reset: "NODEA - Réinitialisation de mot de passe",
			mail_first: "NODEA - Inscription",
		},
	},
};

module.exports = mailConf[globalConf.env];
