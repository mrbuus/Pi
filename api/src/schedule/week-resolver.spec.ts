import {
  resolveTeacherRoster,
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
