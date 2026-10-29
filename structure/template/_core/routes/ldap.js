const fs = require("fs-extra");
const Route = require("@core/abstract_routes/route");
const models = require("@app/models");
const middlewares = require("@core/helpers/middlewares");
const ldapConfig = require("@config/ldap");
const { getLdapGroupsSettings, getGroups } = require("@core/utils/ldap");
const dust = require("dustjs-linkedin");
const { lang } = require("@config/application.json");
const language = require("@core/helpers/language");

class CoreLdap extends Route {
	constructor(additionalRoutes) {
		const routes = ["configuration", "saveSettings", "getGroupSettings"];
		super([...routes, ...additionalRoutes]);

		this.defaultMiddlewares = [
			middlewares.isLdap,
			middlewares.isLoggedIn,
			middlewares.entityAccess("access_settings"),
			middlewares.entityAccess("access_settings_group"),
			middlewares.actionAccess("access_settings_group", "update"),
			middlewares.entityAccess("access_settings_role"),
			middlewares.actionAccess("access_settings_group", "update"),
		];
	}

	configuration() {
		this.router.get("/configuration", ...this.middlewares.configuration, async (req, res) => {
			const { update_user_groups_on_login, give_access_to_all_groups } = getLdapGroupsSettings();
			const data = {
				update_user_groups_on_login,
				give_access_to_all_groups,
			};
			data.ldapGroups = await getGroups();
			res.render("ldap/configuration", data);
		});
	}

	saveSettings() {
		this.router.post("/save-settings", ...this.middlewares.saveSettings, async (req, res) => {
			let l = lang;
			if (req.session.lang_user) l = req.session.lang_user;
			const __ = language(l).__;

			try {
				const settings = getLdapGroupsSettings();
				const newSettings = req.body;
				const ldap_groups = newSettings.ldap_groups || [];
				const ldap_names = ldap_groups.map((x) => x.name);
				settings.ldap_groups?.forEach((g) => {
					if (!ldap_names.includes(g.name)) {
						ldap_groups.push(g);
					}
				});
				const updatedSettings = {
					...settings,
					...newSettings,
					ldap_groups,
				};
				await fs.writeFile(__dirname + "/../../config/ldap/ldap_groups_settings.json", JSON.stringify(updatedSettings, null, 4));

				res.status(200).json({
					success: true,
					message: __("component.ldap.success_save"),
				});
			} catch (error) {
				res.status(500).json({
					success: false,
					message: __("error.500.title"),
				});
			}
		});
	}

	getGroupSettings() {
		this.router.get("/get-group-settings", ...this.middlewares.getGroupSettings, async (req, res) => {
			const { group } = req.query;
			const attr = ldapConfig.accessAttribute;
			const settings = getLdapGroupsSettings();
			const groupSettings = settings.ldap_groups.find((e) => e.name === group) || {};
			const { app_groups, app_roles } = groupSettings;
			const [groups, roles] = await Promise.all([
				models.E_group.findAll({ attributes: [...new Set([attr, "f_label", "id"])], raw: true }),
				models.E_role.findAll({ attributes: [...new Set([attr, "f_label", "id"])], raw: true }),
			]);
			groups.forEach((group) => {
				if (app_groups?.some((e) => e[attr] === group[attr])) {
					group.checked = true;
				}
			});
			roles.forEach((role) => {
				if (app_roles?.some((e) => e[attr] === role[attr])) {
					role.checked = true;
				}
			});

			const data = {
				cn: group,
				groups,
				roles,
				access: groupSettings.access,
			};

			dust.insertLocalsFn(data, req);
			dust.renderSource(fs.readFileSync(__dirname + "/../../_core/views/ldap/configuration_fields.dust", "utf8"), data, function (err, html) {
				if (err) {
					res.status(500).end();
				}
				res.status(200).send({ html });
			});
		});
	}
}

module.exports = CoreLdap;
