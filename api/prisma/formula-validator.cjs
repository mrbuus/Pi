/* eslint-disable */
const fs = require('fs');
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'Node16', moduleResolution: 'Node16', target: 'ES2022' });
require('ts-node/register/transpile-only');
const { validateFormulaFile, extractDelimitedMath } = require('../src/formulas/formula-schema.ts');
const katex = require('../../web/node_modules/katex');

function isRawLatex(pathParts) {
  const key = pathParts[pathParts.length - 1];
  if (key === 'latex' || key === 'general' || pathParts.includes('conditions')) return true;
  return pathParts.includes('quiz') && pathParts.some((part) => ['prompt', 'answer', 'distractors'].includes(part));
}

function checkMath(value, pathParts, file, slug, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkMath(item, [...pathParts, String(index)], file, slug, errors));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return;
    let expressions;
    if (isRawLatex(pathParts)) {
      if (value.includes('$')) errors.push(`${file} (${slug}): ${pathParts.join('.')} must contain raw LaTeX without dollar delimiters`);
      expressions = [value.replace(/\\square/g, '\\boxed{?}')];
    } else {
      const extracted = extractDelimitedMath(value);
      for (const error of extracted.errors) errors.push(`${file} (${slug}): ${pathParts.join('.')} ${error}`);
      expressions = extracted.expressions;
    }
    for (const expression of expressions) {
      try { katex.renderToString(expression, { throwOnError: true, strict: 'ignore' }); }
      catch (error) { errors.push(`${file} (${slug}): KaTeX rejected ${pathParts.join('.')} expression ${expression}: ${error.message}`); }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) checkMath(child, [...pathParts, key], file, slug, errors);
}

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
      if (formula && typeof formula === 'object') checkMath(formula, [], file, formula.slug ?? 'unknown', errors);
    }
  }
  return { errors, warnings, filesChecked: parsed.length, formulasChecked: parsed.reduce((sum, entry) => sum + (Array.isArray(entry.source?.formulas) ? entry.source.formulas.length : 0), 0) };
}
module.exports = { extractDelimitedMath, validateFormulaFiles };
