const { E_user, E_role, E_group } = require("@app/models");

const isAdminUser = (user) => {
	const group = user.r_group || [];
	return group.some((g) => g.id === 1);
};

const getAccessibleGroupIds = async (userId) => {
	try {
		const user = await E_user.findByPk(userId, {
			attributes: ["id"],
			include: {
				model: E_group,
				as: "r_group",
				attributes: ["id"],
				include: { model: E_group, as: "r_group_accessible", attributes: ["id"] },
			},
		});
		const ids = new Set();
		const accessibleGroups = user.r_group.map((r) => r.r_group_accessible);
		for (const g of accessibleGroups.flat()) {
			ids.add(g.id);
		}
		return [...ids];
	} catch (err) {
		console.log(err);
		return [];
	}
};

const getAccessibleRoleIds = async (userId) => {
	try {
		const user = await E_user.findByPk(userId, {
			attributes: ["id"],
			include: {
				model: E_role,
				as: "r_role",
				attributes: ["id"],
				include: { model: E_role, as: "r_role_accessible", attributes: ["id"] },
			},
		});
		const ids = new Set();
		const accessibleRoles = user.r_role.map((r) => r.r_role_accessible);
		for (const g of accessibleRoles.flat()) {
			ids.add(g.id);
		}
		return [...ids];
	} catch (err) {
		console.log(err);
		return [];
	}
};

module.exports = {
	isAdminUser,
	getAccessibleGroupIds,
	getAccessibleRoleIds,
};
