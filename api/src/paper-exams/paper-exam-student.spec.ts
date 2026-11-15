import type { GuideContent } from './paper-exam-guide';
import type { ItemStatus, PaperItem } from './paper-exam-logic';
import { checkGuide, guideStage, isMissed, publicGuide, type GuideRow } from './paper-exam-student';

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
  it('эхний харагдацад зөв хариу, бодолт, чанар алга', () => {
    const p = JSON.stringify(publicGuide(choice)) + JSON.stringify(publicGuide(fill));
    for (const secret of ['чанар', 'энгийн', 'алхам', '"answer"', '"value"']) {
      expect(p).not.toContain(secret);
    }
    expect(publicGuide(fill).content.fields).toEqual([
      { key: 'a', part: 0 },
      { key: 'b', part: 1 },
    ]);
  });

  it('шат шатаар нээгдэж, хариу хамгийн сүүлд', () => {
    expect(guideStage(choice, 0)).toMatchObject({ stage: 0, rule: undefined });
    expect(guideStage(choice, 1).rule).toEqual(['чанар']);
    expect(guideStage(choice, 2).easy).toEqual(['энгийн']);
    expect(guideStage(choice, 4)).toMatchObject({ steps: ['алхам 1'], answer: undefined });
    expect(guideStage(choice, 5)).toMatchObject({ steps: ['алхам 1', 'алхам 2'], answer: 'B' });
    expect(guideStage(choice, 99).stage).toBe(5);
    expect(guideStage(fill, 5).fields?.[0].value).toBe('2');
    expect(guideStage(fill, 4).fields).toBeUndefined();
  });

  it('алдсан бодлого л — 2-р хэсэгт аль нэг багц', () => {
    const st = (s: ItemStatus[]) => s;
    expect(isMissed(choice, items, st(['WRONG', 'CORRECT', 'CORRECT', 'CORRECT']))).toBe(true);
    expect(isMissed(choice, items, st(['CORRECT', 'WRONG', 'WRONG', 'WRONG']))).toBe(false);
    expect(isMissed(fill, items, st(['CORRECT', 'CORRECT', 'CORRECT', 'BLANK']))).toBe(true);
    expect(isMissed(fill, items, st(['WRONG', 'WRONG', 'CORRECT', 'CORRECT']))).toBe(false);
  });

  it('дахин оролдлогыг сервер шалгана', () => {
    expect(checkGuide(choice, 'b')).toEqual({ correct: true });
    expect(checkGuide(choice, 'C')).toEqual({ correct: false });
    expect(checkGuide(fill, { a: '2', b: '5' })).toEqual({ correct: true, parts: [true, true] });
    expect(checkGuide(fill, { a: '2', b: '4' })).toEqual({ correct: false, parts: [true, false] });
    expect(checkGuide(fill, null)).toEqual({ correct: false, parts: [false, false] });
  });
});
