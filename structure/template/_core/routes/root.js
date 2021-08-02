const Route = require('@core/abstract_routes/route');

class CoreRoot extends Route {
	constructor(additionalRoutes) {
		const registeredRoutes = [
			'root',
			...additionalRoutes
		];
		super(registeredRoutes);
	}

	root() {
		this.router.get('/', this.middlewares.root, (req, res) => {
			res.redirect('/login');
		});
	}
}

module.exports = CoreRoot;