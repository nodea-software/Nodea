const mailConfig = require('../../config/mail');
const nodemailer = require('nodemailer');
const fs = require('fs');
const dust = require('dustjs-linkedin');
const transporter = nodemailer.createTransport(mailConfig.transport);
const templatePath = __dirname + '/../../app/mails/';

module.exports = (_ => {
	if(fs.existsSync(__dirname + '/../mailer.js'))
		// eslint-disable-next-line global-require
		return require(__dirname + '/../mailer.js');


	// Parameters :
	//	// The template file name (will be concatenated with `templatePath`)
	// 	- templateName: 'template' || 'template.dust';
	//
	// 	// The mail options
	//	- options: {
	// 		from: 'STRING',
	// 		to: 'STRING',
	// 		subject: 'STRING'
	//
	//		// The data object represente the mail's dust template parameters. Example:
	// 		data: {
	// 			name: 'Name',
	// 			href: '/validate'
	// 		}
	// 	}

	// Attachment Example :
	// - options.attachments = [{
	// 	  filename: 'logo.jpg',
	// 	  path: __dirname + '/../public/img/logo.jpg',
	// 	  cid: '-logo'
	// }];

	return {
		config: mailConfig,
		sendTemplate: (templateName, options, attachments) => new Promise((resolve, reject) => {
			templateName = templateName.substring(-5) != '.dust' ? templateName + '.dust' : templateName;
			// Read mail template
			fs.readFile(templatePath + templateName, 'utf8', (err, template) => {
				if (err)
					return reject(err);

				// Possibility to add {host} in media
				options.data.host = mailConfig.host;

				// Generate mail model, then render mail to html
				dust.renderSource(template, options.data, (err, rendered) => {
					if (err)
						return reject(err);

					options.html = rendered;

					if (attachments)
						options.attachments = attachments;

					// Send mail
					transporter.sendMail(options, (err, info) => {
						if (err)
							return reject(err);
						return resolve(info);
					});
				});
			});
		}),
		sendHtml: (html, options, attachments) => new Promise((resolve, reject) => {

			// Possibility to add {host} in media
			options.data.host = mailConfig.host;

			// Generate mail model, then render mail to html
			dust.renderSource(html, options.data, (err, rendered) => {
				options.html = rendered;

				if (attachments)
					options.attachments = attachments;

				// Send mail
				transporter.sendMail(options, (error, info) => {
					if (error)
						return reject(error);
					return resolve(info);
				});
			});
		})
	}
})();