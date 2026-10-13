import {
  COMPETENCY_V0,
  competencyTrend,
  computeCompetency,
  examAccuracy,
  levelOf,
  practiceAccuracy,
  trendChange,
  type CompetencyInput,
} from './competency-score';

const NOW = new Date('2026-10-13T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const empty = (): CompetencyInput => ({
  exams: [],
  practice: [],
  attendance: [],
  homework: [],
});
const practiceRows = (
  n: number,
  correct: boolean,
  day = 3,
): CompetencyInput['practice'] =>
  Array.from({ length: n }, () => ({
    at: daysAgo(day),
    correct,
    selfState: null,
  }));

describe('competency v0 — чадамжийн оноо', () => {
  it('жингийн нийлбэр 1', () => {
    const w = COMPETENCY_V0.weights;
    expect(w.exam + w.practice + w.homework + w.attendance).toBeCloseTo(1);
  });

  it('мэдээлэлгүй бол оноо зохиохгүй', () => {
    const r = computeCompetency(empty(), NOW);
    expect(r.score).toBeNull();
    expect(r.level).toBeNull();
    expect(r.missing).toEqual(['exam', 'practice', 'homework', 'attendance']);
  });

  it('зөвхөн ирц, даалгавартай бол чадвар гэж тоо гаргахгүй', () => {
    const input = empty();
    input.attendance = [1, 2, 3, 4].map((d) => ({ at: daysAgo(d), status: 'PRESENT' as const }));
    input.homework = [1, 2, 3].map((d) => ({ at: daysAgo(d), status: 'DONE' as const }));
    expect(computeCompetency(input, NOW).score).toBeNull();
  });

  it('ганц шалгалт → жин бүхэлдээ шалгалтад, итгэл бага', () => {
    const input = empty();
    input.exams = [{ at: daysAgo(5), percent: 72 }];
    const r = computeCompetency(input, NOW);
    expect(r.score).toBe(72);
    expect(r.confidence).toBe('low');
    expect(r.drivers).toHaveLength(1);
    expect(r.drivers[0]).toMatchObject({ key: 'exam', weight: 1, value: 72 });
  });

  it('сүүлийн шалгалт хамгийн их жинтэй', () => {
    const a = examAccuracy(
      [
        { at: daysAgo(20), percent: 40 },
        { at: daysAgo(2), percent: 80 },
      ],
      NOW,
    )!;
    // (80×1 + 40×0.7) / 1.7
    expect(a.value).toBeCloseTo((80 + 40 * 0.7) / 1.7);
    expect(a.value).toBeGreaterThan(60);
  });

  it('ирээдүйн огноотой шалгалтыг (asOf-оос хойш) тооцохгүй', () => {
    expect(examAccuracy([{ at: daysAgo(-3), percent: 90 }], NOW)).toBeNull();
  });

  it('бүх оролттой үед жинлэсэн дундаж, итгэл өндөр', () => {
    const input = empty();
    input.exams = [10, 20, 30].map((d) => ({ at: daysAgo(d), percent: 60 }));
    input.practice = practiceRows(20, true);
    input.attendance = [1, 2, 3, 4].map((d) => ({ at: daysAgo(d), status: 'PRESENT' as const }));
    input.homework = [1, 2, 3, 4].map((d) => ({ at: daysAgo(d), status: 'NOT_DONE' as const }));
    const r = computeCompetency(input, NOW);
    // 60×0.5 + 100×0.2 + 0×0.15 + 100×0.15 = 65
    expect(r.score).toBe(65);
    expect(r.level).toBe('Сайн');
    expect(r.confidence).toBe('high');
    expect(r.missing).toEqual([]);
    const pts = r.drivers.reduce((s, d) => s + d.points, 0);
    expect(pts).toBeCloseTo(65, 0);
  });

  it('бие даасан бодлого доод тооноос цөөн бол тооцохгүй', () => {
    const p = practiceAccuracy(practiceRows(COMPETENCY_V0.minPracticeAttempts - 1, true), NOW);
    expect(p.value).toBeNull();
  });

  it('«Буудсан» нь зөвд тооцогдохгүй, торгууль авна', () => {
    const honest = empty();
    honest.practice = Array.from({ length: 10 }, () => ({
      at: daysAgo(2),
      correct: true,
      selfState: 'SOLVED_CLEAN' as const,
    }));
    const guesser = empty();
    guesser.practice = Array.from({ length: 10 }, (_, i) => ({
      at: daysAgo(2),
      correct: true,
      selfState: i < 5 ? ('GUESSED' as const) : ('SOLVED_CLEAN' as const),
    }));
    const a = computeCompetency(honest, NOW);
    const b = computeCompetency(guesser, NOW);
    expect(a.score).toBe(100);
    expect(b.guessedShare).toBe(0.5);
    expect(b.guessPenalty).toBeCloseTo(COMPETENCY_V0.guessPenaltyMax * 0.5);
    // 50% зөв − 7.5 торгууль
    expect(b.score).toBe(43);
  });

  it('засаж зөв гаргасныг хэсэгчлэн тооцно', () => {
    const input = empty();
    input.practice = Array.from({ length: 10 }, () => ({
      at: daysAgo(1),
      correct: null,
      selfState: 'FIXED_AFTER_ERROR' as const,
    }));
    expect(computeCompetency(input, NOW).score).toBe(60);
  });

  it('чөлөөтэй (EXCUSED) нь ирцийг бууруулахгүй', () => {
    const input = empty();
    input.exams = [{ at: daysAgo(1), percent: 50 }];
    input.attendance = [
      { at: daysAgo(1), status: 'PRESENT' },
      { at: daysAgo(2), status: 'LATE' },
      { at: daysAgo(3), status: 'PRESENT' },
      { at: daysAgo(4), status: 'EXCUSED' },
    ];
    const r = computeCompetency(input, NOW);
    expect(r.drivers.find((d) => d.key === 'attendance')?.value).toBe(100);
  });

  it('гулсах цонхноос гадуурх ирцийг тооцохгүй', () => {
    const input = empty();
    input.exams = [{ at: daysAgo(1), percent: 50 }];
    input.attendance = [1, 2, 3].map(() => ({
      at: daysAgo(COMPETENCY_V0.windowDays + 5),
      status: 'ABSENT' as const,
    }));
    expect(computeCompetency(input, NOW).missing).toContain('attendance');
  });

  it('түвшний нэр', () => {
    expect(levelOf(10)).toBe('Суурь');
    expect(levelOf(40)).toBe('Дунд');
    expect(levelOf(60)).toBe('Сайн');
    expect(levelOf(80)).toBe('Ахисан');
  });

  it('хандлага: долоо хоног бүрийн оноо, сайжирвал өснө', () => {
    const input = empty();
    input.exams = [
      { at: daysAgo(40), percent: 30 },
      { at: daysAgo(20), percent: 60 },
      { at: daysAgo(2), percent: 90 },
    ];
    const trend = competencyTrend(input, NOW, 8);
    expect(trend.length).toBeGreaterThanOrEqual(3);
    expect(trend[0].value).toBeLessThan(trend[trend.length - 1].value);
    expect(trendChange(trend)).toBeGreaterThan(0);
  });

  it('хандлага: мэдээлэлгүй долоо хоногийг алгасна', () => {
    const input = empty();
    input.exams = [{ at: daysAgo(2), percent: 70 }];
    const trend = competencyTrend(input, NOW, 8);
    expect(trend).toHaveLength(1);
    expect(trendChange(trend)).toBeNull();
  });
});
