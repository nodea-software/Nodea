/* eslint-disable no-undef */

// console.error = _ => {};
// console.warn = _ => {};

const { getMockedEnv, generateEntityBody } = require('@core/utils/mocking');
const dayjs = require('dayjs');

const models = require('@app/models');
const MODEL_NAME = require('@app/routes/ENTITY_NAME');
const ENTITY_NAME = new MODEL_NAME();

describe("ENTITY MODEL_NAME", _ => {

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

	test("[HAPPY] - POST - SUBDATALIST", async () => {
		// To configure, associated entity to test subentity
		const sourceId = 1;
		const subentityAlias = 'r_test';
		const subentityModel = 'E_test';

		// Comment next line to enable the test
		return expect(true).toBeTruthy();

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
		const row_id = 1;
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess, mockedError} = getMockedEnv({
			req: {
				query: {
					id: row_id
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.show().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_exist = await models.MODEL_NAME.findByPk(row_id);

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
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.create().func
		});

		const countBeforeCreate = await models.MODEL_NAME.count()
		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes)
		const countAfterCreate = await models.MODEL_NAME.count();

		// Created a row in DB
		expect(countAfterCreate).toEqual(countBeforeCreate + 1);
		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Redirected to /show
		const last_redirect_url = mockedRes.redirect.mock.lastCall[0];
		expect(last_redirect_url).toMatch(/\/URL_NAME\/show\?id=\d+/);
	});

	test("[HAPPY] - GET - UPDATE", async () => {
		const row_id = 1;
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				query: {
					id: row_id
				},
				session: {passport: {user: global.__jestUser}},
				user: global.__jestUser
			},
			func: ENTITY_NAME.update_form().func
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes);
		const row_exist = await models.MODEL_NAME.findByPk(row_id);

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
			const last_render_url = mockedRes.render.mock.lastCall[0];
			expect(last_render_url).toBe('common/404');
		}
	});

	test("[HAPPY] - POST - UPDATE", async () => {
		let row = await models.MODEL_NAME.findOne();
		if(!row)
			row = await models.MODEL_NAME.create({
				...generateEntityBody('ENTITY_NAME')
			});

		const new_values = generateEntityBody('ENTITY_NAME');
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {
					id: row.id,
					...new_values
				},
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
		for (const field in new_values)
			expect(updated_row[field]).toBe(new_values[field]);

		const time_difference = dayjs(updated_row.updatedAt).diff(row.updatedAt);
		// UpdatedAt should be same or more recent
		expect(time_difference).toBeGreaterThanOrEqual(0);

		// Redirect
		expect(mockedRes.redirect).toBeDefined();
		const last_redirect_url = mockedRes.redirect.mock.lastCall[0];
		expect(last_redirect_url).toBe("/URL_NAME/show?id=" + updated_row.id);
	});

	test("[HAPPY] - GET - LOADTAB", async () => expect(true).toBeTruthy());

	test("[HAPPY] - GET - SET_STATUS", async () => expect(true).toBeTruthy());

	test("[HAPPY] - POST - SEARCH", async () => expect(true).toBeTruthy());

	test("[HAPPY] - POST - FIELDSET_ADD", async () => expect(true).toBeTruthy());

	test("[HAPPY] - POST - FIELDSET_REMOVE", async () => expect(true).toBeTruthy());

	test("[HAPPY] - POST - FIELDSET_REMOVE", async () => expect(true).toBeTruthy());

	test("[HAPPY] - POST - DELETE", async () => {
		let row = await models.MODEL_NAME.findOne();
		if(!row)
			row = await models.MODEL_NAME.create();

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