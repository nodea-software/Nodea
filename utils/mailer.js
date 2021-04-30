const mailConfig = require('../config/mail');
const templatePath = __dirname + '/../mails/';

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport(mailConfig.transport);
const fs = require('fs');
const dust = require('dustjs-linkedin');

module.exports = {
	config: mailConfig,
	sendTemplate: (templateName, options, attachments) => new Promise((resolve, reject) => {
		templateName = templateName.substring(-5) != '.dust' ? templateName + '.dust' : templateName;
		// Read mail template
		const template = fs.readFileSync(templatePath + templateName, 'utf8');

		options.data.host = mailConfig.host;

		// Generate mail model, then render mail to html
		dust.renderSource(template, options.data, (err, rendered) => {
			if (err)
				return reject(err);

			options.html = rendered;

			if(!options.from)
				options.from = mailConfig.from;

			if (attachments)
				options.attachments = attachments;

			// Send mail
			transporter.sendMail(options, (err, info) => {
				if (err)
					return reject(err);
				return resolve(info);
			});
		});
	})
}