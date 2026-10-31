import {
  attendanceSummary,
  correctAnswerOf,
  dayKey,
  homeworkFor,
  homeworkSummary,
  hubProblem,
  inUploadWindow,
  lessonDaysByClass,
  matchesWords,
  monthWindow,
  nextLessonDay,
  percent,
  pickToday,
  queryWords,
  resolveRange,
  shiftMonth,
  testOpen,
  topicOf,
  ubMinuteOfDay,
  visibleDay,
  type HubProblemRow,
  type MarkRow,
} from './student-hub.logic';

describe('student-hub.logic — хичээлийн өдрийн нэгдэл', () => {
  it('ирц ∪ сэдэв ∪ тест ∪ бүртгэл: давхардалгүй, өсөх дарааллаар, өнөөдрөөс хойшхи хасагдана', () => {
    const map = lessonDaysByClass(
      [
        { classroomId: 'c1', date: '2026-10-27' }, // ирц
        { classroomId: 'c1', date: '2026-10-23' }, // сэдэв
        { classroomId: 'c1', date: '2026-10-27' }, // тест (давхар)
        { classroomId: 'c1', date: '2026-10-25' }, // бүртгэл
        { classroomId: 'c2', date: '2026-10-24' },
        { classroomId: 'c1', date: '2026-11-03' }, // ирээдүйн сэдэв
      ],
      '2026-10-31',
    );
    expect(map.get('c1')).toEqual(['2026-10-23', '2026-10-25', '2026-10-27']);
    expect(map.get('c2')).toEqual(['2026-10-24']);
    expect(map.has('c3')).toBe(false);
  });

  it('nextLessonDay: дараагийн хичээл, сүүлийнх бол null', () => {
    const days = ['2026-10-23', '2026-10-25', '2026-10-27'];
    expect(nextLessonDay(days, '2026-10-23')).toBe('2026-10-25');
    expect(nextLessonDay(days, '2026-10-24')).toBe('2026-10-25');
    expect(nextLessonDay(days, '2026-10-27')).toBeNull();
  });

  it('visibleDay: ангид орсноос хойш эсвэл өөрийн ирцтэй өдөр', () => {
    expect(visibleDay('2026-10-20', '2026-10-22', false)).toBe(false);
    expect(visibleDay('2026-10-20', '2026-10-22', true)).toBe(true);
    expect(visibleDay('2026-10-22', '2026-10-22', false)).toBe(true);
  });
});

describe("student-hub.logic — D → D' даалгаврын тэмдэглэгээ", () => {
  const days = ['2026-10-23', '2026-10-25', '2026-10-27'];
  const marks = new Map<string, MarkRow>([
    [dayKey('c1', '2026-10-25'), { status: 'PARTIAL', comment: 'Дутуу' }],
    [dayKey('c1', '2026-10-27'), { status: null, comment: null }],
    [dayKey('c2', '2026-10-25'), { status: 'DONE', comment: null }],
  ]);

  it("D-ийн тэмдэглэгээ = D' (дараагийн хичээл) дээрх мөр, тайлбартай", () => {
    expect(homeworkFor('c1', '2026-10-23', days, marks)).toEqual({
      status: 'PARTIAL',
      comment: 'Дутуу',
      checkedOn: '2026-10-25',
    });
  });

  it("D' болсон ч багш тэмдэглээгүй бол төлөв null, checkedOn = D'", () => {
    expect(homeworkFor('c1', '2026-10-25', days, marks)).toEqual({
      status: null,
      comment: null,
      checkedOn: '2026-10-27',
    });
  });

  it("D' хараахан болоогүй (сүүлийн хичээл) — «Шалгаагүй»", () => {
    expect(homeworkFor('c1', '2026-10-27', days, marks)).toEqual({
      status: null,
      comment: null,
      checkedOn: null,
    });
  });

  it('өөр ангийн тэмдэглэгээ холилдохгүй', () => {
    expect(homeworkFor('c3', '2026-10-23', days, marks).status).toBeNull();
  });
});

describe('student-hub.logic — сар', () => {
  it('өгөгдмөл нь одоогийн сар; төгсгөл өнөөдрөөр хязгаарлагдана', () => {
    expect(monthWindow(undefined, '2026-10-31')).toEqual({
      month: '2026-10',
      from: '2026-10-01',
      to: '2026-10-31',
      prevMonth: '2026-09',
      nextMonth: null,
    });
    expect(monthWindow('', '2026-11-05')).toMatchObject({
      month: '2026-11',
      to: '2026-11-05',
      nextMonth: null,
    });
  });

  it('хамгийн эрт 2026-09 — prevMonth null', () => {
    expect(monthWindow('2026-09', '2026-10-31')).toEqual({
      month: '2026-09',
      from: '2026-09-01',
      to: '2026-09-30',
      prevMonth: null,
      nextMonth: '2026-10',
    });
  });

  it('буруу, хэт эрт, ирээдүйн сар → null', () => {
    expect(monthWindow('2026-08', '2026-10-31')).toBeNull();
    expect(monthWindow('2026-11', '2026-10-31')).toBeNull();
    expect(monthWindow('2026-13', '2026-10-31')).toBeNull();
    expect(monthWindow('2026-1', '2026-10-31')).toBeNull();
    expect(monthWindow('abc', '2026-10-31')).toBeNull();
  });

  it('shiftMonth: оны хил', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftMonth('2026-02', 0)).toBe('2026-02');
  });

  it('2-р сарын сүүлийн өдөр', () => {
    expect(monthWindow('2027-02', '2027-03-10')?.to).toBe('2027-02-28');
  });
});

describe('student-hub.logic — хувь', () => {
  it('ирц: (Ирсэн + Хоцорсон) / нийт, бүхэл', () => {
    expect(
      attendanceSummary([
        { status: 'PRESENT', count: 5 },
        { status: 'LATE', count: 1 },
        { status: 'ABSENT', count: 2 },
        { status: 'EXCUSED', count: 1 },
      ]),
    ).toEqual({
      total: 9,
      PRESENT: 5,
      LATE: 1,
      ABSENT: 2,
      EXCUSED: 1,
      rate: 67,
    });
  });

  it('даалгавар: (Хийсэн + Дутуу·0.5) / нийт; төлөвгүй мөр тооцогдохгүй', () => {
    expect(
      homeworkSummary([
        { status: 'DONE', count: 3 },
        { status: 'PARTIAL', count: 1 },
        { status: 'NOT_DONE', count: 1 },
        { status: null, count: 4 },
      ]),
    ).toEqual({ total: 5, DONE: 3, PARTIAL: 1, NOT_DONE: 1, rate: 70 });
  });

  it('мөргүй бол 0', () => {
    expect(attendanceSummary([]).rate).toBe(0);
    expect(homeworkSummary([]).rate).toBe(0);
    expect(percent(1, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });
});

describe('student-hub.logic — тест нээх дүрэм', () => {
  const t = { deletedAt: null, type: 'DAILY' };
  it('гарсан өдрийн маргааш нээгдэнэ, тухайн өдөр хаалттай', () => {
    expect(testOpen('2026-10-30', '2026-10-31', t)).toBe(true);
    expect(testOpen('2026-10-31', '2026-10-31', t)).toBe(false);
  });
  it('устгасан, 1000 бодлого, ЭЕШ сорил, testId-гүй — хэзээ ч нээгдэхгүй', () => {
    expect(
      testOpen('2026-10-01', '2026-10-31', {
        deletedAt: new Date(),
        type: 'DAILY',
      }),
    ).toBe(false);
    expect(
      testOpen('2026-10-01', '2026-10-31', {
        deletedAt: null,
        type: 'THOUSAND',
      }),
    ).toBe(false);
    expect(
      testOpen('2026-10-01', '2026-10-31', {
        deletedAt: null,
        type: 'EESH_MOCK',
      }),
    ).toBe(false);
    expect(testOpen('2026-10-01', '2026-10-31', null)).toBe(false);
  });
  it('CHAPTER_EXAM classroomRelease-тэй адил нээгдэнэ', () => {
    expect(
      testOpen('2026-10-01', '2026-10-31', {
        deletedAt: null,
        type: 'CHAPTER_EXAM',
      }),
    ).toBe(true);
  });
});

describe('student-hub.logic — зураг илгээх цонх', () => {
  it('өнөөдөр ба өмнөх 13 хоног', () => {
    expect(inUploadWindow('2026-10-31', '2026-10-31')).toBe(true);
    expect(inUploadWindow('2026-10-18', '2026-10-31')).toBe(true);
    expect(inUploadWindow('2026-10-17', '2026-10-31')).toBe(false);
    expect(inUploadWindow('2026-11-01', '2026-10-31')).toBe(false);
  });
});

describe('student-hub.logic — сэдэв, хайлт', () => {
  it('topicOf: бүртгэл → сэдэв → бүлэг, хоосныг алгасна', () => {
    expect(topicOf('Квадрат тэгшитгэл', 'Сэдэв', 'Бүлэг')).toBe(
      'Квадрат тэгшитгэл',
    );
    expect(topicOf(null, '  ', 'Бүлэг')).toBe('Бүлэг');
    expect(topicOf(undefined, null, null)).toBeNull();
  });

  it('хайлт: том жижиг үсэг ялгахгүй (Ү, Ө ч), үг бүр таарна', () => {
    const words = queryWords('  ӨНЦӨГ  үржвэр ');
    expect(words).toEqual(['өнцөг', 'үржвэр']);
    expect(
      matchesWords(words, ['Өнцгийн', 'Векторын скаляр ҮРЖВЭР ба өнцөг']),
    ).toBe(true);
    expect(matchesWords(words, ['Векторын скаляр үржвэр'])).toBe(false);
    expect(matchesWords([], [null])).toBe(true);
    expect(queryWords(undefined)).toEqual([]);
  });
});

describe('student-hub.logic — хуваарь', () => {
  const schedule = {
    id: 's1',
    classroomId: 'c1',
    classroomName: '10А',
    weekday: 2, // Мягмар (JS)
    startMinute: 900,
    endMinute: 990,
    teacherId: 't1',
    teacherName: null,
    room: '201',
    subject: null,
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
  };

  it('resolveRange: долоо хоногуудаар задалж, цуцалсан/зөөсөн exception-ийг тусгана', () => {
    const map = resolveRange(
      '2026-10-01',
      '2026-10-31',
      [schedule],
      [
        {
          scheduleId: 's1',
          date: '2026-10-13',
          kind: 'CANCELLED',
          newDate: null,
          newStartMinute: null,
          newEndMinute: null,
          newRoom: null,
          note: null,
        },
        {
          scheduleId: 's1',
          date: '2026-10-20',
          kind: 'MOVED',
          newDate: '2026-10-21',
          newStartMinute: 600,
          newEndMinute: 690,
          newRoom: '305',
          note: null,
        },
      ],
    );
    expect([...map.keys()].sort()).toEqual([
      'c1|2026-10-06',
      'c1|2026-10-21',
      'c1|2026-10-27',
    ]);
    expect(map.get('c1|2026-10-21')?.[0]).toMatchObject({
      startMinute: 600,
      room: '305',
    });
    expect(map.get('c1|2026-10-27')?.[0]).toMatchObject({
      startMinute: 900,
      endMinute: 990,
      room: '201',
    });
  });

  it('pickToday: дуусаагүй эхнийх, бүгд дууссан бол сүүлийнх', () => {
    const list = [
      { id: 'b', startMinute: 1000, endMinute: 1090 },
      { id: 'a', startMinute: 600, endMinute: 690 },
    ];
    expect(pickToday(list, 500)?.id).toBe('a');
    expect(pickToday(list, 700)?.id).toBe('b');
    expect(pickToday(list, 1200)?.id).toBe('b');
    expect(pickToday([], 0)).toBeNull();
  });

  it('ubMinuteOfDay: UTC 10:00 = УБ 18:00', () => {
    expect(ubMinuteOfDay(new Date('2026-10-31T10:00:00Z'))).toBe(18 * 60);
    expect(ubMinuteOfDay(new Date('2026-10-31T16:30:00Z'))).toBe(30);
  });
});

describe('student-hub.logic — бодлогын харагдац', () => {
  const base = (problem: Partial<HubProblemRow['problem']>): HubProblemRow => ({
    problemId: 'p1',
    order: 3,
    problem: {
      id: 'p1',
      format: 'CHOICE',
      statementText: '$x^2=4$',
      imageKey: null,
      choices: null,
      correctAnswer: null,
      choiceOptions: [],
      youtubeUrl: null,
      ...problem,
    } as HubProblemRow['problem'],
  });

  it('хуучин хэлбэр (choices + үсэг): сонголт A–E, зөв хариу үсгээр', () => {
    const row = base({
      choices: ['1', '2', '3', '4', '5'],
      correctAnswer: 'c',
      youtubeUrl: 'https://youtu.be/x',
    });
    expect(hubProblem(row)).toEqual({
      id: 'p1',
      order: 3,
      stem: '$x^2=4$',
      imageKey: null,
      choices: [
        { label: 'A', text: '1', imageKey: null },
        { label: 'B', text: '2', imageKey: null },
        { label: 'C', text: '3', imageKey: null },
        { label: 'D', text: '4', imageKey: null },
        { label: 'E', text: '5', imageKey: null },
      ],
      correctAnswer: 'C',
      hasVideo: true,
    });
    expect(JSON.stringify(hubProblem(row))).not.toContain('youtu');
  });

  it('ProblemChoice: isCorrect-оос үсэг (эх дарааллаар), зурагтай сонголт', () => {
    const row = base({
      choiceOptions: [
        { order: 2, text: 'b', isCorrect: true, imageKey: 'img-b' },
        { order: 1, text: 'a', isCorrect: false, imageKey: null },
      ],
    });
    const view = hubProblem(row);
    expect(view.choices).toEqual([
      { label: 'A', text: 'a', imageKey: null },
      { label: 'B', text: 'b', imageKey: 'img-b' },
    ]);
    expect(view.correctAnswer).toBe('B');
    expect(view.hasVideo).toBe(false);
  });

  it('placeholder үсэгтэй (LETTER) ба нөхөх бодлого', () => {
    expect(
      correctAnswerOf(
        base({ choices: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'd' }),
      ),
    ).toBe('D');
    const fill = base({
      format: 'FILL_NUMBER',
      statementText: '[a][b]',
      correctAnswer: { b: '5', a: '3' },
    });
    expect(correctAnswerOf(fill)).toBe('a = 3, b = 5');
    expect(hubProblem(fill).choices).toEqual([]);
  });

  it('хариу тодорхойгүй бол null', () => {
    expect(
      correctAnswerOf(
        base({
          choices: ['1', '2'],
          correctAnswer: { reason: 'ANSWER_KEY_MISSING' },
        }),
      ),
    ).toBeNull();
    expect(
      correctAnswerOf(base({ format: 'FILL_NUMBER', correctAnswer: '' })),
    ).toBeNull();
  });
});
