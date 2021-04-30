const smsConf = require('../../config/sms');
const ovh = require('ovh');
const fs = require('fs-extra');

// Todo: Intégrer Orange SMS et faire le choix dans config/sms.js
// Présenter le fichier sous forme d'utils

let ovhInstance = null;

module.exports = (_ => {
	if(fs.existsSync(__dirname + '/../sms.js'))
		// eslint-disable-next-line global-require
		return require(__dirname + '/../sms.js');

	return (phones, text) => new Promise((resolve, reject) => {
		if (!ovhInstance)
			ovhInstance = ovh(smsConf);

		// Get the serviceName (name of your sms account)
		ovh.request('GET', '/sms', (err, serviceName) => {
			if (err)
				return reject(err);

			try {
				// Format phone number to match ovh api
				for (let i = 0; i < phones.length; i++)
					phones[i] = '0033' + phones[i].split(' ').join('').substring(1);

			} catch (e) {
				return reject('Pas de numéro de téléphone.');
			}

			// Send a simple SMS with a short number using your serviceName
			ovh.request('POST', '/sms/' + serviceName + '/jobs', {
				message: text,
				senderForResponse: true,
				receivers: phones
			}, (errsend, result) => {
				if (errsend || result.invalidReceivers.length)
					return reject({
						err: errsend,
						result: result
					});
				resolve(result);
			});
		});
	});
})()