global.__configPath = __dirname + '/../config';
global.__corePath = __dirname + '/../_core';
global.__appPath = __dirname + '/../app';
console.error = _ => {};
console.warn = _ => {};

const { getMockedEnv, getEntityFormData } = require('./utils/mocking');

const models = require('@app/models');
const MODEL_NAME = require('@app/routes/ENTITY_NAME');
const ENTITY_NAME = new MODEL_NAME();

const fakeUser = {
	id: 1,
	f_login: 'JestTests',
	r_group: [{f_label: 'admin'}],
	r_role: [{f_label: 'admin'}]
}

describe("Entity MODEL_NAME routes", _ => {
	test("Create success", async () => {
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: getEntityFormData('ENTITY_NAME'),
				session: {passport: {user: fakeUser}},
				user: fakeUser
			},
			route: ENTITY_NAME.create().route,
		})

		const countBeforeCreate = await models.MODEL_NAME.count()
		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes)
		const countAfterCreate = await models.MODEL_NAME.count();

		// Created a row in DB
		expect(countAfterCreate).toEqual(countBeforeCreate+1);
		// Called res.success once
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
		// Redirected to /show
		expect(mockedRes.redirect.mock.calls[0][0]).toMatch(/\/URL_NAME\/show\?id=\d+/);
	});

	// test("Create error", async () => {
	// 	const {mockedReq, mockedRes, mockedRoute, mockedError} = getMockedEnv({
	// 		req: {
	// 			body: getEntityFormData('ENTITY_NAME'),
	// 			session: {passport: {user: fakeUser}},
	// 			user: fakeUser
	// 		},
	// 		route: ENTITY_NAME.create().route,
	// 	});

	// 	const countBeforeCreate = await models.MODEL_NAME.count()
	// 	await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes)
	// 	const countAfterCreate = await models.MODEL_NAME.count();

	// 	// Didn't create a row in DB
	// 	expect(countAfterCreate).toEqual(countBeforeCreate);
	// 	// Called res.error
	// 	expect(mockedError).toHaveBeenCalledTimes(1);
	// });

	test("Update success", async () => {
		const [originRow] = await models.MODEL_NAME.findAll({limit: 1, order: [['id', 'desc']]});
		const formData = {
			id: originRow.id,
			...getEntityFormData('ENTITY_NAME')
		};
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: formData,
				session: {passport: {user: fakeUser}},
				user: fakeUser
			},
			route: ENTITY_NAME.update().route,
		});

		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes)
		const updatedRow = await models.MODEL_NAME.findOne({where: {id: originRow.id}});

		// Id didn't change
		expect(originRow.id).toEqual(updatedRow.id);
		// Fields updated
		// expect([updatedRow.f_xss, updatedRow.f_number]).toEqual([mockedReq.body.f_xss, mockedReq.body.f_number]);
		// Called res.success
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
	});

	test("Delete success", async () => {
		const [created] = await models.MODEL_NAME.findAll({limit: 1, order: [['id', 'desc']]});
		const createdId = created.id;
		const {mockedReq, mockedRes, mockedRoute, mockedSuccess} = getMockedEnv({
			req: {
				body: {id: createdId},
				session: {passport: {user: fakeUser}},
				user: fakeUser
			},
			route: ENTITY_NAME.destroy().route,
		});

		const countBeforeDelete = await models.MODEL_NAME.count()
		await ENTITY_NAME.asyncRoute(mockedRoute)(mockedReq, mockedRes)
		const countAfterDelete = await models.MODEL_NAME.count()

		// Deleted a row in DB
		expect(countAfterDelete).toEqual(countBeforeDelete-1)
		// Called res.success
		expect(mockedSuccess).toHaveBeenCalledTimes(1);
	});
});