const dayjs = require('dayjs');
const models = require('../../models');
const bot = require('../../helpers/bot');

module.exports = async () => {
	try {
		const applications = await models.Application.findAll({
			include: {
				model: models.User,
				as: 'users'
			}
		});
		const now = dayjs();
		const app_to_delete = applications.filter(x => now.diff(x.createdAt, 'minutes') >= 7);
		const promises = [];
		for (let i = 0; i < app_to_delete.length; i++){
			promises.push((async () => {
				const {__} = require("../../services/language")('fr-FR'); // eslint-disable-line
				await bot.execute({
					session: {
						passport: {
							user: {
								id: app_to_delete[i].users[0].id
							}
						}
					}
				}, "delete application " + app_to_delete[i].displayName, __);
				await app_to_delete[i].destroy();
			})());
		}

		await Promise.all(promises);
	} catch (err) {
		console.error(err);
	}
}