const Route = require('@core/abstract_routes/route');

class Tracking extends Route {
	/**
	 * @constructor
	 * @param {string} e_entity - The name of the entity.
	 * @param {object} attributes - The models attributes of the entity.
	 * @param {array} options - The models options of the entity.
	 * @param {object} helpers - Helpers modules found in `/_core/helpers`.
	 * @param {array} [additionalRoutes] - Additional routes implemented in E_traceability child class.
	 */

	constructor(e_entity, attributes, options, helpers) {
		const registeredRoutes = [
			'list',
			'datalist'
		];
		super(registeredRoutes);

		this.entity = e_entity.substring(2);
		this.e_entity = e_entity;
		this.E_entity = e_entity.capitalizeFirstLetter();

		this.attributes = attributes;
		this.options = options;
		this.helpers = helpers;

		this.fileFields = [];
		for (const fieldName in this.attributes) {
			const field = this.attributes[fieldName];
			if (['file', 'picture'].includes(field.nodeaType))
				this.fileFields.push({
					name: fieldName,
					maxCount: field.maxCount || 1
				});
		}

		this.defaultMiddlewares.push(
			helpers.middlewares.isLoggedIn,
			helpers.middlewares.entityAccess(this.entity)
		);
	}

	//
	// Routes
	//

	/**
	 * GET - Render the entity's list file
	 * @namespace E_traceability#list
	 */
	list() {
		return {
			method: 'get',
			path: '/list',
			middlewares: this.middlewares.list,
			func: async (data) => {
				data.tableUrl = `/${this.entity}/datalist`;
				data.renderFile = `${this.e_entity}/list`;

				/**
				 * Called at route start
				 * @function E_traceability#list#start
				 * @memberof E_traceability#list
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {string} data.tableUrl - Url for the ajax datalist
				 * @param {string} data.renderFile - Dust file to render
				 */
				if (await this.getHook('list', 'start', data) === false)
					return;

				/**
				 * Called before rendering
				 * @function E_traceability#list#beforeRender
				 * @memberof E_traceability#list
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {string} data.tableUrl - Url for the ajax datalist
				 * @param {string} data.renderFile - Dust file to render
				 */
				if (await this.getHook('list', 'beforeRender', data) === false)
					return;

				data.res.success(_ => data.res.render(data.renderFile, data));
			}
		}
	}

	/**
	 * POST - Ajax route use by the datalist
	 * @namespace E_traceability#datalist
	 */
	datalist() {
		return {
			method: 'post',
			path: '/datalist',
			middlewares: this.middlewares.datalist,
			func: async (data) => {
				data.speInclude = null;
				data.speWhere = null;
				data.tableInfo = data.req.body;

				/**
				 * Called at route start
				 * @function E_traceability#datalist#start
				 * @memberof E_traceability#datalist
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
				 * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
				 * @param {object} data.tableInfo - Table information from client
				 */
				if (await this.getHook('datalist', 'start', data) === false)
					return;

				/**
				 * Called before datatable query build and execution
				 * @function E_traceability#datalist#beforeDatatableQuery
				 * @memberof E_traceability#datalist
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
				 * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
				 * @param {object} data.tableInfo - Table information from client
				 */
				if (await this.getHook('datalist', 'beforeDatatableQuery', data) === false)
					return;

				if(data.req.query.entity){
					data.speWhere = {
						...data.speWhere,
						f_entity: data.req.query.entity
					}
				}

				if(data.req.query.id){
					data.speWhere = {
						...data.speWhere,
						f_id_entity: data.req.query.id
					}
				}

				data.rawData = await this.helpers.datatable(this.E_entity, data.tableInfo, data.speInclude, data.speWhere);

				/**
				 * Called after datatable query execution, before post processing of results
				 * @function E_traceability#datalist#afterDatatableQuery
				 * @memberof E_traceability#datalist
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
				 * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
				 * @param {object} data.tableInfo - Table information from client
				 * @param {string} data.rawData - Result of the datatable query as raw data
				 */
				if (await this.getHook('datalist', 'afterDatatableQuery', data) === false)
					return;

				data.preparedData = await this.helpers.entity.prepareDatalistResult(this.e_entity, this.attributes, this.options, data.rawData, data.req.session.lang_user)

				/**
				 * Called before json response
				 * @function E_traceability#datalist#beforeResponse
				 * @memberof E_traceability#datalist
				 * @param {object} data
				 * @param {object} data.req - Request - See expressjs definition
				 * @param {object} data.res - Response - See expressjs definition
				 * @param {object} [data.transaction] - Database transaction. undefined by default, provide your own when necessary
				 * @param {object} [data.speWhere] - Specific `where` case added to datatable's request
				 * @param {string[]} [data.speInclude] - Specific elements to `include` to datatable's request. An array of field path compatible with `helpers.model_builder.getIncludeFromFields()` is expected
				 * @param {object} data.tableInfo - Table information from client
				 * @param {string} data.rawData - Result of the datatable query as raw data
				 * @param {string} data.preparedData - Post processed data of datatable query results. This is the data sent as response
				 */
				if (await this.getHook('datalist', 'beforeResponse', data) === false)
					return;

				data.res.success(_ => data.res.send(data.preparedData).end());
			}
		}
	}
}

module.exports = Tracking;