const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_media_sms.json");
const relations = require("./options/e_media_sms.json");
const sms = require('@core/services/sms');
const moment = require('moment');

class E_media_sms extends CoreModel {
	constructor() {
		super('E_media_sms', 'e_media_sms', attributes, relations);
	}

	setInstanceMethods(sequelizeModel) {
		sequelizeModel.prototype.parseForInclude = this.parseForInclude;
		sequelizeModel.prototype.execute = this.execute;
	}

	parseForInclude() {
		const valuesForInclude = [];
		const regex = new RegExp(/{field\|([^}]*)}/g);let matches = null;
		while ((matches = regex.exec(this.f_message)) != null)
			valuesForInclude.push(matches[1]);

		const userRegex = new RegExp(/{(phone_field\|[^}]*)}/g);let match = null;
		while ((match = userRegex.exec(this.f_targets)) != null) {
			const placeholderParts = match[1].split('|');
			const fieldPath = placeholderParts[placeholderParts.length-1];
			valuesForInclude.push(fieldPath);
		}

		return valuesForInclude;
	}

	async execute(dataInstance) {
		const self = this;

		async function getGroupAndUserID() {
			const property = 'f_phone_numbers';
			let userIds = [];const phoneNumbers = [];

			// EXTRACT GROUP USERS
			// Placeholder ex: {group|Admin|1}
			{
				const groupIds = [];
				// Exctract all group IDs from property to find them all at once
				const groupRegex = new RegExp(/{(group\|[^}]*)}/g);let match = null;
				while ((match = groupRegex.exec(self[property])) != null) {
					const placeholderParts = match[1].split('|');
					const groupId = parseInt(placeholderParts[placeholderParts.length-1]);
					groupIds.push(groupId);
				}

				// Fetch all groups found and their users
				const groups = await self.sequelize.models.E_group.findAll({
					where: {id: {[self.sequelize.models.$in]: groupIds}},
					include: {model: self.sequelize.models.E_user, as: 'r_user'}
				});

				// Exctract email and build intermediateData object used to replace placeholders
				for (let i = 0; i < groups.length; i++)
					for (let j = 0; j < groups[i].r_user.length; j++) {
						// Push user contact phone field. This is defined in conf/application.json
						phoneNumbers.push(groups[i].r_user[j][globalConf.contact_field_for_sms]);
					}
			}

			// EXTRACT USERS
			// Placeholder ex: {user|Jeremy|4}
			{
				// Exctract all user IDs from property to find them all at once
				const userRegex = new RegExp(/{(user\|[^}]*)}/g);let match = null;
				while ((match = userRegex.exec(self[property])) != null) {
					const placeholderParts = match[1].split('|');
					const userId = parseInt(placeholderParts[placeholderParts.length-1]);
					userIds.push(userId);
				}
			}

			// EXTRACT PHONE NUMBERS FROM PHONE FIELD TARGETED THROUGH RELATION
			// Placeholder ex: {phone_field|Field Label|r_parent.f_phone}
			{
				function findAndPushUserPhone(object, path, depth = 0) { // eslint-disable-line
					if (depth < path.length-1 && (!path[depth] || !object[path[depth]]))
						return;
					if (depth < path.length - 1)
						return findAndPushUserPhone(object[path[depth]], path, ++depth);

					// path[depth] is the field with the type phone we're looking for
					const targetedEntity = object;
					if (targetedEntity instanceof Array)
						for (let i = 0; i < targetedEntity.length; i++)
							phoneNumbers.push(targetedEntity[i][path[depth]]);
					else
						phoneNumbers.push(targetedEntity[path[depth]])
				}

				const userRegex = new RegExp(/{(phone_field\|[^}]*)}/g);let match = null;
				while ((match = userRegex.exec(self[property])) != null) {
					const placeholderParts = match[1].split('|');
					const fieldPath = placeholderParts[placeholderParts.length-1];
					// Dive in dataInstance to find targeted field
					findAndPushUserPhone(dataInstance, fieldPath.split('.'));
				}
			}

			// Remove duplicate id from array
			userIds = userIds.filter((item, pos) => userIds.indexOf(item) == pos);

			// FETCH USERS
			// Push their contact phone field. This is defined in conf/application.json
			const users = await self.sequelize.models.E_user.findAll({where: {id: {[self.sequelize.models.$in]: userIds}}});
			for (let i = 0; i < users.length; i++)
				phoneNumbers.push(users[i][globalConf.contact_field_for_sms]);

			// Remove duplicate numbers and return
			return phoneNumbers.filter((item, pos) => phoneNumbers.indexOf(item) == pos)
		}

		function insertVariablesValue(property) {
			// Recursive function to dive into relations object until matching field or nothing is found
			function diveData(object, depths, idx) {
				if (!object[depths[idx]])
					return "";
				else if (typeof object[depths[idx]] === 'object') {
					if (object[depths[idx]] instanceof Date)
						return moment(object[depths[idx]]).format("DD/MM/YYYY");
					return diveData(object[depths[idx]], depths, ++idx);
				}
				return object[depths[idx]];
			}

			let newString = self[property];
			const regex = new RegExp(/{field\|([^}]*)}/g);let matches = null;
			while ((matches = regex.exec(self[property])) != null)
				newString = newString.replace(matches[0], diveData(dataInstance, matches[1].split('.'), 0));

			self[property] = newString || "";
			return self[property];
		}

		// Replace {group|id} and {user|id} placeholders before inserting variables
		// to avoid trying to replace placeholders as entity's fields
		const phoneNumbers = await getGroupAndUserID();
		insertVariablesValue('f_message');

		// Send sms
		await sms(phoneNumbers, self.f_message);
	}
}

module.exports = E_media_sms;
