const fs = require('fs-extra');

exports.listEntityTrack = () => {
	const confTrack = JSON.parse(fs.readFileSync(__configPath + "/tracking.json"));
	return Object.keys(confTrack).map(key => { return {f_entity: key, id: key} });
};