const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_media_task.json");
const relations = require("./options/e_media_task.json");
const moment = require('moment');
const fs = require('fs-extra');

function status_helper() {
	if (!this.status_helper)
		// eslint-disable-next-line global-require
		this.status_helper = require('@core/helpers/status');
	return this.status_helper;
}

class E_media_task extends CoreModel {
	constructor() {
		super('E_media_task', 'e_media_task', attributes, relations);
	}

	setInstanceMethods(sequelizeModel) {
		sequelizeModel.prototype.parseForInclude = this.parseForInclude;
		sequelizeModel.prototype.execute = this.execute;
	}

	parseForInclude() {
		const fieldsToParse = ['f_task_name'];
		const valuesForInclude = [];
		for (let i = 0; i < fieldsToParse.length; i++) {
			const regex = new RegExp(/{field\|([^}]*)}/g);let matches = null;
			while ((matches = regex.exec(this[fieldsToParse[i]])) != null)
				valuesForInclude.push(matches[1]);
		}
		return valuesForInclude;
	}

	async execute(dataInstance) {
		const self = this;

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

		const task = await self.sequelize.models.Task.create({
			f_title: insertVariablesValue('f_task_name'),
			f_type: self.f_task_type,
			f_data_flow: insertVariablesValue('f_data_flow'),
			fk_id_process_process: self.fk_id_process_process
		})
		const taskAttributes = JSON.parse(fs.readFileSync(__dirname+'/attributes/e_task.json'));
		await status_helper().setInitialStatus(task, 'e_task', taskAttributes, {user: {id: 1}}) // eslint-disable-line
	}
}

module.exports = E_media_task;
