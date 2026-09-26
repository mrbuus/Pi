/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { validateFormulaFiles } = require('./formula-validator.cjs');
const supplied = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const directory = path.join(__dirname, 'data', 'formulas');
const files = (supplied.length ? supplied : fs.existsSync(directory) ? fs.readdirSync(directory).filter((name) => name.endsWith('.json')).map((name) => path.join(directory, name)) : [])
  .filter((file) => path.basename(file).endsWith('.json'));
const result = validateFormulaFiles(files);
result.errors.forEach((error) => console.error(error));
result.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
if (!files.length) console.log('No formula JSON files found.');
console.log(`${result.filesChecked} formula file(s), ${result.formulasChecked} formula(s) checked.`);
process.exit(result.errors.length ? 1 : 0);
