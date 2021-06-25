const model_builder = require('@core/helpers/model_builder');
const status_helper = require('@core/helpers/status');
const middlewares = require('@core/helpers/middlewares');
const api_documentation = require('@core/helpers/api_documentation');
const ApiRoute = require('@core/abstract_routes/api_route');

const models = require('@app/models');
const matomoTracker = require('@core/services/matomo_api_tracker');

class ApiEntity extends ApiRoute {
	constructor(e_entity, attributes, options, additionalRoutes) {
		super([
			'find',
			'findOne',
			'findAssociation',
			'create',
			'update',
			'destroy',
			...additionalRoutes
		]);
		this.entity = e_entity.substring(2);
		this.e_entity = e_entity;
		this.E_entity = e_entity.capitalizeFirstLetter();

		this.attributes = attributes;
		this.options = options;

		this.defaultMiddlewares.push(
			middlewares.apiAuthentication,
			matomoTracker
		);
	}

	find() {
		this.router.get('/', this.asyncRoute(async (data) => {
			data.answer = {};
			data.limit = parseInt(data.req.query.limit || 50);
			data.offset = parseInt(data.req.query.offset || 0);
			data.error = null;

			// Build include from query parameter: `?include=r_asso1,r_asso2`
			data.query = {limit: data.limit, offset: data.offset, transaction: data.transaction};
			if (data.req.query.include)
				data.query.include = model_builder.getIncludeFromFields(models, this.e_entity, data.req.query.include.split(','));

			data.query.where = {};
			for (const field in data.req.query)
				if (field.indexOf('fk_id_') == 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.where[field] = data.req.query[field];

			await this.getHook('find', 'beforeFind', data);

			const result = await models[this.E_entity].findAndCountAll(data.query);
			data.answer[this.entity] = result.rows || [];
			data.answer.totalCount = result.count;
			data.answer.rowsCount = data.answer[this.entity].length;

			await this.getHook('find', 'afterFind', data);

			data.res.success(_ => data.res.status(200).json(data.answer));
		}));
	}

	findOne() {
		this.router.get('/:id', this.asyncRoute(async (data) => {
			data.id = parseInt(data.req.params.id);
			data.answer = {};
			data.error = null;

			// Build include from query parameter: `?include=r_asso1,r_asso2`
			data.query = {where: {id: data.id}, transaction: data.transaction};
			if (data.req.query.include)
				data.query.include = model_builder.getIncludeFromFields(models, this.e_entity, data.req.query.include.split(','));

			for (const field in data.req.query)
				if (field.indexOf('fk_id_') == 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.where[field] = data.req.query[field];

			await this.getHook('findOne', 'beforeFind', data);

			const result = await models[this.E_entity].findOne(data.query);
			if (!result)
				return data.res.error(_ => data.res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));
			data.answer[this.entity] = result;

			await this.getHook('findOne', 'afterFind', data);

			data.res.success(_ => data.res.status(200).json(data.answer));
		}));
	}

	findAssociation() {
		this.router.get('/:id/:association', this.asyncRoute(async (data) => {
			data.id = data.req.params.id;
			data.association = data.req.params.association;
			data.answer = {};
			data.error = null;
			data.limit = parseInt(data.req.query.limit || 50);
			data.offset = parseInt(data.req.query.offset || 0);
			data.query = {where: {id: data.id}, transaction: data.transaction};

			data.query.include = null;
			for (let i = 0; i < this.options.length; i++) {
				if (this.options[i].as == data.association) {
					data.query.include = {
						model: models[this.options[i].target.capitalizeFirstLetter()],
						as: this.options[i].as
					};
					if (this.options[i].relation.toLowerCase().indexOf('many') !== -1) {
						data.query.include.limit = data.limit;
						data.query.include.offset = data.offset;
					}
					break;
				}
			}

			if (data.query.include == null)
				return data.res.error(_ => data.res.status(404).json({error: "No association with "+data.association}));

			for (const field in data.req.query)
				if (field.indexOf('fk_id_') === 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.include.where[field] = data.req.query[field];

			await this.getHook('findAssociation', 'beforeFind', data);

			const result = await models[this.E_entity].findOne(data.query);
			if (!result)
				return data.res.error(_ => data.res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));
			data.answer[data.association] = result[data.query.include.as];

			await this.getHook('findAssociation', 'afterFind', data);

			data.res.success(_ => data.res.status(200).json(data.answer));
		}));
	}

	// TODO: Use transactions to rollback on association error
	create() {
		this.router.post('/', this.asyncRoute(async (data) => {
			data.answer = {};
			data.error = null;

			const [createObject, createAssociations] = model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body);
			data.createObject = createObject;
			data.createAssociations = createAssociations;

			await this.getHook('create', 'beforeCreate', data);

			const result = await models[this.E_entity].create(data.createObject, {user: data.req.user, transaction: data.transaction});
			// Find createdRow to have fields not in attributes.json included (ie: foreignKeys)
			const createdRow = await models[this.E_entity].findOne({where: {id: result.id}, transaction: data.transaction});
			data.answer[this.entity] = createdRow;

			await this.getHook('create', 'beforeAssociations', data);

			// Set associations
			await Promise.all(data.createAssociations.map(asso => result[asso.func](asso.value, {transaction: data.transaction})));

			await this.getHook('create', 'afterAssociations', data);

			data.res.success(_ => data.res.status(200).json(data.answer));
		}));
	}

	update() {
		this.router.put('/:id', this.asyncRoute(async (data) => {
			data.id = parseInt(data.req.params.id);
			data.answer = {};
			data.error = null;

			const [updateObject, updateAssociations] = model_builder.parseBody(this.e_entity, this.attributes, this.options, data.req.body);
			data.updateObject = updateObject;
			data.updateAssociations = updateAssociations;

			const result = await models[this.E_entity].findOne({where: {id: data.id}, transaction: data.transaction})
			if (!result)
				return data.res.error(_ => data.res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));

			const statusPromises = [];
			for (const prop in data.req.body) {
				if (prop.indexOf('r_') != 0)
					continue;
				for (const option of this.options) {
					if (option.target == 'e_status' && option.as == prop) {
						delete data.updateObject[option.foreignKey]
						statusPromises.push(status_helper.setStatus(this.e_entity, data.id, option.as, data.req.body[prop]));
						break;
					}
				}
			}

			await this.getHook('update', 'beforeUpdate', data);

			await result.update(data.updateObject, {where: {id: data.id}}, {user: data.req.user, transaction: data.transaction});
			data.answer[this.entity] = result;

			await this.getHook('update', 'beforeAssociations', data);

			// Set associations
			await Promise.all([
				...data.updateAssociations.map(asso => result[asso.func](asso.value, {transaction: data.transaction})),
				...statusPromises
			])

			await this.getHook('update', 'afterAssociations', data);

			data.res.success(_ => data.res.status(200).json(data.answer));
		}));
	}

	destroy() {
		this.router.delete('/:id', this.asyncRoute(async (data) => {
			data.id = data.req.params.id;
			data.answer = {};
			data.error = null;

			this.getHook('destroy', 'beforeDestroy', data);

			await models[this.E_entity].destroy({where: {id: data.id}}, {transaction: data.transaction})

			this.getHook('destroy', 'afterDestroy', data);

			data.res.success(_ => data.res.status(200).end());
		}));
	}

	docData() {
		return api_documentation.entityDocumentation(this.e_entity, this.attributes, this.options);
	}

}

module.exports = ApiEntity;