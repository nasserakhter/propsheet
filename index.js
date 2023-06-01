const path = require('path');
const fs = require('fs');

const propFile = path.resolve(process.argv[2]);

const content = fs.readFileSync(propFile);

// temp buffer is for characters that have no meaning.
// it allows to to accumulate here
let tempBuffer = "";
let append = true;
let comment = false;
let section = false;
let directive = false;
let propsheetVersion = 0;

let currentSection = null;

const obj = {}; 

for (i = 0; i < content.length; i++) {
	const char = String.fromCharCode(content[i]);

	switch (char) {
		case "\n":
			if (directive) {
				directive = false;
				const [name, value] = tempBuffer.split(' ');
				switch (name) {
					case "propsheet":
						if (value[0] === 'v') {
							propsheetVersion = +value.slice(1);
						}
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
				// value will only be trimmed for one space after sep
				let value = tempBuffer.slice(sepPos + 1);
				if (value[0] === ' ') {
					value = value.slice(1);
				}

				// what is the current type?
			}
			tempBuffer = "";
			append = false;
			break;

		case "!":
			if (tempBuffer.length === 0) {
				section = true;
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

console.log('Propsheet Version:', propsheetVersion);
console.dir(obj);
