import { classesInRange, currentClassroomOf, enrolledOn, type EnrollmentSpan } from './enrollment-span.logic';
import { buildLessonDays, resolveRange } from './lesson-days.logic';
import { computeSyllabus, firstDoneDate, itemKey, type AttStatus, type SyllabusMakeupIn } from './syllabus.logic';

// 13-4-өөс 13-2 руу 11-05-нд шилжсэн сурагч
const SPANS: EnrollmentSpan[] = [
  { classroomId: 'c134', joined: '2026-10-01', left: '2026-11-05' },
  { classroomId: 'c132', joined: '2026-11-05', left: null },
];
const enrolled = (c: string, d: string) => enrolledOn(SPANS, c, d);

describe('enrolledOn — анги солих өдөр', () => {
  it('joined <= өдөр < left', () => {
    expect(enrolled('c134', '2026-10-01')).toBe(true);
    expect(enrolled('c134', '2026-11-04')).toBe(true);
    expect(enrolled('c134', '2026-11-05')).toBe(false); // солих өдөр шинэ ангид
    expect(enrolled('c132', '2026-11-05')).toBe(true);
    expect(enrolled('c132', '2026-11-04')).toBe(false);
    expect(enrolled('c134', '2026-09-30')).toBe(false);
  });
  it('мужид огтлолцох ангиуд', () => {
    expect(classesInRange(SPANS, '2026-10-01', '2026-10-31')).toEqual(['c134']);
    expect(classesInRange(SPANS, '2026-11-01', '2026-11-30').sort()).toEqual(['c132', 'c134']);
    expect(classesInRange(SPANS, '2026-11-05', '2026-11-30')).toEqual(['c132']);
  });
  it('одоогийн анги: идэвхтэй, хамгийн сүүлд элссэн; танхимын анги түрүүлнэ', () => {
    expect(currentClassroomOf(SPANS)).toBe('c132');
    const two: EnrollmentSpan[] = [
      { classroomId: 'online', joined: '2026-11-06', left: null },
      { classroomId: 'room', joined: '2026-10-01', left: null },
    ];
    expect(currentClassroomOf(two)).toBe('online');
    expect(currentClassroomOf(two, new Set(['room']))).toBe('room');
    // сургалтаас хасагдсан: хамгийн сүүлд гарсан
    expect(
      currentClassroomOf([
        { classroomId: 'a', joined: '2026-09-01', left: '2026-10-01' },
        { classroomId: 'b', joined: '2026-10-01', left: '2026-11-01' },
      ]),
    ).toBe('b');
    expect(currentClassroomOf([])).toBeNull();
  });
});

/* ───────── Сэдэв хөтөлбөр ───────── */

function run(opts: {
  sessions?: { classroomId: string; date: string; testId: string | null; title?: string }[];
  att?: Record<string, AttStatus>;
  past?: { classroomId: string; testId: string; markedOn: string }[];
  makeups?: SyllabusMakeupIn[];
  today?: string;
  current?: string | null;
}) {
  return computeSyllabus({
    today: opts.today ?? '2026-11-30',
    currentClassroomId: opts.current === undefined ? 'c132' : opts.current,
    enrolled,
    attendance: new Map(Object.entries(opts.att ?? {})),
    sessions: (opts.sessions ?? []).map((s) => ({ ...s, title: s.title ?? '' })),
    past: opts.past ?? [],
    makeups: opts.makeups ?? [],
  });
}
const visit = (over: Partial<SyllabusMakeupIn> = {}): SyllabusMakeupIn => ({
  visitId: 'v1',
  date: '2026-11-10',
  place: { kind: 'ROOM_406', classroomId: null, name: '406' },
  attStatus: null,
  teacher: 'Б. Багш',
  comment: null,
  tests: [{ testId: 'T1', title: 'Тест 1', source: 'RECORDED' }],
  ...over,
});

describe('computeSyllabus — хийсэн/дутуу', () => {
  it('ирсэн, хоцорсон → хийсэн; тасалсан, чөлөөтэй → дутуу', () => {
    const s = run({
      sessions: [
        { classroomId: 'c134', date: '2026-10-10', testId: 'P' },
        { classroomId: 'c134', date: '2026-10-11', testId: 'L' },
        { classroomId: 'c134', date: '2026-10-12', testId: 'A' },
        { classroomId: 'c134', date: '2026-10-13', testId: 'E' },
      ],
      att: { 'c134|2026-10-10': 'PRESENT', 'c134|2026-10-11': 'LATE', 'c134|2026-10-12': 'ABSENT', 'c134|2026-10-13': 'EXCUSED' },
    });
    expect(s.get('t:P')!.status).toBe('DONE');
    expect(s.get('t:L')!.status).toBe('DONE');
    expect(s.get('t:A')!.status).toBe('MISSING');
    expect(s.get('t:E')!.status).toBe('MISSING');
    expect(s.get('t:L')!.events[0]).toMatchObject({ kind: 'CLASS', attendance: 'LATE', done: true });
  });

  it('ирц тэмдэглээгүй ч элссэн байсан бол хийсэнд тооцно', () => {
    const s = run({ sessions: [{ classroomId: 'c132', date: '2026-11-06', testId: 'U' }] });
    expect(s.get('t:U')).toMatchObject({ status: 'DONE', events: [{ kind: 'CLASS', attendance: null, done: true }] });
  });

  it('анги солих: шинэ анги элсэхээс өмнө үзсэн, хуучин ангид хийгээгүй → дутуу', () => {
    const s = run({
      sessions: [
        { classroomId: 'c132', date: '2026-10-20', testId: 'X' }, // 13-2 түрүүлж үзсэн
        { classroomId: 'c132', date: '2026-10-21', testId: 'Y' },
        { classroomId: 'c134', date: '2026-10-25', testId: 'Y' }, // 13-4-т хийсэн
      ],
    });
    expect(s.get('t:X')).toMatchObject({ status: 'MISSING', events: [{ kind: 'BEFORE_JOIN', date: '2026-10-20' }] });
    expect(s.get('t:Y')!.status).toBe('DONE');
    expect(firstDoneDate(s.get('t:Y'))).toBe('2026-10-25');
  });

  it('сарын дундуур шилжсэн: солих өдөр хуучин ангийн хичээл тооцогдохгүй, шинэ ангийнх тооцогдоно', () => {
    const s = run({
      sessions: [
        { classroomId: 'c134', date: '2026-11-05', testId: 'OLD' },
        { classroomId: 'c132', date: '2026-11-05', testId: 'NEW' },
      ],
    });
    expect(s.has('t:OLD')).toBe(false); // хуучин анги, элсээгүй өдөр, одоогийн анги биш
    expect(s.get('t:NEW')!.status).toBe('DONE');
  });

  it('солих өдөр хуучин ангид ирц тэмдэглэгдсэн бол ирц давамгайлна', () => {
    const s = run({
      sessions: [{ classroomId: 'c134', date: '2026-11-05', testId: 'OLD' }],
      att: { 'c134|2026-11-05': 'PRESENT' },
    });
    expect(s.get('t:OLD')!.status).toBe('DONE');
  });

  it('хуучин ангийн гарсны дараах хичээл хамаарахгүй', () => {
    const s = run({ sessions: [{ classroomId: 'c134', date: '2026-11-20', testId: 'Z' }] });
    expect(s.size).toBe(0);
  });

  it('нөхөлт дутууг нөхнө (406, өөр анги CONFIRMED)', () => {
    const s = run({
      sessions: [
        { classroomId: 'c134', date: '2026-10-12', testId: 'T1' },
        { classroomId: 'c132', date: '2026-10-20', testId: 'T2' },
      ],
      att: { 'c134|2026-10-12': 'ABSENT' },
      makeups: [
        visit(),
        visit({
          visitId: 'v2',
          date: '2026-11-12',
          place: { kind: 'CLASS', classroomId: 'c126', name: '12-6' },
          tests: [{ testId: 'T2', title: 'Тест 2', source: 'CONFIRMED' }],
        }),
      ],
    });
    expect(s.get('t:T1')!.status).toBe('DONE');
    expect(s.get('t:T1')!.events.map((e) => e.kind)).toEqual(['CLASS', 'MAKEUP']);
    expect(firstDoneDate(s.get('t:T1'))).toBe('2026-11-10');
    expect(s.get('t:T2')!.events[1]).toMatchObject({ kind: 'MAKEUP', place: { name: '12-6' } });
  });

  it('PLANNED нөхөлт, тасалсан нөхөлт тооцогдохгүй', () => {
    const s = run({
      sessions: [{ classroomId: 'c134', date: '2026-10-12', testId: 'T1' }],
      att: { 'c134|2026-10-12': 'ABSENT' },
      makeups: [
        visit({ tests: [{ testId: 'T1', title: 'Тест 1', source: 'PLANNED' }] }),
        visit({ visitId: 'v3', attStatus: 'ABSENT' }),
      ],
    });
    expect(s.get('t:T1')!.status).toBe('MISSING');
  });

  it('устгасан нөхөлт (оролтод байхгүй) → дахин дутуу', () => {
    const base = {
      sessions: [{ classroomId: 'c134', date: '2026-10-12', testId: 'T1' }],
      att: { 'c134|2026-10-12': 'ABSENT' as AttStatus },
    };
    expect(run({ ...base, makeups: [visit()] }).get('t:T1')!.status).toBe('DONE');
    expect(run({ ...base, makeups: [] }).get('t:T1')!.status).toBe('MISSING');
  });

  it('анги нэг тестийг хоёр удаа хийсэн: эхэнд тасалж, дараа нь ирсэн → хийсэн, хоёр үйл явдал', () => {
    const s = run({
      sessions: [
        { classroomId: 'c132', date: '2026-11-08', testId: 'R' },
        { classroomId: 'c132', date: '2026-11-15', testId: 'R' },
      ],
      att: { 'c132|2026-11-08': 'ABSENT', 'c132|2026-11-15': 'PRESENT' },
    });
    const r = s.get('t:R')!;
    expect(r.status).toBe('DONE');
    expect(r.events.map((e) => e.date)).toEqual(['2026-11-08', '2026-11-15']);
    expect(firstDoneDate(r)).toBe('2026-11-15');
  });

  it('давхар хийсэн (анги + нөхөлт) — нэг л тест, бүх үйл явдал', () => {
    const s = run({
      sessions: [{ classroomId: 'c132', date: '2026-11-08', testId: 'T1' }],
      makeups: [visit({ date: '2026-11-07' })],
    });
    expect(s.size).toBe(1);
    expect(s.get('t:T1')!.events.map((e) => e.kind)).toEqual(['MAKEUP', 'CLASS']);
  });

  it('ирээдүйн огноотой бүртгэл тооцогдохгүй', () => {
    const s = run({ today: '2026-11-07', sessions: [{ classroomId: 'c132', date: '2026-11-08', testId: 'F' }] });
    expect(s.size).toBe(0);
  });

  it('өмнө үзсэн (огноогүй): тэмдэглэх үед элссэн → хийсэн; одоогийн анги, элсэхээс өмнө → дутуу', () => {
    const s = run({
      past: [
        { classroomId: 'c134', testId: 'P1', markedOn: '2026-10-20' },
        { classroomId: 'c132', testId: 'P2', markedOn: '2026-10-20' },
        { classroomId: 'c132', testId: 'P3', markedOn: '2026-11-06' },
      ],
    });
    expect(s.get('t:P1')).toMatchObject({ status: 'DONE', events: [{ kind: 'PAST' }] });
    expect(s.get('t:P2')).toMatchObject({ status: 'MISSING', events: [{ kind: 'BEFORE_JOIN', date: null }] });
    expect(s.get('t:P3')!.status).toBe('DONE');
  });

  it('гараар бичсэн сэдэв нэрээр таарна (том жижиг, зай)', () => {
    expect(itemKey(null, '  Иррац  Шалгалт ')).toBe(itemKey(null, 'иррац шалгалт'));
    const s = run({
      sessions: [{ classroomId: 'c134', date: '2026-10-12', testId: null, title: 'Иррац шалгалт' }],
      att: { 'c134|2026-10-12': 'ABSENT' },
      makeups: [visit({ tests: [{ testId: null, title: 'иррац  шалгалт', source: 'RECORDED' }] })],
    });
    expect(s.get(itemKey(null, 'Иррац шалгалт'))!.status).toBe('DONE');
  });

  it('хоосон нэртэй гараар бичсэн сэдэв алгасна', () => {
    const s = run({ sessions: [{ classroomId: 'c132', date: '2026-11-08', testId: null, title: '  ' }] });
    expect(s.size).toBe(0);
  });
});

/* ───────── Хуанли ───────── */

describe('resolveRange — 7 хоногийн хил давсан зөөлт', () => {
  const sched = {
    id: 's1',
    classroomId: 'c132',
    classroomName: '13-2',
    weekday: 1, // Даваа (JS)
    startMinute: 960,
    endMinute: 1080,
    teacherId: null,
    teacherName: 'Б. Багш',
    room: null,
    subject: null,
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
  };
  it('Даваа гарагууд, цуцалсан хасагдана, өөр 7 хоног руу зөөсөн шилжинэ', () => {
    const days = resolveRange({
      from: '2026-11-01',
      to: '2026-11-30',
      schedules: [sched],
      exceptions: [
        { scheduleId: 's1', date: '2026-11-02', kind: 'CANCELLED', newDate: null, newStartMinute: null, newEndMinute: null, newRoom: null, note: null },
        { scheduleId: 's1', date: '2026-11-09', kind: 'MOVED', newDate: '2026-11-21', newStartMinute: 600, newEndMinute: 720, newRoom: null, note: null },
      ],
      topics: [{ scheduleId: 's1', date: '2026-11-09', title: 'Зөөсөн сэдэв' }],
      holidays: [],
    });
    expect(days).toHaveLength(30);
    const withLesson = days.filter((d) => d.entries.length).map((d) => d.date);
    expect(withLesson).toEqual(['2026-11-16', '2026-11-21', '2026-11-23', '2026-11-30']);
    const moved = days.find((d) => d.date === '2026-11-21')!.entries[0];
    expect(moved).toMatchObject({ startMinute: 600, topic: 'Зөөсөн сэдэв', exception: { originalDate: '2026-11-09' } });
  });
});

describe('buildLessonDays', () => {
  const resolved = resolveRange({
    from: '2026-11-01',
    to: '2026-11-10',
    schedules: [
      { id: 'a', classroomId: 'c134', classroomName: '13-4', weekday: 3, startMinute: 960, endMinute: 1080, teacherId: null, teacherName: 'А', room: null, subject: null, effectiveFrom: '2026-09-01', effectiveTo: null },
      { id: 'b', classroomId: 'c132', classroomName: '13-2', weekday: 3, startMinute: 600, endMinute: 720, teacherId: null, teacherName: 'Б', room: null, subject: null, effectiveFrom: '2026-09-01', effectiveTo: null },
    ],
    exceptions: [],
    topics: [],
    holidays: [],
  });
  const base = {
    from: '2026-11-01',
    to: '2026-11-10',
    today: '2026-11-08',
    enrolled,
    classNames: new Map([
      ['c134', '13-4'],
      ['c132', '13-2'],
      ['c999', '12-6'],
    ]),
    resolved,
    attendance: [],
    homework: [],
    sessions: [],
    records: [],
    quiz: [],
    notes: [],
  };
  it('элссэн ангийн хуваарь л: 11-04 (13-4), 11-11 биш; 13-2 зөвхөн 11-05-аас', () => {
    const days = buildLessonDays(base);
    expect(days.map((d) => `${d.date} ${d.classroomName}`)).toEqual(['2026-11-04 13-4']);
  });
  it('ирц, даалгавар, оноо, тест, тайлбарыг нэгтгэнэ; өөр ангийн ирц тусдаа хайрцаг', () => {
    const days = buildLessonDays({
      ...base,
      attendance: [
        { classroomId: 'c134', date: '2026-11-04', status: 'LATE', lateRange: 'FIVE_TO_TEN', note: 'автобус', markedBy: 'А' },
        { classroomId: 'c999', date: '2026-11-06', status: 'PRESENT', lateRange: null, note: null, markedBy: 'В' },
      ],
      homework: [
        { classroomId: 'c134', date: '2026-11-04', status: 'DONE', comment: null, markedBy: 'А' },
        { classroomId: 'c134', date: '2026-11-03', status: null, comment: null, markedBy: 'А' },
      ],
      sessions: [
        { classroomId: 'c134', date: '2026-11-04', testId: 'T1', title: 'Тест 1', variant: 'A' },
        { classroomId: 'c134', date: '2026-11-04', testId: 'T1', title: 'Тест 1', variant: 'A' },
        { classroomId: 'c132', date: '2026-11-02', testId: 'T9', title: 'Элсэхээс өмнө', variant: null },
      ],
      quiz: [{ classroomId: 'c134', date: '2026-11-04', score: 7, problemCount: 10 }],
      notes: [
        { classroomId: 'c134', date: '2026-11-04', body: 'Сайн ажилласан', by: 'А' },
        { classroomId: 'c134', date: '2026-11-09', body: 'Хайрцаггүй өдөр', by: 'А' },
      ],
    });
    expect(days.map((d) => d.key)).toEqual(['2026-11-04|c134', '2026-11-06|c999']);
    const d = days[0];
    expect(d).toMatchObject({
      own: true,
      scheduled: true,
      startMinute: 960,
      scheduleTeacher: 'А',
      attendance: { status: 'LATE', lateRange: 'FIVE_TO_TEN', note: 'автобус' },
      homework: { status: 'DONE' },
      quiz: { score: 7, problemCount: 10 },
      teacherNote: { body: 'Сайн ажилласан' },
      future: false,
    });
    expect(d.tests).toHaveLength(1);
    expect(days[1]).toMatchObject({ own: false, scheduled: false, classroomName: '12-6' });
  });
  it('батлагдсан хичээлийн сэдэв, багш давамгайлна; ирээдүйн өдөр тэмдэглэгдэнэ', () => {
    const days = buildLessonDays({
      ...base,
      to: '2026-11-12',
      resolved: resolveRange({ ...{ schedules: [], exceptions: [], topics: [], holidays: [] }, from: '2026-11-01', to: '2026-11-12' }).map((x) => x),
      records: [
        { classroomId: 'c132', date: '2026-11-06', startMinute: 600, endMinute: 720, room: '201', topic: 'Квадрат 1, 2', lead: 'Л', assistant: null, description: 'гэрийн даалгавар 5', problemNumbersText: '1-10', confirmedBy: 'Л', studentListed: true },
        { classroomId: 'c134', date: '2026-11-06', startMinute: 600, endMinute: 720, room: null, topic: 'Хамаагүй', lead: null, assistant: null, description: null, problemNumbersText: null, confirmedBy: 'Х', studentListed: false },
      ],
      quiz: [{ classroomId: 'c132', date: '2026-11-12', score: 1, problemCount: 2 }],
    });
    expect(days.map((d) => d.key)).toEqual(['2026-11-06|c132', '2026-11-12|c132']);
    expect(days[0]).toMatchObject({ topic: 'Квадрат 1, 2', lead: 'Л', confirmed: { description: 'гэрийн даалгавар 5', problemNumbersText: '1-10' } });
    expect(days[1].future).toBe(true);
  });
});
