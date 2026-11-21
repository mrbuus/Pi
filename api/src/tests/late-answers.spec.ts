import {
  acceptLate,
  effectiveAnswers,
  latePending,
  mergeLateAnswers,
  parseLateAnswers,
  sameAnswer,
} from './late-answers';

describe('late-answers — хоцорч ирсэн хариу (цэвэр логик)', () => {
  it('дүгнэгдсэнтэй ижил хариу хадгалагдахгүй', () => {
    expect(mergeLateAnswers({ p1: 2 }, null, { p1: 2 })).toEqual({ late: null, changed: false });
    expect(sameAnswer(' A ', 'a')).toBe(true);
    expect(sameAnswer(undefined, '')).toBe(true);
  });

  it('зөрүүтэй хариу л үлдэнэ; хоосон утга хадгалагдахгүй', () => {
    const { late, changed } = mergeLateAnswers({ p1: 2, p2: 1 }, null, { p1: 2, p2: 4, p3: '' });
    expect(changed).toBe(true);
    expect(late).toEqual(
      expect.objectContaining({ answers: { p2: 4 }, differing: 1, receivedCount: 1 }),
    );
  });

  it('дараагийн хүсэлт өмнөхийг бодлого бүрээр нэгтгэнэ; ижил давталт бичилт үүсгэхгүй', () => {
    const first = mergeLateAnswers({}, null, { p1: 1 }).late;
    const second = mergeLateAnswers({}, first, { p2: 2 });
    expect(second.late?.answers).toEqual({ p1: 1, p2: 2 });
    expect(mergeLateAnswers({}, second.late, { p2: 2 }).changed).toBe(false);
  });

  it('хүлээн авсны дараа хүчинтэй хариу = дүгнэгдсэн + хүлээн авсан; түүх устахгүй', () => {
    const late = mergeLateAnswers({ p1: 0 }, null, { p1: 3 }).late!;
    expect(latePending(late)).toBe(true);
    const done = acceptLate(late, {
      acceptedAt: '2026-11-25T03:00:00.000Z',
      acceptedById: 'u',
      previousScore: { totalScore: 0, maxScore: 1 },
      acceptedScore: { totalScore: 1, maxScore: 1 },
    });
    expect(latePending(done)).toBe(false);
    expect(effectiveAnswers({ p1: 0 }, done)).toEqual({ p1: 3 });
    // Хүлээгдэж буй нь хүчинтэйд орохгүй
    expect(effectiveAnswers({ p1: 0 }, late)).toEqual({ p1: 0 });
    const again = mergeLateAnswers({ p1: 0 }, done, { p1: 4 }).late!;
    const twice = acceptLate(again, { ...done.accepted!, acceptedAt: 'x' });
    expect(twice.history).toHaveLength(1);
    expect(effectiveAnswers({ p1: 0 }, twice)).toEqual({ p1: 4 });
  });

  it('буруу хэлбэртэй JSON → null', () => {
    expect(parseLateAnswers(null)).toBeNull();
    expect(parseLateAnswers([])).toBeNull();
    expect(parseLateAnswers({ answers: { p1: 1 } })?.differing).toBe(1);
  });
});
