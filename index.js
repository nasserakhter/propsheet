const path = require('path');
const fs = require('fs');

const propFile = path.resolve(process.argv[2]);

let content = fs.readFileSync(propFile);
if (String.fromCharCode(content[content.length - 1]) !== '\n') {
	content = Buffer.concat([content, Buffer.from('\n')]);
}

// temp buffer is for characters that have no meaning.
// it allows to to accumulate here
let tempBuffer = "";
let append = true;
// the //
let comment = false;
// the !
let section = false;
// the @
let directive = false;
let propsheetVersion = -1;
// the ^
let injection = false;

let currentSection = null;

const obj = {};
try {
	for (i = 0; i < content.length; i++) {
		const char = String.fromCharCode(content[i]);

		switch (char) {
			case "\n":
				if (injection) {
					// to stop other things from happening
				} else if (directive) {
					directive = false;
					const [name, value] = tempBuffer.split(' ');
					switch (name) {
						case "propsheet":
							if (propsheetVersion !== -1) {
								throw new Error('Duplicate propsheet version specifier');
							} else if (value[0] === 'v') {
								propsheetVersion = +value.slice(1);
							}
							break;
						default:
							throw new Error(`Unknown directive: ${name}`);
							break;
					}
				} else if (comment) {
					comment = false;
				} else if (section) {
					section = false;
					currentSection = tempBuffer;
					obj[tempBuffer] = null;
				} else if (tempBuffer.indexOf('|') > -1) {
					// object value
					// or array
					const sepPos = tempBuffer.indexOf('|');
					// name will be trimmed
					const name = tempBuffer.slice(0, sepPos).trim();
					if (!name[0].match(/[a-zA-Z\_]/g)) {
						throw new Error('Property name must start with a letter or underscore');
					}
					if (!name.match(/^[a-zA-Z0-9\_\-]+$/g)) {
						throw new Error('Property name must only contain letters, numbers, underscores, and dashes');
					}
					// value will only be trimmed for one space after sep
					let value = tempBuffer.slice(sepPos + 1);
					if (value.indexOf('\n') > -1) {
						value = value.replace(/^\s*|\s$/gm, '');
					} else if (value[0] === ' ') {
						value = value.slice(1);
					}

					if (obj[currentSection] === null) {
						// first value, this will determine what the datatype is
						if (name.length) {
							// this is an object
							obj[currentSection] = {};
						} else {
							// this is an array
							obj[currentSection] = [];
						}
					}

					if (value.length === 0 || value === 'null') {
						value = null;
					} else if (value === 'undefined') {
						value = undefined;
					} else if (value[0] !== ' ' && !isNaN(+value.replace(',', ''))) {
						value = +value.replace(',', '');
					} else if (value === 'true') {
						value = true;
					} else if (value === 'false') {
						value = false;
					}

					if (Array.isArray(obj[currentSection])) {
						if (name.length !== 0) {
							throw new Error('Array cannot have named values');
						}
						obj[currentSection].push(value);
					} else {
						if (name.length === 0) {
							throw new Error('Object must have named values');
						}
						if (obj[currentSection][name] !== undefined) {
							throw new Error('Object cannot have duplicate names');
						}
						obj[currentSection][name] = value;
					}
				}
				if (injection) {
					append = true;
				} else {
					tempBuffer = "";
					append = false;
				}
				break;

			case "!":
				if (tempBuffer.length === 0) {
					section = true;
					append = false;
				}
				break;

			case "^":
				if (!comment) {
					injection = !injection;
					append = false;
				}
				break;

			case "/":
				if (tempBuffer.length === 1 && tempBuffer[0] === "/")
					comment = true;
				break;

			case "@":
				if (tempBuffer.length === 0) {
					directive = true;
					append = false;
				}
				break;
		}
		if (append && !comment) tempBuffer += char;

		append = true;
	}

	if (propsheetVersion === -1) {
		//throw new Error('No propsheet version specified');
		propsheetVersion = 0.1;
	}
	console.log('Propsheet Version:', propsheetVersion);
	console.dir(obj);
} catch (e) {
	console.error(e.message);
}
