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

const SECTIONS = new Set([
  'numbers-algebra', 'equations-inequalities', 'functions-exp-log', 'trigonometry',
  'sequences-combinatorics-probability', 'calculus', 'plane-geometry',
  'solid-geometry-vectors-coordinates',
]);
const MATH_GLYPHS = /[π²³·×÷≤≥≠√∞∈αβ]/u;
type AnyRecord = Record<string, any>;

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
    if (typeof formula.title !== 'string' || !formula.title) errors.push(`${at}.title is required`);
    if (!Number.isInteger(formula.order)) errors.push(`${at}.order must be an integer`);
    if (!['CORE', 'EXTRA'].includes(formula.level)) errors.push(`${at}.level must be CORE or EXTRA`);
    if (!Number.isInteger(formula.grade) || formula.grade < 7 || formula.grade > 12) errors.push(`${at}.grade must be between 7 and 12`);
    for (const key of ['latex', 'general']) if (typeof formula[key] !== 'string' || !formula[key]) errors.push(`${at}.${key} is required`);
    if (!stringArray(formula.topicSlugs) || formula.topicSlugs.some((value: string) => !FORMULA_TOPICS.has(value))) errors.push(`${at}.topicSlugs contains an unknown topic`);
    for (const key of ['variants', 'conditions', 'derivation', 'examples', 'commonMistakes', 'quiz']) {
      if (!Array.isArray(formula[key])) errors.push(`${at}.${key} must be an array`);
    }
    if (!Array.isArray(formula.variants) || formula.variants.some((value: AnyRecord) => !value || typeof value.label !== 'string' || typeof value.latex !== 'string')) errors.push(`${at}.variants entries require label and latex`);
    if (!stringArray(formula.conditions)) errors.push(`${at}.conditions must be a string array`);
    if (!stringArray(formula.derivation)) errors.push(`${at}.derivation must be a string array`);
    if (!stringArray(formula.commonMistakes)) errors.push(`${at}.commonMistakes must be a string array`);
    if (!Array.isArray(formula.examples) || formula.examples.length < 2) errors.push(`${at}.examples requires at least 2`);
    for (const [exampleIndex, example] of (formula.examples ?? []).entries()) {
      if (!example || typeof example.problem !== 'string' || typeof example.answer !== 'string' || !stringArray(example.steps) || example.steps.length === 0) errors.push(`${at}.examples[${exampleIndex}] requires problem, steps, and answer`);
    }
    if (!Array.isArray(formula.quiz) || formula.quiz.length < 2) errors.push(`${at}.quiz requires at least 2`);
    for (const [quizIndex, quiz] of (formula.quiz ?? []).entries()) {
      if (!quiz || !['blank', 'truefalse'].includes(quiz.type) || typeof quiz.prompt !== 'string' || typeof quiz.answer !== 'string') errors.push(`${at}.quiz[${quizIndex}] has an invalid type, prompt, or answer`);
      else if (quiz.type === 'blank' && (!stringArray(quiz.distractors) || quiz.distractors.length < 2)) errors.push(`${at}.quiz[${quizIndex}] blank requires distractors`);
      else if (quiz.type === 'truefalse' && (typeof quiz.why !== 'string' || !['true', 'false'].includes(quiz.answer))) errors.push(`${at}.quiz[${quizIndex}] truefalse requires a boolean answer and why`);
    }
    if (formula.widget != null && (typeof formula.widget !== 'string' || !FORMULA_WIDGETS.has(formula.widget))) errors.push(`${at}.widget is unknown`);
    if (MATH_GLYPHS.test(JSON.stringify(formula))) errors.push(`${at} contains a prohibited Unicode math glyph`);
    if (!stringArray(formula.related) || formula.related.length === 0) warnings.push(`${at}.related has no references`);
    if (!stringArray(formula.keywords)) errors.push(`${at}.keywords must be a string array`);
    for (const key of ['explanation', 'mnemonic', 'eeshTip']) if (typeof formula[key] !== 'string') errors.push(`${at}.${key} must be a string`);
  }
  for (const formula of data.formulas) {
    for (const related of formula?.related ?? []) if (!slugs.has(related) && !knownSlugs.has(related)) errors.push(`${formula.slug} references missing formula ${related}`);
  }
  return { errors, warnings };
}
