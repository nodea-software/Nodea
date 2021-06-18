const model_builder = require('@core/helpers/model_builder');
const status_helper = require('@core/helpers/status');
const middlewares = require('@core/helpers/middlewares');
const api_documentation = require('@core/helpers/api_documentation');
const ApiRoute = require('@core/abstract_routes/api_route');

const models = require('@app/models');


// TODO: Ajouter matomo en default middleware (implique de gerer les defaultMiddleware comme des array et non un getter)
//const matomoTracker = require('@core/services/matomo_api_tracker');


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

		this.defaultMiddlewares.push(middlewares.apiAuthentication);
	}

	find() {
		this.router.get('/', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				answer: {},
				limit: parseInt(req.query.limit || 50),
				offset: parseInt(req.query.offset || 0),
				error: null
			};

			// Build include from query parameter: `?include=r_asso1,r_asso2`
			data.query = {limit: data.limit, offset: data.offset, transaction};
			if (req.query.include)
				data.query.include = model_builder.getIncludeFromFields(models, this.e_entity, req.query.include.split(','));

			data.query.where = {};
			for (const field in req.query)
				if (field.indexOf('fk_id_') == 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.where[field] = req.query[field];

			await this.getHook('find', 'beforeFind', data);

			const result = await models[this.E_entity].findAndCountAll(data.query);
			data.answer[this.entity] = result.rows || [];
			data.answer.totalCount = result.count;
			data.answer.rowsCount = data.answer[this.entity].length;

			await this.getHook('find', 'afterFind', data);

			res.success(_ => res.status(200).json(data.answer));
		}));
	}

	findOne() {
		this.router.get('/:id', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				id: parseInt(req.params.id),
				answer: {},
				error: null
			};

			// Build include from query parameter: `?include=r_asso1,r_asso2`
			data.query = {where: {id: data.id}, transaction};
			if (req.query.include)
				data.query.include = model_builder.getIncludeFromFields(models, this.e_entity, req.query.include.split(','));

			for (const field in req.query)
				if (field.indexOf('fk_id_') == 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.where[field] = req.query[field];

			await this.getHook('findOne', 'beforeFind', data);

			const result = await models[this.E_entity].findOne(data.query);
			if (!result)
				return res.error(_ => res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));
			data.answer[this.entity] = result;

			await this.getHook('findOne', 'afterFind', data);

			res.success(_ => res.status(200).json(data.answer));
		}));
	}

	findAssociation() {
		this.router.get('/:id/:association', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				id: req.params.id,
				association: req.params.association,
				answer: {},
				error: null,
				limit: parseInt(req.query.limit || 50),
				offset: parseInt(req.query.offset || 0)
			};
			data.query = {where: {id: data.id}, transaction};

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
				return res.error(_ => res.status(404).json({error: "No association with "+data.association}));

			for (const field in req.query)
				if (field.indexOf('fk_id_') === 0 || field.indexOf('f_') == 0 && this.attributes[field])
					data.query.include.where[field] = req.query[field];

			await this.getHook('findAssociation', 'beforeFind', data);

			const result = await models[this.E_entity].findOne(data.query);
			if (!result)
				return res.error(_ => res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));
			data.answer[data.association] = result[data.query.include.as];

			await this.getHook('findAssociation', 'afterFind', data);

			res.success(_ => res.status(200).json(data.answer));
		}));
	}

	// TODO: Use transactions to rollback on association error
	create() {
		this.router.post('/', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				answer: {},
				error: null
			};

			const [createObject, createAssociations] = model_builder.parseBody(this.attributes, this.options, req.body);
			data.createObject = createObject;
			data.createAssociations = createAssociations;

			await this.getHook('create', 'beforeCreate', data);

			const result = await models[this.E_entity].create(data.createObject, {user: req.user, transaction});
			// Find createdRow to have fields not in attributes.json included (ie: foreignKeys)
			const createdRow = await models[this.E_entity].findOne({where: {id: result.id}, transaction});
			data.answer[this.entity] = createdRow;

			await this.getHook('create', 'beforeAssociations', data);

			// Set associations
			await Promise.all(data.createAssociations.map(asso => result[asso.func](asso.value, {transaction})));

			await this.getHook('create', 'afterAssociations', data);

			res.success(_ => res.status(200).json(data.answer));
		}));
	}

	update() {
		this.router.put('/:id', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				id: parseInt(req.params.id),
				answer: {},
				error: null
			};

			const [updateObject, updateAssociations] = model_builder.parseBody(this.attributes, this.options, req.body);
			data.updateObject = updateObject;
			data.updateAssociations = updateAssociations;

			const result = await models[this.E_entity].findOne({where: {id: data.id}, transaction})
			if (!result)
				return res.error(_ => res.status(404).json({error: "No "+this.entity+" with ID "+data.id}));

			const statusPromises = [];
			for (const prop in req.body) {
				if (prop.indexOf('r_') != 0)
					continue;
				for (const option of this.options) {
					if (option.target == 'e_status' && option.as == prop) {
						delete data.updateObject[option.foreignKey]
						statusPromises.push(status_helper.setStatus(this.e_entity, data.id, option.as, req.body[prop]));
						break;
					}
				}
			}

			await this.getHook('update', 'beforeUpdate', data);

			await result.update(data.updateObject, {where: {id: data.id}}, {user: req.user, transaction});
			data.answer[this.entity] = result;

			await this.getHook('update', 'beforeAssociations', data);

			// Set associations
			await Promise.all([
				...data.updateAssociations.map(asso => result[asso.func](asso.value, {transaction})),
				...statusPromises
			])

			await this.getHook('update', 'afterAssociations', data);

			res.success(_ => res.status(200).json(data.answer));
		}));
	}

	destroy() {
		this.router.delete('/:id', this.asyncRoute(async (req, res, transaction) => {
			const data = {
				req,
				res,
				transaction,
				id: req.params.id,
				answer: {},
				error: null
			};

			this.getHook('destroy', 'beforeDestroy', data);

			await models[this.E_entity].destroy({where: {id: data.id}}, {transaction})

			this.getHook('destroy', 'afterDestroy', data);

			res.success(_ => res.status(200).end());
		}));
	}

	docData() {
		return api_documentation.entityDocumentation(this.e_entity, this.attributes, this.options);
	}

}

module.exports = ApiEntity;