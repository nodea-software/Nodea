module.exports = (req, res, next) => {
	const redirect = res.redirect;
	res.redirect = view => {
		// If request comes from ajax call, no need to render show/list/etc.. pages, 200 status is enough
		if (req.query.ajax) {
			// Check role access error in toastr. Send 403 if found, {refresh: true} will force reload of the page (behavior comes from public/newmips/show.js)
			let toast;
			for (let i = 0; i < req.session.toastr.length; i++) {
				toast = req.session.toastr[i];
				if (toast.message && toast.message == "administration.access_settings.no_access_role")
					return res.status(403).send({refresh: true});
			}
			req.session.toastr = [];
			return res.sendStatus(200);
		}
		redirect.call(res, view);
	}
	next();
}