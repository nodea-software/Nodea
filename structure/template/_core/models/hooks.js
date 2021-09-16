module.exports = {
	insertCreatedBy: {
		// Hook is expecting a user to set createdBy
		// If user equals false, warning is disabled
		type: 'beforeCreate',
		func: async (model, args) => {
			try {
				// No user
				if(args.user === undefined || args.user === null)
					throw 'No user provided for createdBy on table -> ' + model.constructor.tableName;

				// Disabled
				if (args.user === false)
					return;

				// No login
				if (!args.user.f_login)
					throw 'Couldn\'t get user login for createdBy on table -> ' + model.constructor.tableName;

				model.createdBy = args.user.f_login;
			} catch (errMsg) {
				console.log('WARN '+errMsg);
			}
		}
	},
	insertUpdatedBy: {
		// Hook is expecting a user to set updatedBy
		// If user equals false, warning is disabled
		type: 'beforeUpdate',
		func: async (model, args) => {
			try {
				// No user
				if(args.user === undefined || args.user === null)
					throw 'No user provided for updatedBy on table -> ' + model.constructor.tableName;

				// Disabled
				if (args.user === false)
					return;

				// No login
				if (!args.user.f_login)
					throw 'Couldn\'t get user login for updatedBy on table -> ' + model.constructor.tableName;

				model.updatedBy = args.user.f_login;
			} catch (errMsg) {
				console.log('WARN '+errMsg);
			}
		}
	}
}
