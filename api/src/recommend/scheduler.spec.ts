import {
  buildTopicStates,
  fitScore,
  recommend,
  type AttemptSignal,
  type CandidateProblem,
} from './scheduler';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // тогтмол мөч — тестийн үр дүн давтагдана

function a(topicId: string, correct: boolean, daysAgo: number, problemId = `${topicId}-p${daysAgo}`): AttemptSignal {
  return { problemId, topicId, correct, at: NOW - daysAgo * DAY };
}

function c(id: string, topicId: string, difficulty: number, attemptCount = 50): CandidateProblem {
  return { id, topicId, difficulty, attemptCount };
}

describe('buildTopicStates', () => {
  it('цөөн оролдлогод эзэмшилтийг 0.5 руу татна (хэт итгэлтэй дүгнэхгүй)', () => {
    const s = buildTopicStates([a('T1', true, 1)]).get('T1')!;
    expect(s.attempts).toBe(1);
    // (1 + 1) / (1 + 2) = 0.667 — 1.0 БИШ
    expect(s.mastery).toBeCloseTo(2 / 3, 5);
  });

  it('оролдлого олон болоход бодит хувь руу ойртоно', () => {
    const hist = Array.from({ length: 20 }, (_, i) => a('T1', i < 16, 20 - i, `p${i}`));
    const s = buildTopicStates(hist).get('T1')!;
    expect(s.attempts).toBe(20);
    expect(s.correct).toBe(16);
    expect(s.mastery).toBeCloseTo(17 / 22, 5); // 0.8-д ойр
  });

  it('СҮҮЛИЙН оролдлогын төлөвийг хугацааны дарааллаар зөв тодорхойлно', () => {
    // Санамсаргүй дарааллаар өгсөн ч сүүлийнх нь хамгийн шинэ мөч байх ёстой
    const s = buildTopicStates([
      a('T1', false, 1, 'p-new'),
      a('T1', true, 9, 'p-old'),
    ]).get('T1')!;
    expect(s.lastWrong).toBe(true);
    expect(s.lastAt).toBe(NOW - 1 * DAY);
  });
});

describe('fitScore — хүссэн хүндрэл', () => {
  it('сул сурагчид АМАРХАН бодлого илүү таарна', () => {
    // mastery 0.3 → ideal difficulty ≈ 0.1
    expect(fitScore(0.2, 0.3)).toBeGreaterThan(fitScore(0.7, 0.3));
  });

  it('чадвартай сурагчид ХҮНД бодлого илүү таарна', () => {
    // mastery 0.9 → ideal difficulty ≈ 0.7
    expect(fitScore(0.6, 0.9)).toBeGreaterThan(fitScore(0.1, 0.9));
  });

  it('оновчтой цэгээс аль ч тийш холдвол оноо буурна', () => {
    // mastery 0.55 → ideal ≈ 0.35
    const atIdeal = fitScore(0.35, 0.55);
    expect(fitScore(0.05, 0.55)).toBeLessThan(atIdeal);
    expect(fitScore(0.65, 0.55)).toBeLessThan(atIdeal);
  });

  it('чиглэл ЗӨВ — эзэмшилт өсөхөд оновчтой хүндрэл ч өснө', () => {
    // Энэ бол 2026-08-08-нд илэрсэн УРВУУ томьёоны хамгаалалт.
    const idealFor = (m: number) => {
      let best = 0, bestD = 0;
      for (let d = 0; d <= 1.0001; d += 0.01) {
        const s = fitScore(d, m);
        if (s > best) { best = s; bestD = d; }
      }
      return bestD;
    };
    expect(idealFor(0.9)).toBeGreaterThan(idealFor(0.5));
    expect(idealFor(0.5)).toBeGreaterThan(idealFor(0.2));
  });

  it('оноо үргэлж 0..1 хооронд', () => {
    for (const d of [0, 0.25, 0.5, 0.75, 1]) {
      for (const m of [0, 0.25, 0.5, 0.75, 1]) {
        const s = fitScore(d, m);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('recommend — үндсэн зан төлөв', () => {
  const cands = [
    c('p1', 'T1', 0.3), c('p2', 'T1', 0.8),
    c('p3', 'T2', 0.3), c('p4', 'T2', 0.8),
    c('p5', 'T3', 0.5), c('p6', 'T3', 0.5),
  ];

  it('аль хэдийн бодсон бодлогыг дахин санал болгохгүй', () => {
    const hist = [a('T1', true, 3, 'p1')];
    const r = recommend(hist, cands, { now: NOW, limit: 10 });
    expect(r.map((x) => x.problemId)).not.toContain('p1');
  });

  it('sameProblemOk=true үед дахин санал болгож БОЛНО', () => {
    const hist = [a('T1', true, 3, 'p1')];
    const r = recommend(hist, cands, { now: NOW, limit: 10, sameProblemOk: true });
    expect(r.map((x) => x.problemId)).toContain('p1');
  });

  it('limit-ээс илүүг буцаахгүй', () => {
    const r = recommend([], cands, { now: NOW, limit: 3 });
    expect(r).toHaveLength(3);
  });

  it('нэр давхардахгүй', () => {
    const r = recommend([], cands, { now: NOW, limit: 6 });
    expect(new Set(r.map((x) => x.problemId)).size).toBe(r.length);
  });
});

describe('recommend — Зарчим 1: давтан сэргээх', () => {
  it('буруу бодсон сэдвийг ХАНГАЛТТАЙ хугацааны дараа дахин санал болгоно', () => {
    // T1-д 2 хоногийн өмнө буруу бодсон → RETRY_TOPIC болох ёстой
    const hist = [a('T1', false, 2, 'used')];
    const r = recommend(hist, [c('p1', 'T1', 0.4), c('p9', 'T9', 0.4)], {
      now: NOW, limit: 2,
    });
    const t1 = r.find((x) => x.topicId === 'T1')!;
    expect(t1.reason).toBe('RETRY_TOPIC');
  });

  it('буруу бодсон нь ДӨНГӨЖ САЯ бол шууд дахин өгөхгүй (богино ойн нөлөө)', () => {
    // 2 цагийн өмнө буруу → RETRY биш (1 хоног болоогүй)
    const hist: AttemptSignal[] = [
      { problemId: 'used', topicId: 'T1', correct: false, at: NOW - 2 * 60 * 60 * 1000 },
    ];
    const r = recommend(hist, [c('p1', 'T1', 0.4)], { now: NOW, limit: 1 });
    expect(r[0].reason).not.toBe('RETRY_TOPIC');
  });
});

describe('recommend — Зарчим 3: холих (interleaving)', () => {
  it('нэг сэдэв дараалан хоёр удаа орохгүй', () => {
    const cands = [
      c('a1', 'T1', 0.5), c('a2', 'T1', 0.5), c('a3', 'T1', 0.5),
      c('b1', 'T2', 0.5), c('b2', 'T2', 0.5),
      c('c1', 'T3', 0.5),
    ];
    const r = recommend([], cands, { now: NOW, limit: 6, maxConsecutiveSameTopic: 1 });
    for (let i = 1; i < r.length; i++) {
      // Сэдэв 3 л байгаа тул сүүл рүүгээ давхарлаж БОЛНО — эхний 3-д хатуу шалгана
      if (i < 3) expect(r[i].topicId).not.toBe(r[i - 1].topicId);
    }
  });

  it('сэдэв ганц байвал дүрмийг сулруулж хоосон буцаахгүй', () => {
    const cands = [c('a1', 'T1', 0.5), c('a2', 'T1', 0.5), c('a3', 'T1', 0.5)];
    const r = recommend([], cands, { now: NOW, limit: 3, maxConsecutiveSameTopic: 1 });
    expect(r).toHaveLength(3);
  });
});

describe('recommend — Зарчим 2 ба 4: түвшин ба итгэл', () => {
  it('сул сэдэвт AMARHAN, хүчтэй сэдэвт ХҮНД бодлого сонгоно', () => {
    // T1: сул (1/10 зөв) · T2: хүчтэй (9/10 зөв)
    const hist: AttemptSignal[] = [
      ...Array.from({ length: 10 }, (_, i) => a('T1', i < 1, 10 - i, `t1-${i}`)),
      ...Array.from({ length: 10 }, (_, i) => a('T2', i < 9, 10 - i, `t2-${i}`)),
    ];
    const cands = [
      c('t1-easy', 'T1', 0.15), c('t1-hard', 'T1', 0.9),
      c('t2-easy', 'T2', 0.15), c('t2-hard', 'T2', 0.9),
    ];
    const r = recommend(hist, cands, { now: NOW, limit: 4, maxConsecutiveSameTopic: 4 });
    const rank = (id: string) => r.findIndex((x) => x.problemId === id);
    // Сул сэдэвт амархан нь хүндээсээ ӨМНӨ байх
    expect(rank('t1-easy')).toBeLessThan(rank('t1-hard'));
    // Хүчтэй сэдэвт хүнд нь амархнаасаа ӨМНӨ байх
    expect(rank('t2-hard')).toBeLessThan(rank('t2-easy'));
  });

  it('маш сайн эзэмшсэн сэдвийг CONFIDENCE гэж тэмдэглэж, жинг нь бууруулна', () => {
    const hist = Array.from({ length: 12 }, (_, i) => a('T2', true, 12 - i, `t2-${i}`));
    const r = recommend(hist, [c('x', 'T2', 0.5)], { now: NOW, limit: 1 });
    expect(r[0].reason).toBe('CONFIDENCE');
  });

  it('огт хүрээгүй сэдвийг NEW_TOPIC гэж тэмдэглэнэ', () => {
    const r = recommend([], [c('x', 'TNEW', 0.5)], { now: NOW, limit: 1 });
    expect(r[0].reason).toBe('NEW_TOPIC');
  });
});

describe('recommend — ирмэгийн тохиолдол', () => {
  it('түүх огт байхгүй ч ажиллана', () => {
    const r = recommend([], [c('p1', 'T1', 0.5)], { now: NOW, limit: 5 });
    expect(r).toHaveLength(1);
    expect(r[0].reason).toBe('NEW_TOPIC');
  });

  it('нэр дэвшигч байхгүй бол хоосон буцаана', () => {
    expect(recommend([a('T1', true, 1)], [], { now: NOW, limit: 5 })).toEqual([]);
  });

  it('оролдлого цөөнтэй бодлогын хүндрэлийг 0.5 руу татна', () => {
    // attemptCount=0 → difficulty ямар ч байсан 0.5 гэж үзнэ
    const r0 = recommend([], [{ id: 'x', topicId: 'T', difficulty: 1, attemptCount: 0 }], {
      now: NOW, limit: 1,
    });
    const r5 = recommend([], [{ id: 'x', topicId: 'T', difficulty: 1, attemptCount: 50 }], {
      now: NOW, limit: 1,
    });
    // 0.5 нь mastery 0.5-тай илүү таарна тул оноо ӨНДӨР байна
    expect(r0[0].score).toBeGreaterThan(r5[0].score);
  });

  it('ижил оруулгад ижил үр дүн (тогтвортой эрэмбэ)', () => {
    const cands = [c('b', 'T1', 0.5), c('a', 'T1', 0.5), c('c', 'T2', 0.5)];
    const one = recommend([], cands, { now: NOW, limit: 3 });
    const two = recommend([], cands, { now: NOW, limit: 3 });
    expect(one.map((x) => x.problemId)).toEqual(two.map((x) => x.problemId));
  });
});
