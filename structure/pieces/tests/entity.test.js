/* eslint-disable no-undef */

// console.error = _ => null;
// console.warn = _ => null;

const { getMockedEnv, generateEntityBody, generateEntityFiles } = require('@core/utils/mocking');
const status_helper = require('@core/helpers/status');
const attributes = require('@app/models/attributes/ENTITY_NAME');
const relations = require('@app/models/options/ENTITY_NAME');
const dayjs = require('dayjs');
const bcrypt = require('bcrypt');

const models = require('@app/models');
const MODEL_NAME = require('@app/routes/ENTITY_NAME');
const ENTITY_NAME = new MODEL_NAME();
const TEST_ENTITY_ID = 1;

describe("ENTITY MODEL_NAME", _ => {

	jest.setTimeout(10000);

	beforeAll(() => models.MODEL_NAME.findOrCreate({
		where: {
			id: TEST_ENTITY_ID
		},
		defaults: {
			id: TEST_ENTITY_ID,
			...generateEntityBody('ENTITY_NAME')
		},
		user: global.__jestUser
	}));

	afterAll(() => models.sequelize.close());

	test("[HAPPY] - GET - LIST", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.list().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Render
		expect(mockedRes.render).toBeDefined()
		const last_render_url = mockedRes.render.mock.lastCall[0];
		expect(last_render_url).toMatch(/[/]?ENTITY_NAME\/list/);
	});

	test("[HAPPY] - POST - DATALIST", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					draw: '1',
					columns: [{
						data: 'id',
						name: '',
						searchable: 'true',
						orderable: 'true',
						search: {
							value: '',
							regex: 'false'
						}
					}],
					order: [{
						column: '0',
						dir: 'desc'
					}],
					start: '0',
					length: '25',
					search: {
						value: '',
						regex: 'false'
					},
					columnsTypes: ['string']
				},
				session: {
					passport: {
						user: global.__jestUser
					}
				},
				user: global.__jestUser
			},
			func: ENTITY_NAME.datalist().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		expect(mockedRes.send).toBeDefined();
		expect(typeof mockedRes.send.recordsTotal).toBe('number');
		expect(typeof mockedRes.send.recordsFiltered).toBe('number');
		expect(Array.isArray(mockedRes.send.data)).toBeTruthy();
	});

	// Remove .skip and fill needed relation information to enable the test
	test.skip("[HAPPY] - POST - SUBDATALIST", async () => {
		// To configure, associated entity to test subentity
		const subentityAlias = 'r_hasmany';
		const subentityModel = 'E_hasmany';

		// Entity source ID
		const sourceId = TEST_ENTITY_ID;

		// eslint-disable-next-line no-unreachable
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					draw: '1',
					columns: [{
						data: 'id',
						name: '',
						searchable: 'true',
						orderable: 'true',
						search: {
							value: '',
							regex: 'false'
						}
					}],
					order: [{
						column: '0',
						dir: 'desc'
					}],
					start: '0',
					length: '25',
					search: {
						value: '',
						regex: 'false'
					},
					columnsTypes: ['string'],
					sourceId,
					subentityAlias,
					subentityModel
				},
				session: {
					passport: {
						user: global.__jestUser
					}
				},
				user: global.__jestUser
			},
			func: ENTITY_NAME.subdatalist().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		expect(mockedRes.send).toBeDefined();
		expect(typeof mockedRes.send.recordsTotal).toBe('number');
		expect(typeof mockedRes.send.recordsFiltered).toBe('number');
		expect(Array.isArray(mockedRes.send.data)).toBeTruthy();
	});

	test("[HAPPY] - GET - SHOW", async () => {
		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess, mockedError} = getMockedEnv({
			req: {
				query: {
					id: row.id
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.show().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_exist = await models.MODEL_NAME.findByPk(row.id);

		if(row_exist) {
			// Called res.success once
			expect(mockedSuccess).toHaveBeenCalledTimes(1);
			// Render
			expect(mockedRes.render).toBeDefined();
			const last_render_url = mockedRes.render.mock.lastCall[0];
			expect(last_render_url).toMatch(/[/]?ENTITY_NAME\/show/);
		} else {
			// Called res.error once and is 404
			expect(mockedError).toHaveBeenCalledTimes(1);
			// Render
			expect(mockedRes.render).toBeDefined();
			const last_render_url = mockedRes.render.mock.lastCall[0];
			expect(last_render_url).toBe('common/404');
		}
	});

	test("[HAPPY] - GET - CREATE", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.create_form().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Render
		expect(mockedRes.render).toBeDefined()
		const last_render_url = mockedRes.render.mock.lastCall[0];
		expect(last_render_url).toMatch(/[/]?ENTITY_NAME\/create/);
	});

	test("[HAPPY] - POST - CREATE", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: generateEntityBody('ENTITY_NAME'),
				files: generateEntityFiles('ENTITY_NAME'),
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.create().func
		});

		const countBeforeCreate = await models.MODEL_NAME.count();
		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const countAfterCreate = await models.MODEL_NAME.count();

		// Created a row in DB
		expect(countAfterCreate).toEqual(countBeforeCreate + 1);
		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Redirected to /show
		let last_redirect_url = '';
		try {
			last_redirect_url = mockedRes.redirect.mock.lastCall[0];
		} catch(err) {
			console.log(mockedRes.redirect);
		}
		expect(last_redirect_url).toMatch(/\/URL_NAME\/show\?id=\d+/);
	});

	test("[HAPPY] - GET - UPDATE", async () => {
		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess, mockedError} = getMockedEnv({
			req: {
				query: {
					id: row.id
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.update_form().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_exist = await models.MODEL_NAME.findByPk(row.id);

		if(row_exist) {
			// Called res.success once
			expect(mockedSuccess).toHaveBeenCalledTimes(1);
			// Render
			expect(mockedRes.render).toBeDefined();
			const last_render_url = mockedRes.render.mock.lastCall[0];
			expect(last_render_url).toMatch(/[/]?ENTITY_NAME\/update/);
		} else {
			// Called res.error once and is 404
			expect(mockedError).toHaveBeenCalledTimes(1);
			// Render
			expect(mockedRes.render).toBeDefined();
			if(!mockedRes.render.mock)
				console.log(mockedRes.render);
			const last_render_url = mockedRes.render.mock.lastCall[0];
			expect(last_render_url).toBe('common/404');
		}
	});

	test("[HAPPY] - POST - UPDATE", async () => {
		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

		const new_values = generateEntityBody('ENTITY_NAME');
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					id: row.id,
					...new_values
				},
				files: generateEntityFiles('ENTITY_NAME'),
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.update().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const updated_row = await models.MODEL_NAME.findByPk(row.id);

		expect(updated_row).not.toBeNull();
		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Version increase
		expect(updated_row.version).toBeGreaterThan(row.version);
		// UpdatedBy Tracability
		expect(updated_row.updatedBy).toBe(global.__jestUser.f_login);

		// Check each new value update
		// eslint-disable-next-line global-require
		const attributes = require('@app/models/attributes/ENTITY_NAME');
		for (const field in new_values){
			if(field == 'updatedBy')
				continue; // Already checked
			else if(new_values[field] && typeof new_values[field] === 'object')
				expect(updated_row[field]).toStrictEqual(new_values[field]);
			else if(attributes[field].nodeaType == 'password')
				expect(bcrypt.compareSync(new_values[field], updated_row[field])).toBe(true);
			else
				expect(updated_row[field]).toBe(new_values[field]);
		}

		const time_difference = dayjs(updated_row.updatedAt).diff(row.updatedAt);

		// UpdatedAt should be same or more recent
		expect(time_difference).toBeGreaterThanOrEqual(0);

		// Redirect
		expect(mockedRes.redirect).toBeDefined();
		const last_redirect_url = mockedRes.redirect.mock.lastCall[0];
		expect(last_redirect_url).toBe("/URL_NAME/show?id=" + updated_row.id);
	});

	// Remove .skip and fill needed relation information to enable the test
	test.skip("[HAPPY] - GET - LOADTAB", async () => {
		// To configure, associated entity to test subentity
		const associationAlias = 'r_hasone';
		const associationForeignKey = 'fk_id_hasone';

		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

		const associationFlag = row.id;

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess, mockedError} = getMockedEnv({
			req: {
				query: {
					ajax: 'true',
					associationAlias,
					associationForeignKey,
					associationFlag,
					associationSource: 'ENTITY_NAME',
					associationUrl: 'URL_NAME'
				},
				params: {
					id: associationFlag,
					alias: associationAlias
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.loadtab().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		expect(mockedRes.render).toBeDefined();
		const render_call = mockedRes.render.mock.lastCall;
		expect(typeof render_call[0]).toBe('string');
		expect(render_call[1]).toHaveProperty('tabType', 'e_subentity', 'subentity', 'sourceEntity', 'data', 'isEmpty');
	});

	test("[HAPPY] - GET - SET_STATUS", async () => {
		const status_relations = relations.filter(x => x.target == 'e_status');

		// For each status on entity
		/* eslint-disable no-await-in-loop */
		for (let i = 0; i < status_relations.length; i++) {
			const relation = status_relations[i];
			const status = 's_' + relation.as.substring(2);

			let row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

			const entity_id = row.id;
			await status_helper.setInitialStatus(row, 'MODEL_NAME', attributes, {
				user: global.__jestUser
			});

			row = await models.MODEL_NAME.findOne({
				where: {
					id: entity_id
				},
				include: {
					model: models.E_status,
					as: relation.as
				}
			});

			// Create new children
			const children = await row[relation.as].createR_child({
				f_entity: 'ENTITY_NAME',
				f_field: status,
				f_name: 'Children',
				f_color: '#FFF'
			}, {
				user: global.__jestUser
			});

			const {mockedReq, mockedRes, mockedRoute, mockedSuccess, mockedError} = getMockedEnv({
				req: {
					params: {
						entity_id,
						status,
						id_new_status: children.id
					},
					session: {passport: {user: global.__jestUser}},
					user: global.__jestUser
				},
				func: ENTITY_NAME.set_status().func
			});

			await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
			expect(mockedSuccess).toHaveBeenCalledTimes(1);
			// Redirected to /show
			const last_redirect_url = mockedRes.redirect.mock.lastCall[0];
			expect(last_redirect_url).toMatch(`/URL_NAME/show?id=${row.id}`);
		}
		/* eslint-enabled no-await-in-loop */
	});

	test("[HAPPY] - POST - SEARCH", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					page: 1,
					searchField: ['id'],
					attrData: {
						using: 'id',
						source: 'URL_NAME'
					}
				},
				session: {
					passport: {
						user: global.__jestUser
					}
				},
				user: global.__jestUser
			},
			func: ENTITY_NAME.search().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);

		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		expect(mockedRes.json).toBeDefined();
		expect(mockedRes.json).toHaveProperty('count', 'rows', 'more');
		expect(typeof mockedRes.json.count).toBe('number');
		expect(mockedRes.json.rows.length).toBeGreaterThanOrEqual(0);
	});

	// Remove .skip and fill needed relation information to enable the test
	test.skip("[HAPPY] - POST - FIELDSET_ADD", async () => {
		const alias = 'r_hasmanypreset';
		const alias_model_entity = 'E_' + relations.find(x => x.as == alias).target.substring(2);

		const promises = [];
		const ids = [];
		for (let i = 0; i < 10; i++) {
			promises.push((async _=> {
				const new_row = await models[alias_model_entity].create({
					...generateEntityBody(alias_model_entity.toLowerCase())
				}, {
					user: global.__jestUser
				});
				ids.push(new_row.id);
			})())
		}

		await Promise.all(promises);

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				params: {
					alias
				},
				body: {
					ids,
					idEntity: TEST_ENTITY_ID
				},
				session: {
					passport: {
						user: global.__jestUser
					}
				},
				user: global.__jestUser
			},
			func: ENTITY_NAME.fieldset_add().func
		});

		const row_before = await models.MODEL_NAME.findOne({
			where: {
				id: TEST_ENTITY_ID
			},
			include: {
				model: models[alias_model_entity],
				as: alias
			}
		});
		const count_before = row_before[alias].length;
		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_after = await models.MODEL_NAME.findOne({
			where: {
				id: TEST_ENTITY_ID
			},
			include: {
				model: models[alias_model_entity],
				as: alias
			}
		});
		const count_after = row_after[alias].length;
		expect(parseInt(count_after)).toBe(parseInt(count_before) + 10)
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
	});

	// Remove .skip and fill needed relation information to enable the test
	test.skip("[HAPPY] - POST - FIELDSET_REMOVE", async () => {
		const alias = 'r_hasmanypreset';
		const alias_model_entity = 'E_' + relations.find(x => x.as == alias).target.substring(2);

		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);
		const create_alias_fn = 'createR_' + alias.substring(2);
		const new_alias_row = await row[create_alias_fn]({
			...generateEntityBody(alias_model_entity.toLowerCase())
		}, {
			user: global.__jestUser
		});

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				params: {
					alias
				},
				body: {
					idEntity: TEST_ENTITY_ID,
					idRemove: new_alias_row.id
				},
				session: {
					passport: {
						user: global.__jestUser
					}
				},
				user: global.__jestUser
			},
			func: ENTITY_NAME.fieldset_remove().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_after = await models.MODEL_NAME.findOne({
			where: {
				id: TEST_ENTITY_ID
			},
			include: {
				model: models[alias_model_entity],
				as: alias,
				required: true,
				where: {
					id: new_alias_row.id
				}
			}
		});
		expect(row_after).toBeNull();
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
	});

	test("[HAPPY] - POST - DELETE", async () => {
		const row = await models.MODEL_NAME.findByPk(TEST_ENTITY_ID);

		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					id: row.id
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.destroy().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const deleted_row = await models.MODEL_NAME.findByPk(row.id);

		// Deleted a row in DB
		expect(deleted_row).toBeNull();
		// Called res.success
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
	});
});