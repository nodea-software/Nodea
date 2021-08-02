const express = require('express');
const entity_helper = require('@core/helpers/entity');

async function routeSuccess(data) {
	const haveTransaction = data.transaction !== undefined;
	if (data.files && data.files.length) {
		const filePromises = [];
		for (const file of data.files)
			filePromises.push(file.func(file));
		// TODO: Delete succesfuly created files and call `res.error()` upon file creation error
		await Promise.all(filePromises);
	}

	if (haveTransaction && !data.transaction.finished)
		await data.transaction.commit();
}

async function routeError(data) {
	const haveTransaction = data.transaction !== undefined;
	if (haveTransaction && !data.transaction.finished)
		await data.transaction.rollback();
}

class Route {
	constructor(routes) {
		this.router = express.Router();
		this.registeredRoutes = routes;

		this.defaultMiddlewares = [];
	}

	get routes() {
		for (const route of this.registeredRoutes) {
			if (!this[route])
				console.warn(`WARN: ${route} route provided in additionalRoutes but no implementation found`)
			else
				this[route]();
		}

		return this.router;
	}

	async getHook(route, hook, data) {
		if(this.hooks && this.hooks[route] && this.hooks[route][hook])
			return await this.hooks[route][hook](data);
		return;
	}

	asyncRoute(routeFunc) {
		return async (req, res, ...args) => {
			const data = {
				req,
				res,
				transaction: undefined,
				files: []
			};
			let properRouteEnd = false;

			res.success = async successClbk => {
				properRouteEnd = true;
				try {
					await routeSuccess(data);
					await successClbk();
				} catch(err) {
					res.error(_ => entity_helper.error(err, req, res, req.referer, "e_" + req.originalUrl.split("/")[1]));
				}
			};
			res.error = async errorClbk => {
				properRouteEnd = true;
				try {
					await routeError(data);
					await errorClbk();
				} catch(err) {
					entity_helper.error(err, data.req, data.res, data.req.referer, "e_" + data.req.originalUrl.split("/")[1])
				}
			}

			try {
				await routeFunc(data, ...args);
				if (properRouteEnd === false)
					console.warn("WARN: Route ended without calling res.success or res.error. Potential transaction and/or files won't be handled.");
			} catch(err) {
				console.error(err);
				res.error(_ => entity_helper.error(err, req, res, req.referer, "e_" + req.originalUrl.split("/")[1]));
			}
		}
	}
}

module.exports = Route;
