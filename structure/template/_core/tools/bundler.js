// Bundler CSS, JS, IMG files for front loading ressources optimization
// Based on bundle.json config file locate in @app/public/bundle.json
const fs = require('fs-extra');
const minify = require('minify');
const {
	appPath,
	corePath
} = {
	appPath: __dirname + '/../../app',
	corePath: __dirname + '/../../_core',
};

async function bundleCSS(files) {

	const file_obj = {};
	for (let i = 0; i < files.length; i++){
		try {
			const key = files[i].split('/').pop();
			file_obj[key] = {
				styles: fs.readFileSync(files[i], 'utf8')
			}
			let relativePath = files[i].split('/public/')[1];
			relativePath = relativePath.split('/').slice(0, -1).join('/');
			// Rework CSS url(../) inside file to fixe relative path to ressources
			file_obj[key].styles = file_obj[key].styles.replace(/url\((?!["]?data:)(([.*/]*)(.*?))\)/g, `url(/${relativePath}/$2$3)`);
		} catch(err) {
			console.log('❌ BUNDLE ERROR, SKIPPING:', files[i]);
		}
	}
	return minify.css(file_obj, {
		css: {
			rebase: false
			// rebaseTo: appPath + '/public/bundle'
		}
	});
}

async function bundleJS(files) {
	const file_obj = {};
	for (let i = 0; i < files.length; i++){
		try {
			file_obj[files[i].split('/').pop()] = fs.readFileSync(files[i], 'utf8');
		} catch(err) {
			console.log('❌ BUNDLE ERROR, SKIPPING:', files[i]);
		}
	}

	return minify.js(file_obj);
}

exports.bundleAll = async function (only_missing = false, specific_bundle = null) {
	const promises = [];
	for(const path of [appPath, corePath]) {
		const bundle_conf = JSON.parse(fs.readFileSync(path + '/public/bundle.json', 'utf8'));

		if (!fs.existsSync(path + '/public/bundle'))
			fs.mkdirSync(path + '/public/bundle');

		for (const bundle_name in bundle_conf) {

			if(bundle_name.startsWith('DEMO_YOUR_BUNDLE'))
				continue;

			const bundle = bundle_conf[bundle_name];
			const bundle_path = `${path}/public/bundle/${bundle_name}.bundle.${bundle.type}`;

			// If only missing bundle and bundle exist, then skip
			if (only_missing && !specific_bundle && fs.existsSync(bundle_path))
				continue;

			// If specified bundle and not the bundle we're looking for, then skip
			if(specific_bundle && bundle_name != specific_bundle)
				continue;

			promises.push((async bundle_name => {
				console.log('🔨 GENERATING BUNDLE:', bundle_name, '...');
				bundle.files = bundle.files.map(x => x.replace('@app', appPath).replace('@core', corePath));
				let bundle_content;
				switch (bundle.type) {
					case 'css':
						bundle_content = await bundleCSS(bundle.files);
						break;
					case 'js':
						bundle_content = await bundleJS(bundle.files);
						break;
					default:
						console.error('MISSING BUNDLE TYPE FOR BUNDLE:', bundle_name);
						break;
				}
				fs.writeFileSync(bundle_path, bundle_content, 'utf8');
			})(bundle_name));
		}
	}
	await Promise.all(promises);
}