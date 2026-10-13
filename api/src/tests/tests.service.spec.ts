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

describe('TestsService сурагчийн харагдац — сонголтын зураг', () => {
  const service = new TestsService({} as never, {} as never);
  const build = (
    service as unknown as {
      buildProblemViews: (
        problems: unknown[],
        session: unknown,
      ) => { choices: string[] | null; choiceImages: (string | null)[] | null }[];
    }
  ).buildProblemViews.bind(service);
  const row = (options: { order: number; text: string; isCorrect: boolean; imageKey?: string | null }[]) => ({
    problemId: 'p1',
    order: 1,
    points: 1,
    problem: {
      id: 'p1',
      format: 'CHOICE',
      statementText: 'График аль нь вэ?',
      imageKey: null,
      choices: null,
      correctAnswer: '',
      attemptCount: 0,
      correctRate: null,
      choiceOptions: options,
      chapter: { id: 'c', title: 'c' },
    },
  });

  it('холилдсон дараалалд зураг текстийнхээ хамт шилжинэ', () => {
    const [view] = build(
      [
        row([
          { order: 1, text: '', isCorrect: false, imageKey: 'a.png' },
          { order: 2, text: '', isCorrect: true, imageKey: 'b.png' },
          { order: 3, text: 'x', isCorrect: false, imageKey: null },
        ]),
      ],
      { problemOrder: ['p1'], choiceOrder: { p1: [2, 0, 1] } },
    );
    expect(view.choices).toEqual(['x', '', '']);
    expect(view.choiceImages).toEqual([null, 'a.png', 'b.png']);
    expect(JSON.stringify(view)).not.toMatch(/isCorrect/);
  });

  it('зураггүй бодлогод choiceImages null', () => {
    const [view] = build(
      [row([{ order: 1, text: '1', isCorrect: true }, { order: 2, text: '2', isCorrect: false }])],
      { problemOrder: ['p1'], choiceOrder: {} },
    );
    expect(view.choiceImages).toBeNull();
  });
});
