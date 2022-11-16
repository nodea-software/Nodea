const fs = require('fs-extra');
const beautify = require('js-beautify');

// Injecting JS code inside specify hook in specified route
exports.writeInHook = (filepath, route, hook, content) => {

	let file_content = fs.readFileSync(filepath, 'utf8');
	let idx_start_route = file_content.indexOf(route + ':');

	// Looking up for route function scope
	let start_char = file_content[idx_start_route], end_char;
	while(start_char != '{') {
		start_char = file_content[idx_start_route];
		idx_start_route++;
	}

	const wait_for_list = ['\'', '"', '`'];
	let idx_end_route = idx_start_route,
		bracket_cpt = 1,
		wait_for = false,
		skip_next = false;

	while(bracket_cpt != 0) {
		if(skip_next) {
			skip_next = false;
			idx_end_route++;
			continue;
		}

		end_char = file_content[idx_end_route];

		if(wait_for) {
			if(end_char == '\\')
				skip_next = true;
			else if(end_char == wait_for)
				wait_for = false;
			else if(wait_for.length == 2 && end_char == wait_for[0] && file_content[idx_end_route + 1] == wait_for[1]){
				// Case comment like /* */ ending
				wait_for = false;
				idx_end_route++; // Already add idx +1 because we want to skip 2 char not only 1
			}
			idx_end_route++;
			continue;
		}

		// Waiting for the next occurence, for example start of string need end of string (' -> wait_for ')
		if(wait_for_list.includes(end_char)) {
			wait_for = end_char;
			idx_end_route++;
			continue;
		}

		// Handling code comment like //
		if(end_char == '/' && file_content[idx_end_route + 1] == '/') {
			wait_for = '\n';
			idx_end_route++;
			continue;
		}

		// Handling code comment like /* */
		if(end_char == '/' && file_content[idx_end_route + 1] == '*') {
			wait_for = '*/';
			idx_end_route++;
			continue;
		}

		if(end_char == '{')
			bracket_cpt++;
		else if(end_char == '}')
			bracket_cpt--;
		idx_end_route++;
	}

	let route_fn = file_content.substring(idx_start_route, idx_end_route);

	// Uncomment hook if necessary
	const comment_regex = new RegExp(`[/]{2} ${hook}|[/]{2}${hook}`);
	route_fn = route_fn.replace(comment_regex, hook);

	let idx_start_hook = route_fn.indexOf(hook + ':');

	// Looking up for hook function scope
	start_char = route_fn[idx_start_hook];
	while(start_char != '{') {
		start_char = route_fn[idx_start_hook];
		idx_start_hook++;
	}

	// Write JS content in hook
	route_fn = route_fn.substring(0, idx_start_hook) + content + route_fn.substring(idx_start_hook, route_fn.length);

	// Write JS content in route
	file_content = file_content.substring(0, idx_start_route) + route_fn + file_content.substring(idx_end_route, file_content.length);

	// Beautify the file
	file_content = beautify(file_content, {
		indent_size: 4,
		indent_with_tabs: true
	});

	fs.writeFileSync(filepath, file_content, 'utf8');
};