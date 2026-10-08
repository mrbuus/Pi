import { gradeAnswer } from './grading';
import { TestsService } from './tests.service';

describe('TestsService session autosave', () => {
  const service = new TestsService({} as never, {} as never);
  const mergeDrafts = (
    service as unknown as {
      mergeDrafts: (
        problems: {
          problemId: string;
          problem?: { format: string; correctAnswer: unknown };
        }[],
        session: unknown,
        dto: unknown,
      ) => { answers: Record<string, unknown> };
    }
  ).mergeDrafts.bind(service);

  const baseSession = {
    draftAnswers: {},
    draftStates: {},
    problemTimes: {},
    leaveCount: 0,
    events: [],
  };

  it('олон нүхт FILL_NUMBER хариуг JSON бүтцээр нь хадгална', () => {
    const merged = mergeDrafts(
      [
        {
          problemId: 'fill-1',
          problem: {
            format: 'FILL_NUMBER',
            correctAnswer: { a: '3', bc: '54' },
          },
        },
      ],
      baseSession,
      {
        answers: { 'fill-1': { a: '3', bc: '54' } },
      },
    );

    expect(merged.answers).toEqual({ 'fill-1': { a: '3', bc: '54' } });
  });

  it('nested эсвэл array хариуг session JSON-д оруулахгүй', () => {
    const merged = mergeDrafts(
      [
        {
          problemId: 'fill-1',
          problem: {
            format: 'FILL_NUMBER',
            correctAnswer: { a: '3', bc: '54' },
          },
        },
      ],
      baseSession,
      {
        answers: { 'fill-1': { a: ['3'] } },
      },
    );

    expect(merged.answers).toEqual({});
  });
  it('rejects foreign slots and prototype keys while preserving a saved valid answer', () => {
    const refs = [
      {
        problemId: 'fill-1',
        problem: { format: 'FILL_NUMBER', correctAnswer: { a: '3', bc: '54' } },
      },
    ];
    for (const answer of [
      { foreign: '3' },
      JSON.parse('{"__proto__":"3"}'),
      { a: 'x'.repeat(1001) },
    ]) {
      const merged = mergeDrafts(refs, baseSession, {
        answers: { 'fill-1': answer },
      });
      expect(merged.answers).toEqual({});
    }
    const saved = mergeDrafts(refs, baseSession, {
      answers: { 'fill-1': { a: '3', bc: '54' } },
    });
    const reloaded = mergeDrafts(
      refs,
      { ...baseSession, draftAnswers: saved.answers },
      {},
    );
    expect(reloaded.answers).toEqual(saved.answers);
    expect(
      gradeAnswer(
        {
          id: 'fill-1',
          format: 'FILL_NUMBER',
          correctAnswer: { a: '3', bc: '54' },
          choices: null,
        },
        reloaded.answers['fill-1'],
        undefined,
      ).correct,
    ).toBe(true);
  });
});
