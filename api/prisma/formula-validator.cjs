/* eslint-disable */
const fs = require('fs');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'Node16', moduleResolution: 'Node16', target: 'ES2022' });
require('ts-node/register/transpile-only');
const { validateFormulaFile } = require('../src/formulas/formula-schema.ts');
const { validateFormulaMath } = require('../src/formulas/formula-validator.ts');

function validateFormulaFiles(files) {
  const errors = [];
  const warnings = [];
  const parsed = [];
  for (const file of files) {
    try { parsed.push({ file, source: JSON.parse(fs.readFileSync(file, 'utf8')) }); }
    catch (error) { errors.push(`${file}: invalid JSON: ${error.message}`); }
  }
  const allSlugs = new Set();
  for (const { file, source } of parsed) {
    for (const formula of Array.isArray(source?.formulas) ? source.formulas : []) {
      if (formula && typeof formula === 'object' && typeof formula.slug === 'string') {
        if (allSlugs.has(formula.slug)) errors.push(`${file}: duplicate global slug ${formula.slug}`);
        allSlugs.add(formula.slug);
      }
    }
  }
  for (const { file, source } of parsed) {
    const result = validateFormulaFile(source, allSlugs);
    result.errors.forEach((error) => errors.push(`${file}: ${error}`));
    result.warnings.forEach((warning) => warnings.push(`${file}: ${warning}`));
    for (const formula of Array.isArray(source?.formulas) ? source.formulas : []) {
      if (formula && typeof formula === 'object') {
        for (const error of validateFormulaMath(formula)) errors.push(`${file} (${formula.slug ?? 'unknown'}): ${error}`);
      }
    }
  }
  return { errors, warnings, filesChecked: parsed.length, formulasChecked: parsed.reduce((sum, entry) => sum + (Array.isArray(entry.source?.formulas) ? entry.source.formulas.length : 0), 0) };
}
const { extractDelimitedMath } = require('../src/formulas/formula-schema.ts');
module.exports = { extractDelimitedMath, validateFormulaFiles };
