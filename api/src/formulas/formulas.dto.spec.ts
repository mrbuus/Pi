import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FormulaDto } from './dto/formula.dto';
import { FormulaQueryDto, FormulaStudentQueryDto } from './dto/formula-query.dto';

const payload = {
  slug: 'trig-example', title: 'Жишээ томьёо', section: 'trigonometry', order: 1,
  level: 'CORE', grade: 10, topicSlugs: ['TRIG'], latex: '\\sin x', general: '\\sin t',
  variants: [{ label: 'Нөгөө хэлбэр', latex: '\\cos x' }], conditions: [],
  explanation: 'Тайлбар', derivation: ['Эхний алхам', 'Хоёр дахь алхам'], mnemonic: 'Санах арга',
  examples: [
    { problem: 'Бодлого $\\sin x=1$', steps: ['Алхам нэг'], answer: '$1$' },
    { problem: 'Бодлого хоёр', steps: ['Алхам нэг'], answer: '$2$' },
  ],
  commonMistakes: [], eeshTip: 'ЭЕШ зөвлөгөө', related: ['trig-related'], keywords: ['синус'], widget: null,
  quiz: [
    { type: 'blank', prompt: '\\sin x = \\square', answer: '1', distractors: ['0', '2'] },
    { type: 'truefalse', prompt: '\\sin^2 x + \\cos^2 x = 1', answer: 'true', why: 'Үндсэн адилтгал' },
  ],
};

function messages(errors: Awaited<ReturnType<typeof validate>>) {
  return JSON.stringify(errors);
}

describe('formula DTO validation', () => {
  it('validates search and optional student query fields', async () => {
    expect(await validate(plainToInstance(FormulaQueryDto, { level: 'CORE', grade: 11 }))).toHaveLength(0);
    expect(await validate(plainToInstance(FormulaStudentQueryDto, { studentId: 'student-1' }))).toHaveLength(0);
    expect((await validate(plainToInstance(FormulaQueryDto, { level: 'BAD', grade: 99 }))).length).toBeGreaterThan(0);
  });
  it('accepts a complete, nested formula payload', async () => {
    expect(await validate(plainToInstance(FormulaDto, payload))).toHaveLength(0);
  });
  it('rejects absent full-contract fields and invalid nested examples or quiz discriminators', async () => {
    const missing = await validate(plainToInstance(FormulaDto, {}));
    expect(missing.length).toBeGreaterThan(0);
    const invalid = { ...payload, examples: [{ problem: '', steps: [''], answer: '' }, payload.examples[1]], quiz: [{ type: 'other', prompt: '', answer: '', distractors: [] }, { type: 'blank', prompt: 'x', answer: 'y' }] };
    const invalidErrors = messages(await validate(plainToInstance(FormulaDto, invalid)));
    expect(invalidErrors).toMatch(/length|matches|isIn|arrayMinSize/i);
    const badBlank = await validate(plainToInstance(FormulaDto, { ...payload, quiz: [{ type: 'blank', prompt: 'x', answer: 'y' }, payload.quiz[1]] }));
    const badTrueFalse = await validate(plainToInstance(FormulaDto, { ...payload, quiz: [payload.quiz[0], { type: 'truefalse', prompt: 'x', answer: 'true' }] }));
    expect(JSON.stringify(badBlank)).toMatch(/defined|distractors/i);
    expect(JSON.stringify(badTrueFalse)).toMatch(/defined|why/i);
  });
});
