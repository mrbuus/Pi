/* eslint-disable */
const fs = require('fs');
const path = require('path');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'Node16', moduleResolution: 'Node16', target: 'ES2022' });
require('ts-node/register/transpile-only');
const { validateFormulaFile } = require('../src/formulas/formula-schema.ts');
const katex = require('../../web/node_modules/katex');

function mathSegments(value, key = '') {
  if (Array.isArray(value)) return value.flatMap((item) => mathSegments(item, key));
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return [];
    if (['latex', 'general', 'conditions', 'answer', 'distractors', 'prompt'].includes(key)) return [value.replace(/^\$(.*)\$$/s, '$1').replace(/\\square/g, '\\boxed{?}')];
    return [...value.matchAll(/\$(.+?)\$/gs)].map((match) => match[1]);
  }
  return Object.entries(value).flatMap(([childKey, child]) => mathSegments(child, childKey));
}

const supplied = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const directory = path.join(__dirname, 'data', 'formulas');
const files = (supplied.length ? supplied : fs.existsSync(directory) ? fs.readdirSync(directory).filter((name) => name.endsWith('.json')).map((name) => path.join(directory, name)) : [])
  .filter((file) => path.basename(file).endsWith('.json'));
let failed = false;
const parsed = files.map((file) => ({ file, source: JSON.parse(fs.readFileSync(file, 'utf8')) }));
const allSlugs = new Set();
for (const { file, source } of parsed) for (const formula of source.formulas || []) {
  if (allSlugs.has(formula.slug)) { console.error(`${file}: duplicate global slug ${formula.slug}`); failed = true; }
  allSlugs.add(formula.slug);
}
for (const { file, source } of parsed) {
  const result = validateFormulaFile(source, allSlugs);
  for (const error of result.errors) { console.error(`${file}: ${error}`); failed = true; }
  for (const warning of result.warnings) console.warn(`${file}: warning: ${warning}`);
  for (const formula of source.formulas || []) {
    for (const expression of mathSegments(formula)) {
      try { katex.renderToString(expression, { throwOnError: true, strict: 'ignore' }); }
      catch (error) { console.error(`${file} (${formula.slug}): KaTeX rejected ${expression}: ${error.message}`); failed = true; }
    }
  }
}
if (!files.length) console.log('No formula JSON files found.');
console.log(`${files.length} formula file(s) checked.`);
process.exit(failed ? 1 : 0);
