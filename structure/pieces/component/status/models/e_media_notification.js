const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_media_notification.json");
const relations = require("./options/e_media_notification.json");
const moment = require('moment');

function socket() {
	if (!this.socket)
		this.socket = require('@core/services/socket')() // eslint-disable-line
	return this.socket;
}

class E_media_notification extends CoreModel {
	constructor() {
		super('E_media_notification', 'e_media_notification', attributes, relations);
	}

	setInstanceMethods(sequelizeModel) {
		sequelizeModel.prototype.parseForInclude = this.parseForInclude;
		sequelizeModel.prototype.execute = this.execute;
	}

	parseForInclude() {
		const fieldsToParse = ['f_title', 'f_description'];
		const valuesForInclude = [];
		for (let i = 0; i < fieldsToParse.length; i++) {
			const regex = new RegExp(/{field\|([^}]*)}/g);let matches = null;
			while ((matches = regex.exec(this[fieldsToParse[i]])) != null)
				valuesForInclude.push(matches[1]);
		}

		const regex = new RegExp(/{(user_target\|[^}]*)}/g);let matches = null;
		while ((matches = regex.exec(this.f_targets)) != null) {
			const placeholderParts = matches[1].split('|');
			const userFieldPath = placeholderParts[placeholderParts.length-1];
			valuesForInclude.push(userFieldPath+'.id');
		}
		return valuesForInclude;
	}

	async execute(dataInstance) {
		const self = this;
		async function getGroupAndUserID() {
			const property = 'f_targets';
			let userIds = [];

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
					where: {id: groupIds},
					include: {model: self.sequelize.models.E_user, as: 'r_user'}
				});

				// Exctract email and build intermediateData object used to replace placeholders
				for (let i = 0; i < groups.length; i++) {
					for (let j = 0; j < groups[i].r_user.length; j++)
						userIds.push(groups[i].r_user[j].id);
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

			// EXTRACT USER TARGETED THROUGH RELATION
			// Placeholder ex: {user_target|Enfant|r_parent.r_enfant}
			{
				function findAndPushUser(object, path, depth = 0) { // eslint-disable-line
					if (depth < path.length && (!path[depth] || !object[path[depth]]))
						return;
					if (depth < path.length)
						return findAndPushUser(object[path[depth]], path, ++depth);

					const targetedUser = object;
					if (targetedUser instanceof Array)
						for (let i = 0; i < targetedUser.length; i++)
							userIds.push(targetedUser[i].id);
					else
						userIds.push(targetedUser.id)
				}

				const userRegex = new RegExp(/{(user_target\|[^}]*)}/g);let match = null;
				while ((match = userRegex.exec(self[property])) != null) {
					const placeholderParts = match[1].split('|');
					const userFieldPath = placeholderParts[placeholderParts.length-1];
					// Dive in dataInstance to find targeted user
					findAndPushUser(dataInstance, userFieldPath.split('.'));
				}
			}
			// Remove duplicate id from array
			userIds = userIds.filter((item, pos) => userIds.indexOf(item) == pos);

			return userIds;
		}

		function insertVariablesValue(property) {
			function diveData(object, depths, idx) {
				if (!object[depths[idx]])
					return "";
				else if (typeof object[depths[idx]] === 'object') {
					if (object[depths[idx]] instanceof Date)
						return moment(object[depths[idx]]).format("DD/MM/YYYY");
					// Case where targeted field is in an array.
					// Ex: r_projet.r_participants.f_name <- Loop through r_participants and join all f_name
					else if (object[depths[idx]] instanceof Array && depths.length-2 == idx) {
						const values = [];
						for (let i = 0; i < object[depths[idx]].length; i++)
							if (typeof object[depths[idx]][i][depths[idx+1]] !== 'undefined')
								values.push(object[depths[idx]][i][depths[idx+1]]);
						return values.join(' ');
					}
					return diveData(object[depths[idx]], depths, ++idx);
				} return object[depths[idx]];
			}

			let newString = self[property];
			const regex = new RegExp(/{field\|([^}]*)}/g);let matches = null;
			while ((matches = regex.exec(self[property])) != null)
				newString = newString.replace(matches[0], diveData(dataInstance, matches[1].split('.'), 0));

			return newString || "";
		}

		const targetIds = await getGroupAndUserID();
		let entityUrl;
		try {
			const notifEntityTarget = dataInstance.constructor.getTableName().substring(2);
			entityUrl = `/${notifEntityTarget}/show?id=${dataInstance.id}`
		} catch(e) {
			console.warn(e);
			// Will redirect to current page
			entityUrl = '#';
		}
		const notificationObj = {
			f_color: self.f_color,
			f_icon: insertVariablesValue('f_icon'),
			f_title: insertVariablesValue('f_title'),
			f_description: insertVariablesValue('f_description'),
			f_url: entityUrl
		};

		try {
			const notification = await this.sequelize.models.E_notification.create(notificationObj, {user: false});
			await notification.setR_user(targetIds, {user: false});
			socket().sendNotification(notification, targetIds);
		} catch(err) {
			console.error(`Failed to send notification in E_media_notification.execute()`);
			console.error(err);
		}
	}
}

module.exports = E_media_notification;
