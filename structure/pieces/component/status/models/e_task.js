const CoreModel = require('@core/models/model');
const attributes = require("./attributes/e_task.json");
const relations = require("./options/e_task.json");

function models() {
	if (!this.models)
		// eslint-disable-next-line global-require
		this.models = require('./');
	return this.models;
}

class E_task extends CoreModel {
	constructor() {
		super('E_task', 'e_task', attributes, relations);

		this.addRobotHook();
	}

	addRobotHook() {
		this.hooks.beforeCreate.push({
			name: 'attachToRobot',
			func: async (model) => {
				const result = await models().sequelize.query("\
					SELECT\
						`E_robot`.`id` as `robot`,\
						count(`E_task`.`id`) as `nb_pending_task`\
					FROM\
						`e_robot` as `E_robot`\
					LEFT JOIN\
						`e_task` as `E_task`\
						ON\
						`E_task`.`fk_id_robot_robot` = `E_robot`.`id`\
						AND\
						`f_type`='automatic'\
					LEFT JOIN\
						`e_status` as `r_state`\
						ON\
						`E_task`.`fk_id_status_state` = `r_state`.`id`\
						AND\
						`r_state`.`f_name` = 'pending'\
					WHERE\
						`E_robot`.`f_current_status` = 'connected'\
					GROUP BY\
						`E_robot`.`id`\
					ORDER BY\
						`nb_pending_task` ASC\
				", {type: models().sequelize.QueryTypes.SELECT});
				if (result)
					model.fk_id_robot_robot = result.robot;
				return model;
			}
		})
	}
}

module.exports = E_task;