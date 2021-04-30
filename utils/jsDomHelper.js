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
		if (str[currentIndex] === '{')
			openIdx.push(currentIndex);
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

function read(fileName, isLayout = false) {
	let fileData = fs.readFileSync(fileName, 'utf8');

	if(!fileData)
		throw new Error("Unable to read the file: " + fileName.split("/workspace/").pop());

	// Comment `dustjs` elements. We need to comment them to allow jsdom to parse the file correctly
	fileData = commentDust(fileData);
	// Force quote and double quote order in placeholders. jsDom autmaticaly change `placeholder=''`to `placeholder=""`
	// Html parsing breaks if double quotes are used to give the translation key `key=""`
	// Force double quote around, simple quote inside. Change it back when writing to document
	fileData = fileData.replace(/placeholder=["'](.+?)["'](.+?)["'](.+?)["']/g, 'placeholder="$1\'$2\'$3"');

	// Wrap data in <body> tag to provide upper level when writing
	if(!isLayout)
		fileData = "<body>"+fileData+"</body>";

	const { window } = new JSDOM(fileData);
	const $ = jquery(window);
	return $;
}
exports.read = read;

function write(fileName, $) {
	let newFileData = $("body")[0].innerHTML;

	// Fix a bug caused by JSDOM that append &nbsp; at the beginning of the document
	if (newFileData.substring(0, 6) == "&nbsp;")
		newFileData = newFileData.substring(6);

	// Replace escaped characters and script inclusion
	newFileData = newFileData.replace(/&gt;/g, '>');
	newFileData = newFileData.replace(/&lt;/g, '<');
	newFileData = newFileData.replace(/&quot;/g, "\"");
	newFileData = newFileData.replace('<script class="jsdom" src="http://code.jquery.com/jquery.js"></script>', '');

	// Fix beautify
	newFileData = newFileData.replace(/{#__/g, '{__');
	// Indent generated html
	newFileData = beautify(newFileData, {
		indent_size: 4,
		indent_char: " ",
		indent_with_tabs: false
	});
	newFileData = newFileData.replace(/{__/g, '{#__');

	// Uncomment dust tags
	newFileData = newFileData.replace(/<!--{/g, "{")
	newFileData = newFileData.replace(/}-->/g, "}")

	// Put back simple quote around, double quote inside for placeholders
	newFileData = newFileData.replace(/placeholder="(.+?)["'](.+?)["'](.+?)"/g, 'placeholder=\'$1"$2"$3\'');

	// Write back to file
	fs.writeFileSync(fileName, newFileData, 'utf8');
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

exports.replace = async (filename, element, $insert) => {
	const $ = await read(filename);
	$(element).replaceWith($insert(element));
	write(filename, $);
}

exports.insertHtml = async (filename, element, html) => {
	const $ = await read(filename);
	$(element).html(html);
	write(filename, $);
}

exports.writeMainLayout = (fileName, $) => {

	let newFileData = "<!DOCTYPE html>";
	newFileData += $("html")[0].outerHTML;

	// Replace escaped characters and script inclusion
	newFileData = newFileData.replace(/&gt;/g, '>');
	newFileData = newFileData.replace(/&lt;/g, '<');
	newFileData = newFileData.replace(/&quot;/g, "\"");
	newFileData = newFileData.replace('<script class="jsdom" src="http://code.jquery.com/jquery.js"></script>', '');

	// Fix beautify
	// newFileData = newFileData.replace(/{#__/g, '{__');
	// Indent generated html
	newFileData = beautify(newFileData, {
		indent_size: 4,
		indent_char: " ",
		indent_with_tabs: false
	});
	// newFileData = newFileData.replace(/{__/g, '{#__');

	// Uncomment dust tags
	// newFileData = newFileData.replace(/<!--({[<>@^:#/].+?})-->/g, '$1');
	newFileData = newFileData.replace(/<!--{/g, "{")
	newFileData = newFileData.replace(/}-->/g, "}")

	// Put back simple quote around, double quote inside for placeholders
	newFileData = newFileData.replace(/placeholder="(.+?)["'](.+?)["'](.+?)"/g, 'placeholder=\'$1"$2"$3\'');

	// Write back to file
	fs.writeFileSync(fileName, newFileData);
}