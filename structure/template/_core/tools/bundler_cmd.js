const bundler = require('./bundler');
(async () => {
	// npm run bundle [all|bundle_name]
	await bundler.bundleAll(process.argv[2] != 'all', process.argv[2] != 'all' ? process.argv[2] : null);
})().catch(err => {
	console.error(err);
});