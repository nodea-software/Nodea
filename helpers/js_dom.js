const fs = require("fs-extra");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const jquery = require('jquery');
const beautify = require('js-beautify').html;

// Comment dust elements starting with `{` and ending with `}`
// Comment only upper level dust when nested : {@eq key=keyObj value="{value}"} : <!--{@eq key=keyObj value="{value}"}-->
function commentDust(paramStr) {
	let str = paramStr;
	let openIdx = [], closeIdx = [];
	let commentedStr = '', lastIndex;
	while (str.length) {
		// Simulate indexOf with starting position but using regex
		const offset = lastIndex || 0;
		let currentIndex = str.slice(offset).search(/[{}]/m);
		// No more matches
		if (currentIndex === -1)
			return commentedStr + str;
		currentIndex += offset;

		// Avoid commenting javascript, skip <script> to </script>
		const scriptIndex = str.indexOf('<script');
		if (scriptIndex !== -1 && scriptIndex <= currentIndex) {
			const scriptEndIndex = str.indexOf('</script>') + '</script>'.length;
			commentedStr += str.substring(0, scriptEndIndex);
			str = str.substring(scriptEndIndex);
			lastIndex = 0;
			openIdx = [];
			closeIdx = [];
			continue;
		}

		// Register and count opening and closing chars
		if (str[currentIndex] === '{') {
			// If already commented then skip
			const before_string = str[currentIndex - 4] + str[currentIndex - 3] + str[currentIndex - 2] + str[currentIndex - 1];
			if(before_string != '<!--')
				openIdx.push(currentIndex);
		}
		else if (str[currentIndex] === '}' && openIdx.length > 0)
			closeIdx.push(currentIndex);

		// Comment from first open to last close, copy from start to close
		if (openIdx.length !== 0 && openIdx.length === closeIdx.length) {
			const startToOpen = str.substring(0, openIdx[0]);
			const openToClose = str.substring(openIdx[0], closeIdx[closeIdx.length-1] + 1)
			commentedStr += `${startToOpen}<!--${openToClose}-->`;

			// Remove processed string part and reset infos
			str = str.substring(closeIdx[closeIdx.length-1] + 1);
			lastIndex = 0;
			openIdx = [];
			closeIdx = [];
		}
		// Search again starting from last matched char
		else
			lastIndex = currentIndex + 1;
	}

	return commentedStr;
}

function read(filepath, isLayout = false, content = false) {
	let fileData = content ? content : fs.readFileSync(filepath, 'utf8');

	if(!fileData)
		throw new Error("Unable to read the file: " + filepath.split("/workspace/").pop());

	// Force quote and double quote order in placeholders. jsDom autmaticaly change `placeholder=''`to `placeholder=""`
	// Html parsing breaks if double quotes are used to give the translation key `key=""`
	// Force double quote around, simple quote inside. Change it back when writing to document
	// fileData = fileData.replace(/placeholder=["'](.+?)["'](.+?)["'](.+?)["']/g, 'placeholder="$1\'$2\'$3"');

	// Replace all placeholder='{#__key="..." /}' with placeholder="__key=..."
	fileData = fileData.replace(/placeholder=["']{#__ (.+?)["'](.+?)["'](.+?)["']/g, 'placeholder="__$1$2"');

	// Comment `dustjs` elements. We need to comment them to allow jsdom to parse the file correctly
	fileData = commentDust(fileData);

	// Wrap data in <body> tag to provide upper level when writing
	if(!isLayout)
		fileData = "<body>"+fileData+"</body>";

	const { window } = new JSDOM(fileData);
	const $ = jquery(window);
	$.html = () => $("body")[0].innerHTML;
	return $;
}
exports.read = read;

function write(filepath, $, isLayout = false) {

	let file_content;
	if(isLayout) {
		file_content = "<!DOCTYPE html>";
		file_content += $("html")[0].outerHTML;
	}
	else
		file_content = $("body")[0].innerHTML;

	// Fix a bug caused by JSDOM that append &nbsp; at the beginning of the document
	if (file_content.substring(0, 6) == "&nbsp;")
		file_content = file_content.substring(6);

	// Replace escaped characters and script inclusion
	file_content = file_content.replace(/&gt;/g, '>');
	file_content = file_content.replace(/&lt;/g, '<');
	file_content = file_content.replace(/&quot;/g, "\"");
	file_content = file_content.replace('<script class="jsdom" src="http://code.jquery.com/jquery.js"></script>', '');

	file_content = beautify(file_content, {
		indent_size: 4,
		indent_with_tabs: true,
		indent_scripts: 'keep',
		unformatted: ['script'],
		indent_inner_html: true,
		indent_head_inner_html: true,
		preserve_newlines: false,
		max_preserve_newlines: 3
	});

	// Uncomment dust tags
	file_content = file_content.replace(/<!--{/g, "{")
	file_content = file_content.replace(/}-->/g, "}")

	// Regenerate {#__ /} translation dust for placeholders
	// Replace all placeholder="__key=..." with placeholder='{#__key="..." /}'
	file_content = file_content.replace(/placeholder=["']__key=(.+?)["']/g, 'placeholder=\'{#__ key="$1" /}\'');

	// Write back to file
	fs.writeFileSync(filepath, file_content, 'utf8');
	return;
}
exports.write = write;

exports.loadFromHtml = html => new Promise((resolve, reject) => {
	try {
		const { window } = new JSDOM(html);
		const $ = jquery(window);
		resolve($);
	} catch(err) {
		reject(err);
	}
})

exports.insertHtml = (filename, element, html) => {
	const $ = read(filename);
	$(element).html(html);
	write(filename, $);
}