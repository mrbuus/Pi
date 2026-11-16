import type { GuideContent } from './paper-exam-guide';
import type { ItemStatus, PaperItem } from './paper-exam-logic';
import { isMissed, studentGuide, type GuideRow } from './paper-exam-student';

const base: Omit<GuideContent, 'kind'> = {
  points: 2,
  statement: ['$x+1=2$'],
  rule: ['чанар'],
  easy: ['энгийн'],
  refs: [{ chapter: 'Тоо тоолол', test: 1, number: '4', text: 'т' }],
  steps: ['алхам 1', 'алхам 2'],
  topic: 'Тоо тоолол',
};
const choice: GuideRow = {
  label: '3',
  number: 3,
  content: { ...base, kind: 'choice', choices: ['1', '2', '3', '4', '5'], answer: 'B' },
};
const fill: GuideRow = {
  label: 'II.1',
  number: null,
  content: {
    ...base,
    kind: 'fill',
    fields: [
      { key: 'a', value: '2', part: 0 },
      { key: 'b', value: '5', part: 1 },
    ],
    parts: [{ points: 2 }, { points: 3 }],
  },
};
const item = (number: number, label: string | null = null): PaperItem => ({
  number,
  answerKey: 'A',
  points: 1,
  area: null,
  voided: false,
  label,
});
const items = [item(3), item(4), item(37, '2.1.a-b'), item(38, '2.1.c')];

describe('сурагчийн тайлбар', () => {
  it('сурагчид зөвхөн жагсаасан талбар очно', () => {
    const extra = { ...choice, content: { ...choice.content, secret: 'x' } } as unknown as GuideRow;
    const out = studentGuide(extra);
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(out.content).toEqual(choice.content);
    expect(studentGuide(fill).content).toEqual(fill.content);
  });

  it('алдсан бодлого л — 2-р хэсэгт аль нэг багц', () => {
    const st = (s: ItemStatus[]) => s;
    expect(isMissed(choice, items, st(['WRONG', 'CORRECT', 'CORRECT', 'CORRECT']))).toBe(true);
    expect(isMissed(choice, items, st(['CORRECT', 'WRONG', 'WRONG', 'WRONG']))).toBe(false);
    expect(isMissed(fill, items, st(['CORRECT', 'CORRECT', 'CORRECT', 'BLANK']))).toBe(true);
    expect(isMissed(fill, items, st(['WRONG', 'WRONG', 'CORRECT', 'CORRECT']))).toBe(false);
  });
});
