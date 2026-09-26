export const FORMULA_TOPICS = new Set([
  'TOO', 'ALG', 'RATEQ', 'RATINEQ', 'ABSEQ', 'ABSINEQ', 'IRREQ', 'IRRINEQ',
  'EXPEQ', 'EXPINEQ', 'LOGEXP', 'LOGEQ', 'LOGINEQ', 'FUNC', 'TRIG', 'TRIGEQ',
  'SEQ', 'COMB', 'PROB', 'STAT', 'LIMIT', 'DERIV', 'INTEG', 'PLANE', 'SOLID',
  'VECTOR', 'COORD', 'SYSTEM', 'PARAM',
]);

export const FORMULA_WIDGETS = new Set([
  'square-of-sum', 'difference-of-squares', 'quadratic-graph', 'vieta', 'abs-graph',
  'exp-graph', 'log-graph', 'unit-circle', 'sine-graph', 'arith-seq', 'geom-seq',
  'pascal-triangle', 'probability-dice', 'derivative-tangent', 'integral-area',
  'pythagoras', 'triangle-area', 'inscribed-angle', 'circle-sector', 'prism-volume',
  'cone-cylinder', 'vector-add', 'line-slope',
]);

export const FORMULA_SECTIONS = [
  'numbers-algebra', 'equations-inequalities', 'functions-exp-log', 'trigonometry',
  'sequences-combinatorics-probability', 'calculus', 'plane-geometry',
  'solid-geometry-vectors-coordinates',
] as const;
const SECTIONS = new Set<string>(FORMULA_SECTIONS);
const MATH_GLYPHS = /[π²³·×÷≤≥≠√∞∈αβ]/u;
type AnyRecord = Record<string, any>;

export function extractDelimitedMath(text: string): { expressions: string[]; errors: string[] } {
  const expressions: string[] = [];
  const errors: string[] = [];
  let open: { index: number; length: number } | null = null;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '$' || (i > 0 && text[i - 1] === '\\')) continue;
    const length = text[i + 1] === '$' ? 2 : 1;
    const index = i;
    if (length === 2) i++;
    if (!open) open = { index, length };
    else if (open.length === length) {
      expressions.push(text.slice(open.index + length, index));
      open = null;
    } else errors.push('mixed inline and display math delimiters');
  }
  if (open) errors.push('unbalanced math delimiter');
  return { expressions, errors };
}


export function validateFormulaFile(json: unknown, knownSlugs: Set<string> = new Set()): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data = json as AnyRecord;
  if (!data || typeof data !== 'object' || !data.section || !Array.isArray(data.formulas)) {
    return { errors: ['Expected section and formulas array'], warnings };
  }
  if (!SECTIONS.has(data.section.slug)) errors.push(`Unknown section slug: ${data.section.slug}`);
  if (typeof data.section.title !== 'string' || !Number.isInteger(data.section.order) || typeof data.section.icon !== 'string' || typeof data.section.description !== 'string') errors.push('Section requires title, integer order, icon, and description');
  const slugs = new Set<string>();
  const stringArray = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string');
  for (const [index, formula] of data.formulas.entries()) {
    const at = `formulas[${index}]`;
    if (!formula || typeof formula !== 'object') { errors.push(`${at} must be an object`); continue; }
    if (typeof formula.slug !== 'string') errors.push(`${at}.slug must match [a-z0-9-]`);
    else {
      if (!/^[a-z0-9-]+$/.test(formula.slug)) errors.push(`${at}.slug must match [a-z0-9-]`);
      if (slugs.has(formula.slug)) errors.push(`Duplicate formula slug: ${formula.slug}`);
      slugs.add(formula.slug);
    }
    if (typeof formula.title !== 'string' || formula.title.length < 1 || formula.title.length > 200) errors.push(`${at}.title must be 1-200 characters`);
    if (!Number.isInteger(formula.order) || formula.order < 0 || formula.order > 10000) errors.push(`${at}.order must be an integer from 0 to 10000`);
    if (!['CORE', 'EXTRA'].includes(formula.level)) errors.push(`${at}.level must be CORE or EXTRA`);
    if (!Number.isInteger(formula.grade) || formula.grade < 7 || formula.grade > 12) errors.push(`${at}.grade must be between 7 and 12`);
    for (const key of ['latex', 'general']) if (typeof formula[key] !== 'string' || formula[key].length < 1 || formula[key].length > 1000) errors.push(`${at}.${key} must be 1-1000 characters`);
    if (!stringArray(formula.topicSlugs) || formula.topicSlugs.length < 1 || formula.topicSlugs.length > 20 || formula.topicSlugs.some((value: string) => !FORMULA_TOPICS.has(value))) errors.push(`${at}.topicSlugs contains an unknown topic or is outside its size bounds`);
    for (const key of ['variants', 'conditions', 'derivation', 'examples', 'commonMistakes', 'quiz']) {
      if (!Array.isArray(formula[key])) errors.push(`${at}.${key} must be an array`);
    }
    if (!Array.isArray(formula.variants) || formula.variants.length > 20 || formula.variants.some((value: AnyRecord) => !value || typeof value.label !== 'string' || value.label.length < 1 || value.label.length > 120 || typeof value.latex !== 'string' || value.latex.length < 1 || value.latex.length > 500)) errors.push(`${at}.variants entries require bounded label and latex strings`);
    if (!stringArray(formula.conditions) || formula.conditions.length > 30 || formula.conditions.some((value: string) => value.length < 1 || value.length > 200)) errors.push(`${at}.conditions must be a bounded string array`);
    if (!stringArray(formula.derivation) || formula.derivation.length < 2 || formula.derivation.length > 6 || formula.derivation.some((value: string) => value.length < 1 || value.length > 2000)) errors.push(`${at}.derivation must have 2-6 bounded strings`);
    if (!stringArray(formula.commonMistakes) || formula.commonMistakes.length > 30 || formula.commonMistakes.some((value: string) => value.length < 1 || value.length > 500)) errors.push(`${at}.commonMistakes must be a bounded string array`);
    if (!Array.isArray(formula.examples) || formula.examples.length < 2 || formula.examples.length > 30) errors.push(`${at}.examples requires 2-30 items`);
    for (const [exampleIndex, example] of (formula.examples ?? []).entries()) {
      if (!example || typeof example.problem !== 'string' || example.problem.length < 1 || example.problem.length > 2000 || typeof example.answer !== 'string' || example.answer.length < 1 || example.answer.length > 1000 || !stringArray(example.steps) || example.steps.length < 1 || example.steps.length > 20 || example.steps.some((step: string) => step.length < 1 || step.length > 2000)) errors.push(`${at}.examples[${exampleIndex}] requires bounded problem, steps, and answer`);
    }
    if (!Array.isArray(formula.quiz) || formula.quiz.length < 2 || formula.quiz.length > 50) errors.push(`${at}.quiz requires 2-50 items`);
    for (const [quizIndex, quiz] of (formula.quiz ?? []).entries()) {
      if (!quiz || !['blank', 'truefalse'].includes(quiz.type) || typeof quiz.prompt !== 'string' || typeof quiz.answer !== 'string') errors.push(`${at}.quiz[${quizIndex}] has an invalid type, prompt, or answer`);
      else if (quiz.type === 'blank' && (!stringArray(quiz.distractors) || quiz.distractors.length < 2 || quiz.distractors.length > 10 || quiz.distractors.some((value: string) => value.length < 1 || value.length > 500))) errors.push(`${at}.quiz[${quizIndex}] blank requires bounded distractors`);
      else if (quiz.type === 'truefalse' && (typeof quiz.why !== 'string' || !['true', 'false'].includes(quiz.answer))) errors.push(`${at}.quiz[${quizIndex}] truefalse requires a boolean answer and why`);
    }
    if (formula.widget != null && (typeof formula.widget !== 'string' || !FORMULA_WIDGETS.has(formula.widget))) errors.push(`${at}.widget is unknown`);
    if (MATH_GLYPHS.test(JSON.stringify(formula))) errors.push(`${at} contains a prohibited Unicode math glyph`);
    if (!stringArray(formula.related) || formula.related.length < 1 || formula.related.length > 30 || formula.related.some((value: string) => !/^[a-z0-9-]{1,120}$/.test(value))) errors.push(`${at}.related must contain bounded formula slugs`);
    if (!stringArray(formula.keywords) || formula.keywords.length < 1 || formula.keywords.length > 50 || formula.keywords.some((value: string) => value.length < 1 || value.length > 120)) errors.push(`${at}.keywords must be a bounded string array`);
    for (const key of ['explanation', 'mnemonic', 'eeshTip']) if (typeof formula[key] !== 'string' || formula[key].length < 1 || formula[key].length > (key === 'explanation' ? 3000 : 1000)) errors.push(`${at}.${key} must be a bounded nonempty string`);
    if (!Object.hasOwn(formula, 'widget') || (formula.widget !== null && (typeof formula.widget !== 'string' || !FORMULA_WIDGETS.has(formula.widget)))) errors.push(`${at}.widget must be null or a known widget`);
  }
  for (const formula of data.formulas) {
    for (const related of formula?.related ?? []) if (!slugs.has(related) && !knownSlugs.has(related)) errors.push(`${formula.slug} references missing formula ${related}`);
  }
  return { errors, warnings };
}
