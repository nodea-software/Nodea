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
	let dust_content = '';
	for (let i = 0; i < files.length; i++){
		try {
			const key = files[i].split('/').pop();
			const path_to_file = files[i].split('/').slice(0, -1).join('/');
			file_obj[key] = {
				styles: fs.readFileSync(files[i], 'utf8')
			}
			let relativePath = files[i].split('/public/')[1];
			relativePath = relativePath.split('/').slice(0, -1).join('/');

			// Replace @import url with the target file content
			file_obj[key].styles = file_obj[key].styles.replace(/(?<!\/{2} *)@import *url\((?!["']?data:)["']?([./]*)(.*?)["']?\)[;]?/gm, (...$) => {
				const filepath = `${path_to_file}/${$[1]}${$[2]}`;
				return fs.readFileSync(filepath, 'utf8');
			});

			// Rework CSS url(../) inside file to fixe relative path to ressources
			file_obj[key].styles = file_obj[key].styles.replace(/(?<!\/{2} *)(?<!@import )url\((?!["']?http[s]?:)(?!["']?data:)["']?([./]*)(.*?)["']?\)/gm, `url(/${relativePath}/$1$2)`);
			const filepath = files[i].includes(corePath) ? `/core/${files[i].split('/public/')[1]}` : `/${files[i].split('/public/')[1]}`;
			dust_content += `<link href="${filepath}" rel="stylesheet">\n`;
		} catch(err) {
			console.log('❌ BUNDLE ERROR, SKIPPING:', files[i]);
		}
	}
	return {
		minify: await minify.css(file_obj, {
			css: {rebase: false}
		}),
		dust: dust_content
	};
}

async function bundleJS(files) {
	const file_obj = {};
	let dust_content = '';
	for (let i = 0; i < files.length; i++){
		try {
			file_obj[files[i].split('/').pop()] = fs.readFileSync(files[i], 'utf8');
			const filepath = files[i].includes(corePath) ? `/core/${files[i].split('/public/')[1]}` : `/${files[i].split('/public/')[1]}`;
			dust_content += `<script src="${filepath}" type="text/javascript"></script>\n`;
		} catch(err) {
			console.log('❌ BUNDLE ERROR, SKIPPING:', files[i]);
		}
	}
	return {
		minify: await minify.js(file_obj),
		dust: dust_content
	};
}

exports.bundleAll = async function (only_missing = false, specific_bundle = null) {
	const promises = [];
	for(const path of [appPath, corePath]) {
		const bundle_conf = JSON.parse(fs.readFileSync(path + '/public/bundle.json', 'utf8'));

		if (!fs.existsSync(path + '/public/bundle'))
			fs.mkdirSync(path + '/public/bundle');

		if (!fs.existsSync(path + '/views/bundle'))
			fs.mkdirSync(path + '/views/bundle');

		for (const bundle_name in bundle_conf) {

			if(bundle_name.startsWith('DEMO_YOUR_BUNDLE'))
				continue;

			const bundle = bundle_conf[bundle_name];
			const bundle_path = `${path}/public/bundle/${bundle_name}.bundle.${bundle.type}`;
			const dust_path = `${path}/views/bundle/${bundle_name}.dust`;

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
				fs.writeFileSync(bundle_path, bundle_content.minify, 'utf8');
				fs.writeFileSync(dust_path, bundle_content.dust, 'utf8');
			})(bundle_name));
		}
	}
	await Promise.all(promises);
}