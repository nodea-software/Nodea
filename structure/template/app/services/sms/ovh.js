const smsConf = require('@config/sms');
const ovh = require('ovh');

let ovhInstance = null;
module.exports = async (phones, text) => {
	try {
		if (!ovhInstance)
			ovhInstance = ovh(smsConf);

		// Get the serviceName (name of your sms account)
		const serviceName = await ovhInstance.requestPromised('GET', '/sms');

		// Format phone number to match ovh api
		for (let i = 0; i < phones.length; i++)
			phones[i] = '0033' + phones[i].split(' ').join('').substring(1);

		// Send a simple SMS with a short number using your serviceName
		// https://eu.api.ovh.com/console/#/sms/
		const result = await ovhInstance.requestPromised('POST', '/sms/' + serviceName + '/jobs', {
			message: text,
			sender: smsConf.sender,
			senderForResponse: false,
			receivers: phones
		});

		if (result.invalidReceivers.length)
			throw new Error('Error SMS');

		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
};
