const fs = require('fs-extra');

module.exports = {
	removeDustScopeFromFile: (start, end, filepath, onlyEmpty = false) => {
		let file_content = fs.readFileSync(filepath, 'utf8');
		let start_at = false;
		let idx_start = file_content.indexOf(start);
		let idx_end = file_content.indexOf(end, idx_start);

		while(idx_start != -1) {

			if(idx_start == -1 || idx_end == -1){
				console.log(start);
				console.warn(`Unable to find index in file ${filepath}`);
				continue;
			}

			if(onlyEmpty) {
				const between_content = file_content.substring(idx_start + start.length, idx_end);
				if(!((between_content.match(/^\s*$/) || []).length > 0)){
					start_at = idx_end;
					idx_start = file_content.indexOf(start, idx_end);
					idx_end = file_content.indexOf(end, idx_start);
					continue;
				}
				start_at = false;
			}

			// Add end string length to remove after iteration and not before (at end index instead of start index)
			idx_end += end.length;

			// While empty caracters then increase index to remove them
			let char = '';
			while(char == '') {
				char = file_content[idx_end];
				idx_end++;
			}
			file_content = file_content.substring(0, idx_start) + file_content.substring(idx_end);

			idx_start = start_at ? file_content.indexOf(start, start_at) : file_content.indexOf(start);
			idx_end = file_content.indexOf(end, idx_start);
		}

		fs.writeFileSync(filepath, file_content, 'utf8');
		return true;
	}
}