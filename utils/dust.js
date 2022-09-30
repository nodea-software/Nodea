const moment = require("moment");

// ----------- Helper DUST ----------- //
// Example:
// {@myHelper} for global helpers
// {#myHelper} for context helpers (such as authentication access)

module.exports = {
	locals: function(locals, req, language) {

		// Translate functions
		locals.__ = function(ch, con, bo, params) {
			return ch.write(language.__(params.key, params.params).replace(/'/g, "&apos;"));
		}

		locals.M_ = function(ch, con, bo, params) {
			return ch.write(language.M_(params.key, params.params).replace(/'/g, "&apos;"));
		}

		locals.isAdmin = () => {
			if(req.isAuthenticated() && req.session.passport && req.session.passport.user.id_role == 1)
				return true;
			return false;
		};
	},
	helpers: function(dust) {
		dust.helpers.ifTrue = function(chunk, context, bodies, params) {
			const value = params.key;
			if (value == true || value == "true" || value == 1)
				return true;
			return false;
		}
		dust.helpers.ifFalse = function(chunk, context, bodies, params) {
			const value = params.key;
			if (!value || value === false || value === "false" || value == 0)
				return true;
			return false;
		}
		dust.helpers.inArray = function(chunk, context, bodies, params) {
			const value = params.value;
			const field = params.field;
			const array = params.array;

			for (let i = 0; i < array.length; i++) {
				if (array[i][field] == value)
					return true
			}
			return false;
		}
		dust.helpers.in = function(chunk, context, bodies, params) {
			const value = params.value || params.key;
			let array = params.array || params.values;
			array = array.split(',');

			// Avoid indexOf for datatype mismatch due to dust
			if (array.filter(x => x == value).length != 0)
				return true;
			return false;
		}
		dust.helpers.notIn = function(chunk, context, bodies, params) {
			const value = params.value || params.key;
			let array = params.array || params.values;
			array = array.split(',');

			// Avoid indexOf for datatype mismatch due to dust
			if (array.filter(x => x == value).length == 0)
				return true;
			return false;
		}
	},
	filters: function(dust, lang) {
		// ----------- Filter DUST ----------- //
		// Example {myDate|convertToDateFormat}

		dust.filters.date = function(value) {
			if (!value || value == '')
				return value;

			if (lang == "fr-FR")
				return moment.utc(value).format("DD/MM/YYYY");

			return moment.utc(value).format("YYYY-MM-DD");
		};

		dust.filters.datetime = function(value) {
			if (!value || value == '')
				return value;

			if (lang == "fr-FR")
				return moment.utc(value).format("DD/MM/YYYY HH:mm");

			return moment.utc(value).format("YYYY-MM-DD HH:mm");
		};

		dust.filters.time = function(value) {
			if (value != "") {
				if (value.length == 8)
					return value.substring(0, value.length - 3);
			}
			return value;
		};

		dust.filters.filename = function(value) {

			if(typeof value !== 'string')
				return value;

			// Remove datetime part from filename display
			if (moment(value.substring(0, 16), 'YYYYMMDD-HHmmss_').isValid() && value != "" && value.length > 16)
				value = value.substring(16);

			// Remove uuid
			if(value[32] == '_')
				value = value.substring(33);

			return value;
		};

		// Fix for IE11, encode filename values for query value like "/download/{my_filename}"
		dust.filters.urlencode = function(value) {
			return encodeURIComponent(value);
		};

		dust.filters.stringify = value => JSON.stringify(value);
	}
};