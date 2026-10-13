import {
  resolveTeacherRoster,
  weekParityOf,
  resolveWeek,
  ResolverSchedule,
} from './week-resolver';

function schedule(overrides: Partial<ResolverSchedule> = {}): ResolverSchedule {
  return {
    id: 's1',
    classroomId: 'c1',
    classroomName: 'Анги 1',
    weekday: 1, // Даваа
    startMinute: 600,
    endMinute: 720,
    teacherId: 't1',
    teacherName: 'Багш Бат',
    room: '101',
    subject: 'MATH',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    ...overrides,
  };
}

// 2026-08-03 бол Даваа гараг.
const WEEK_START = '2026-08-03';

describe('resolveWeek', () => {
  it('идэвхийн хугацаанд (effectiveFrom/effectiveTo) багтсан тохиолдлыг гаргана', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule()],
      exceptions: [],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(1);
    expect(monday.entries[0].scheduleId).toBe('s1');
  });

  it('өдрийн ахлах/туслах багшийг зөвхөн тэр огноонд хавсаргана', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule({ weekday: 1 }), schedule({ id: 's2', weekday: 3 })],
      exceptions: [],
      topics: [],
      holidays: [],
      staffing: [
        {
          scheduleId: 's1',
          date: '2026-08-03',
          lead: { id: 'a', name: 'Баасанжав' },
          assistant: { id: 'b', name: 'У.Эмүжин' },
        },
      ],
    });
    const mon = days.find((d) => d.date === '2026-08-03')!.entries[0];
    expect(mon.leadTeacher).toEqual({ id: 'a', name: 'Баасанжав' });
    expect(mon.assistantTeacher?.name).toBe('У.Эмүжин');
    const wed = days.find((d) => d.date === '2026-08-05')!.entries[0];
    expect(wed.leadTeacher).toBeNull();
    expect(wed.assistantTeacher).toBeNull();
  });

  it('effectiveTo-оос хойшхи тохиолдлыг хасна', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule({ effectiveTo: '2026-08-01' })],
      exceptions: [],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(0);
  });

  it('effectiveFrom-оос өмнөх тохиолдлыг хасна', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule({ effectiveFrom: '2026-08-10' })],
      exceptions: [],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(0);
  });

  it('CANCELLED exception-той тохиолдлыг бүрэн хасна', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule()],
      exceptions: [
        { scheduleId: 's1', date: '2026-08-03', kind: 'CANCELLED', newDate: null, newStartMinute: null, newEndMinute: null, newRoom: null, note: 'Амралт' },
      ],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(0);
  });

  it('MOVED exception-ийг шинэ огноо/цаг руу зөөнө, эх өдөр дээр гарахгүй', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule()],
      exceptions: [
        {
          scheduleId: 's1',
          date: '2026-08-03',
          kind: 'MOVED',
          newDate: '2026-08-05',
          newStartMinute: 800,
          newEndMinute: 900,
          newRoom: '202',
          note: 'Багш чөлөөтэй тул шилжүүлэв',
        },
      ],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    const wednesday = days.find((d) => d.date === '2026-08-05')!;
    expect(monday.entries).toHaveLength(0);
    expect(wednesday.entries).toHaveLength(1);
    expect(wednesday.entries[0].startMinute).toBe(800);
    expect(wednesday.entries[0].room).toBe('202');
    expect(wednesday.entries[0].exception).toEqual({
      kind: 'MOVED',
      note: 'Багш чөлөөтэй тул шилжүүлэв',
      originalDate: '2026-08-03',
    });
  });

  it('holiday өдрийг isHoliday=true болгож тэмдэглэнэ (энэ pure fn нь entries-ийг хасдаггүй, дуудагч тал шийднэ)', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule()],
      exceptions: [],
      topics: [],
      holidays: [{ date: '2026-08-03', type: 'HOLIDAY', title: 'Наадам' }],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.isHoliday).toBe(true);
  });

  describe('онцгой өдөр — ангиар', () => {
    const two = [
      schedule({ id: 's1', classroomId: 'c1', classroomName: 'Анги 1' }),
      schedule({ id: 's2', classroomId: 'c2', classroomName: 'Анги 2', startMinute: 780, endMinute: 900 }),
    ];
    const resolve = (holidays: Parameters<typeof resolveWeek>[0]['holidays'], exceptions: Parameters<typeof resolveWeek>[0]['exceptions'] = []) =>
      resolveWeek({ weekStart: WEEK_START, schedules: two, exceptions, topics: [], holidays });

    it('бүх ангид хамаарах өдөр (classroomIds хоосон) isHoliday=true, holiday мэдээлэлтэй', () => {
      const mon = resolve([{ date: '2026-08-03', type: 'HOLIDAY', title: 'Наадам', classroomIds: [] }]).find((d) => d.date === '2026-08-03')!;
      expect(mon.isHoliday).toBe(true);
      expect(mon.holiday).toEqual({ type: 'HOLIDAY', title: 'Наадам' });
      expect(mon.restingClasses).toEqual([]);
      expect(mon.entries).toHaveLength(2); // дуудагч тал шийднэ
    });

    it('нэг ангид хамаарах өдөр бусад ангийг ХҮРЭХГҮЙ, зөвхөн тэр ангийн хичээлийг хасна', () => {
      const mon = resolve([{ date: '2026-08-03', type: 'EXAM_DAY', title: 'Шалгалт', classroomIds: ['c1'] }]).find((d) => d.date === '2026-08-03')!;
      expect(mon.isHoliday).toBe(false);
      expect(mon.holiday).toBeNull();
      expect(mon.entries.map((e) => e.classroomId)).toEqual(['c2']);
      expect(mon.restingClasses).toEqual([
        { classroomId: 'c1', classroomName: 'Анги 1', type: 'EXAM_DAY', title: 'Шалгалт' },
      ]);
    });

    it('өөр огнооны хичээлд нөлөөлөхгүй', () => {
      const days = resolve([{ date: '2026-08-03', type: 'HOLIDAY', title: 'x', classroomIds: ['c1'] }]);
      const next = resolveWeek({ weekStart: '2026-08-10', schedules: two, exceptions: [], topics: [], holidays: [{ date: '2026-08-03', type: 'HOLIDAY', title: 'x', classroomIds: ['c1'] }] });
      expect(days.find((d) => d.date === '2026-08-04')!.restingClasses).toEqual([]);
      expect(next.find((d) => d.date === '2026-08-10')!.entries).toHaveLength(2);
    });

    it('нэг өдөрт өөр өөр ангийн хоёр бичлэг хоорондоо давхцахгүй', () => {
      const mon = resolve([
        { date: '2026-08-03', type: 'HOLIDAY', title: 'А', classroomIds: ['c1'] },
        { date: '2026-08-03', type: 'EXAM_DAY', title: 'Б', classroomIds: ['c2'] },
      ]).find((d) => d.date === '2026-08-03')!;
      expect(mon.entries).toHaveLength(0);
      expect(mon.restingClasses.map((r) => [r.classroomId, r.title])).toEqual([['c1', 'А'], ['c2', 'Б']]);
    });

    it('амрах ангид өөр өдрөөс ЗӨӨГДӨЖ ирсэн хичээлийг ч хасна', () => {
      const days = resolve(
        [{ date: '2026-08-05', type: 'HOLIDAY', title: 'x', classroomIds: ['c1'] }],
        [{ scheduleId: 's1', date: '2026-08-03', kind: 'MOVED', newDate: '2026-08-05', newStartMinute: 600, newEndMinute: 660, newRoom: null, note: null }],
      );
      expect(days.find((d) => d.date === '2026-08-05')!.entries).toHaveLength(0);
      expect(days.find((d) => d.date === '2026-08-03')!.entries.map((e) => e.classroomId)).toEqual(['c2']);
    });
  });

  it('LessonTopic-ийг тухайн тохиолдлын огноогоор холбоно', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule()],
      exceptions: [],
      topics: [{ scheduleId: 's1', date: '2026-08-03', title: 'Квадрат тэгшитгэл' }],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries[0].topic).toBe('Квадрат тэгшитгэл');
  });
});

describe('resolveTeacherRoster', () => {
  it('TeacherWorkDay-аар долоо хоногийн ажлын өдрийг гаргана', () => {
    const rosters = resolveTeacherRoster({
      weekStart: WEEK_START,
      teachers: [{ id: 't1', name: 'Багш Бат' }],
      workDays: [{ teacherId: 't1', weekday: 1 }],
      exceptions: [],
      config: { mode: 'FIXED', validFrom: null, validTo: null },
    });
    const monday = rosters.find((r) => r.date === '2026-08-03')!;
    const tuesday = rosters.find((r) => r.date === '2026-08-04')!;
    expect(monday.teachers.map((t) => t.id)).toEqual(['t1']);
    expect(tuesday.teachers).toHaveLength(0);
  });

  it('TeacherWorkException нь давтагддаг хэв маягийг override хийнэ', () => {
    const rosters = resolveTeacherRoster({
      weekStart: WEEK_START,
      teachers: [{ id: 't1', name: 'Багш Бат' }],
      workDays: [{ teacherId: 't1', weekday: 1 }],
      exceptions: [{ teacherId: 't1', date: '2026-08-03', working: false }],
      config: { mode: 'FIXED', validFrom: null, validTo: null },
    });
    const monday = rosters.find((r) => r.date === '2026-08-03')!;
    expect(monday.teachers).toHaveLength(0);
  });

  it('амардаг өдөрт нэмэлт ажиллах override нэмнэ', () => {
    const rosters = resolveTeacherRoster({
      weekStart: WEEK_START,
      teachers: [{ id: 't1', name: 'Багш Бат' }],
      workDays: [],
      exceptions: [{ teacherId: 't1', date: '2026-08-04', working: true }],
    });
    const tuesday = rosters.find((r) => r.date === '2026-08-04')!;
    expect(tuesday.teachers.map((t) => t.id)).toEqual(['t1']);
  });
});

describe('MOVED exception — newDate ХООСОН (ижил өдөртөө танхим/цаг солих)', () => {
  // Регрессийн тест: өмнө нь newDate-гүй MOVED нь хичээлийг долоо хоногоос
  // бүрмөсөн алга болгодог байсан («Танхим солих» функцээр илэрсэн).
  it('танхим нь сольсон хичээл эх өдөртөө шинэ танхимтайгаа үлдэнэ', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule({ room: '502' })],
      exceptions: [
        {
          scheduleId: 's1',
          date: '2026-08-03',
          kind: 'MOVED',
          newDate: null,
          newStartMinute: null,
          newEndMinute: null,
          newRoom: '403',
          note: 'Танхим сольсон',
        },
      ],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(1);
    expect(monday.entries[0].room).toBe('403');
    expect(monday.entries[0].exception).toEqual(
      expect.objectContaining({ kind: 'MOVED', originalDate: '2026-08-03' }),
    );
  });

  it('зөвхөн цагаа сольсон хичээл эх өдөртөө шинэ цагтайгаа үлдэнэ', () => {
    const days = resolveWeek({
      weekStart: WEEK_START,
      schedules: [schedule({ startMinute: 900, endMinute: 1020 })],
      exceptions: [
        {
          scheduleId: 's1',
          date: '2026-08-03',
          kind: 'MOVED',
          newDate: null,
          newStartMinute: 1050,
          newEndMinute: 1170,
          newRoom: null,
          note: null,
        },
      ],
      topics: [],
      holidays: [],
    });
    const monday = days.find((d) => d.date === '2026-08-03')!;
    expect(monday.entries).toHaveLength(1);
    expect(monday.entries[0].startMinute).toBe(1050);
  });
});

describe('сондгой/тэгш 7 хоногийн ээлж (эзэн 2026-10-11)', () => {
  it('weekParityOf: 2026-08-31-ний 7 хоног = сондгой, дараагийнх = тэгш', () => {
    expect(weekParityOf('2026-08-31')).toBe(1);
    expect(weekParityOf('2026-09-01')).toBe(1);
    expect(weekParityOf('2026-09-06')).toBe(1); // Ням — мөн тэр 7 хоног
    expect(weekParityOf('2026-09-07')).toBe(2);
    expect(weekParityOf('2026-09-14')).toBe(1);
    expect(weekParityOf('2026-10-12')).toBe(1);
    expect(weekParityOf('2026-10-11')).toBe(2);
    // Зангилаанаас өмнө ч ээлж тасрахгүй
    expect(weekParityOf('2026-08-30')).toBe(2);
    expect(weekParityOf('2026-08-24')).toBe(2);
    expect(weekParityOf('2026-08-17')).toBe(1);
  });

  it('хүчинтэй хугацаанаас гадуур хүснэгт хэрэгжихгүй, онцгой өдөр хэрэгжинэ', () => {
    const rosters = resolveTeacherRoster({
      weekStart: '2026-12-28',
      teachers: [
        { id: 't1', name: 'А' },
        { id: 't2', name: 'Б' },
      ],
      workDays: [
        { teacherId: 't1', weekday: 4, parity: weekParityOf('2026-12-31') },
        { teacherId: 't1', weekday: 5, parity: weekParityOf('2027-01-01') },
      ],
      exceptions: [{ teacherId: 't2', date: '2027-01-01', working: true }],
      config: { mode: 'ALTERNATING', validFrom: '2026-08-31', validTo: '2026-12-31' },
    });
    const thu = rosters.find((r) => r.date === '2026-12-31')!;
    const fri = rosters.find((r) => r.date === '2027-01-01')!;
    expect(thu.inRange).toBe(true);
    expect(thu.teachers.map((t) => t.id)).toEqual(['t1']);
    expect(fri.inRange).toBe(false);
    expect(fri.teachers.map((t) => t.id)).toEqual(['t2']);
  });

  it('сондгой мөр зөвхөн сондгой 7 хоногт, тэгш мөр зөвхөн тэгшид', () => {
    const workDays = [
      { teacherId: 't1', weekday: 1, parity: 1 },
      { teacherId: 't2', weekday: 1, parity: 2 },
      { teacherId: 't3', weekday: 1, parity: 0 },
    ];
    const teachers = [
      { id: 't1', name: 'А' },
      { id: 't2', name: 'Б' },
      { id: 't3', name: 'В' },
    ];
    const odd = resolveTeacherRoster({
      weekStart: '2026-09-14',
      teachers,
      workDays,
      exceptions: [],
    });
    const even = resolveTeacherRoster({
      weekStart: '2026-09-21',
      teachers,
      workDays,
      exceptions: [],
    });
    expect(odd[0].parity).toBe(1);
    expect(odd[0].teachers.map((t) => t.id)).toEqual(['t1']);
    expect(even[0].parity).toBe(2);
    expect(even[0].teachers.map((t) => t.id)).toEqual(['t2']);
    // Тогтмол горимд зөвхөн parity 0 мөр — 7 хоног бүр ижил
    const fixed = resolveTeacherRoster({
      weekStart: '2026-09-21',
      teachers,
      workDays,
      exceptions: [],
      config: { mode: 'FIXED', validFrom: null, validTo: null },
    });
    expect(fixed[0].mode).toBe('FIXED');
    expect(fixed[0].teachers.map((t) => t.id)).toEqual(['t3']);
  });

  it('хүснэгтийн дараалал (sortOrder), дараа нь нэрээр эрэмбэлнэ', () => {
    const rosters = resolveTeacherRoster({
      weekStart: '2026-09-14',
      teachers: [
        { id: 'a', name: 'Анар' },
        { id: 'b', name: 'Баасанжав' },
        { id: 'c', name: 'Заяа' },
      ],
      workDays: [
        { teacherId: 'a', weekday: 1, parity: 1, sortOrder: 5 },
        { teacherId: 'b', weekday: 1, parity: 1, sortOrder: 1 },
        { teacherId: 'c', weekday: 2, parity: 1, sortOrder: 0 },
      ],
      exceptions: [{ teacherId: 'c', date: '2026-09-14', working: true }],
    });
    expect(rosters[0].teachers.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('онцгой өдөр ээлжийн хэв маягийг дарна', () => {
    const rosters = resolveTeacherRoster({
      weekStart: '2026-09-14',
      teachers: [{ id: 't1', name: 'А' }],
      workDays: [{ teacherId: 't1', weekday: 1, parity: 1 }],
      exceptions: [{ teacherId: 't1', date: '2026-09-14', working: false }],
    });
    expect(rosters[0].teachers).toHaveLength(0);
  });
});
