import { extractDelimitedMath, validateFormulaFile } from './formula-schema';

function validFormula(slug: string, title: string, related: string) { return { slug, title, order: 1, level: 'CORE', grade: 10, latex: '\\cos x', general: '\\cos x', topicSlugs: ['TRIG'], variants: [], conditions: [], derivation: ['Алхам 1', 'Алхам 2'], explanation: 'Тайлбар', mnemonic: 'Санах арга', eeshTip: 'ЭЕШ зөвлөгөө', examples: [{ problem: 'P1', steps: ['Алхам'], answer: 'A1' }, { problem: 'P2', steps: ['Алхам'], answer: 'A2' }], quiz: [{ type: 'blank', prompt: 'Q1', answer: 'A1', distractors: ['X', 'Y'] }, { type: 'truefalse', prompt: 'Q2', answer: 'true', why: 'Учир' }], commonMistakes: [], related: [related], keywords: ['үг'], widget: null }; }

const valid = { section: { slug: 'trigonometry', title: 'Тригонометр', order: 4, icon: 'triangle-right', description: 'Үндсэн холбоо' }, formulas: [
  { slug: 'trig-sin', title: 'Синус', order: 1, level: 'CORE', grade: 10, latex: '\\sin x', general: '\\sin x', topicSlugs: ['TRIG'], variants: [], conditions: [], derivation: ['Алхам 1', 'Алхам 2'], explanation: 'Тайлбар', mnemonic: 'Санах арга', eeshTip: 'ЭЕШ зөвлөгөө', examples: [{ problem: 'P1', steps: ['Алхам'], answer: 'A1' }, { problem: 'P2', steps: ['Алхам'], answer: 'A2' }], quiz: [{ type: 'blank', prompt: 'Q1', answer: 'A1', distractors: ['X', 'Y'] }, { type: 'truefalse', prompt: 'Q2', answer: 'true', why: 'Учир' }], commonMistakes: [], related: ['trig-cos'], keywords: ['синус'], widget: null },
  { ...validFormula('trig-cos', 'Косинус', 'trig-sin') },
] };

describe('validateFormulaFile', () => {
  it('accepts a valid section and related formulas', () => expect(validateFormulaFile(valid).errors).toEqual([]));
  it('rejects duplicate and malformed slugs, missing examples and quizzes', () => {
    const result = validateFormulaFile({ ...valid, formulas: [valid.formulas[0], { ...valid.formulas[0] }, { ...valid.formulas[0], slug: 'bad slug', examples: [], quiz: [] }] });
    expect(result.errors.join(' ')).toMatch(/Duplicate formula slug/);
    expect(result.errors.join(' ')).toMatch(/slug must/);
    expect(result.errors.join(' ')).toMatch(/examples requires/);
    expect(result.errors.join(' ')).toMatch(/quiz requires/);
  });
  it('rejects unknown topics, widgets, missing related slugs and Unicode math glyphs', () => {
    const result = validateFormulaFile({ ...valid, formulas: [{ ...valid.formulas[0], topicSlugs: ['NOPE'], widget: 'unknown', latex: 'π', related: ['missing'] }] });
    expect(result.errors.join(' ')).toMatch(/unknown topic/);
    expect(result.errors.join(' ')).toMatch(/widget is unknown/);
    expect(result.errors.join(' ')).toMatch(/prohibited Unicode/);
    expect(result.errors.join(' ')).toMatch(/references missing/);
  });
  it('rejects reserved route slugs, invalid truefalse answers, and non-distinct answer distractors', () => {
    const formula = valid.formulas[0];
    const result = validateFormulaFile({ ...valid, formulas: [{ ...formula, slug: 'my', quiz: [{ type: 'truefalse', prompt: 'Q', answer: 'abc', why: 'because' }, { type: 'blank', prompt: 'Q', answer: 'x', distractors: ['x', 'x'] }] }] });
    expect(result.errors.join(' ')).toMatch(/non-reserved hyphenated slug/);
    expect(result.errors.join(' ')).toMatch(/boolean answer/);
    expect(result.errors.join(' ')).toMatch(/distractors must be distinct/);
  });
});

describe('extractDelimitedMath', () => {
  it('extracts inline and display math and reports unbalanced delimiters', () => {
    expect(extractDelimitedMath('Текст $x^2$ ба $$\\frac{1}{2}$$')).toEqual({ expressions: ['x^2', '\\frac{1}{2}'], errors: [] });
    expect(extractDelimitedMath('Хариу $x')).toEqual({ expressions: [], errors: ['unbalanced math delimiter'] });
  });
});
