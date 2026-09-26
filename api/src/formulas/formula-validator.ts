import katex from 'katex';
import { validateFormulaFile, extractDelimitedMath } from './formula-schema';

function isRawLatex(pathParts: string[]) {
  const key = pathParts[pathParts.length - 1];
  if (key === 'latex' || key === 'general' || pathParts.includes('conditions')) return true;
  return pathParts.includes('quiz') && pathParts.some((part) => ['prompt', 'answer', 'distractors'].includes(part));
}

function checkMath(value: unknown, pathParts: string[], errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkMath(item, [...pathParts, String(index)], errors));
    return;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value !== 'string') return;
    let expressions: string[];
    if (isRawLatex(pathParts)) {
      if (value.includes('$')) errors.push(`${pathParts.join('.')} must contain raw LaTeX without dollar delimiters`);
      expressions = [value.replace(/\\square/g, '\\boxed{?}')];
    } else {
      const extracted = extractDelimitedMath(value);
      for (const error of extracted.errors) errors.push(`${pathParts.join('.')} ${error}`);
      expressions = extracted.expressions;
    }
    for (const expression of expressions) {
      try { katex.renderToString(expression, { throwOnError: true, strict: 'ignore' }); }
      catch (error) { errors.push(`KaTeX rejected ${pathParts.join('.')} expression ${expression}: ${(error as Error).message}`); }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) checkMath(child, [...pathParts, key], errors);
}

export function validateFormulaMath(formula: unknown): string[] {
  const errors: string[] = [];
  checkMath(formula, [], errors);
  return errors;
}

export function validateFormulaPayload(formula: Record<string, unknown>, knownSlugs = new Set<string>()): string[] {
  const sectionSlug = typeof formula.section === 'string' ? formula.section : '';
  const result = validateFormulaFile({
    section: { slug: sectionSlug, title: sectionSlug, order: 0, icon: 'sigma', description: sectionSlug },
    formulas: [formula],
  }, knownSlugs);
  return [...result.errors, ...validateFormulaMath(formula)];
}
