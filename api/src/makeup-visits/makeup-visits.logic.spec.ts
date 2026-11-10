import {
  ROOM_406,
  diffTests,
  hostLessonCovered,
  isAllowedVisitDate,
  matchStudents,
  normalizeName,
  pickHomeClassroom,
  placeKeyOf,
  placeLabel,
  planCreate,
  shortClassName,
} from './makeup-visits.logic';

const st = (id: string, firstName: string, lastName: string, code: string | null = null) => ({
  id,
  firstName,
  lastName,
  code,
});

describe('placeKeyOf', () => {
  it('анги бол id, үгүй бол 406', () => {
    expect(placeKeyOf('cls1')).toBe('cls1');
    expect(placeKeyOf(null)).toBe(ROOM_406);
    expect(placeKeyOf(undefined)).toBe(ROOM_406);
    expect(placeKeyOf('')).toBe(ROOM_406);
  });
});

describe('normalizeName — монгол үсэг', () => {
  it('Ү/ү, Ө/ө, том жижиг ялгахгүй', () => {
    expect(normalizeName('ҮЙЛСТӨР')).toBe('үйлстөр');
    expect(normalizeName('Өнөржаргал')).toBe(normalizeName('өнөрЖАРГАЛ'));
  });
  it('ё → е, илүү зай, цэг', () => {
    expect(normalizeName('  Бат.  Эрдэнэ ')).toBe('бат эрдэнэ');
    expect(normalizeName('Алёна')).toBe('алена');
    expect(normalizeName(null)).toBe('');
  });
});

describe('matchStudents', () => {
  const list = [
    st('1', 'Мишээл', 'Батболд', 'B27120001'),
    st('2', 'Мишээл', 'Ганзориг'),
    st('3', 'Энхмишээл', 'Дорж'),
    st('4', 'Өнөр', 'Мишээлт'),
    st('5', 'Анар', 'Болд'),
  ];
  it('ижил нэртэй БҮХ сурагч, нэрээр эхэлсэн нь эхэнд', () => {
    expect(matchStudents('мишээл', list).map((s) => s.id)).toEqual(['1', '2', '3', '4']);
  });
  it('том үсгээр бичсэн ч олно', () => {
    expect(matchStudents('МИШЭЭЛ', list).map((s) => s.id)).toEqual(['1', '2', '3', '4']);
  });
  it('Ө/ө — өнөр', () => {
    expect(matchStudents('ӨНӨР', list).map((s) => s.id)).toEqual(['4']);
  });
  it('овог + нэр (үг бүр тохирох ёстой)', () => {
    expect(matchStudents('ганз миш', list).map((s) => s.id)).toEqual(['2']);
    expect(matchStudents('б мишээл', list).map((s) => s.id)).toEqual(['1']);
  });
  it('кодоор', () => {
    expect(matchStudents('b2712', list).map((s) => s.id)).toEqual(['1']);
  });
  it('хэт богино хайлт хоосон', () => {
    expect(matchStudents('м', list)).toEqual([]);
    expect(matchStudents('   ', list)).toEqual([]);
  });
  it('хязгаар', () => {
    const many = Array.from({ length: 50 }, (_, i) => st(String(i), 'Мишээл', `Овог${i}`));
    expect(matchStudents('мишээл', many, 10)).toHaveLength(10);
  });
});

describe('pickHomeClassroom', () => {
  const d = (s: string) => new Date(s);
  it('өөрийн ангид зочноор нэмэхгүй', () => {
    expect(
      pickHomeClassroom([{ classroomId: 'A', classroomType: 'IN_PERSON', joinedAt: d('2026-09-01') }], 'A'),
    ).toEqual({ ok: false, reason: 'OWN_CLASS' });
  });
  it('танхимын анги онлайнаас түрүүлнэ, дараа нь сүүлд элссэн', () => {
    expect(
      pickHomeClassroom(
        [
          { classroomId: 'ON', classroomType: 'ONLINE', joinedAt: d('2026-10-01') },
          { classroomId: 'OLD', classroomType: 'IN_PERSON', joinedAt: d('2026-09-01') },
          { classroomId: 'NEW', classroomType: 'IN_PERSON', joinedAt: d('2026-10-05') },
        ],
        'HOST',
      ),
    ).toEqual({ ok: true, homeClassroomId: 'NEW' });
  });
  it('ангигүй сурагч → null; 406 (host=null) дээр OWN_CLASS хэзээ ч биш', () => {
    expect(pickHomeClassroom([], 'HOST')).toEqual({ ok: true, homeClassroomId: null });
    expect(
      pickHomeClassroom([{ classroomId: 'A', classroomType: 'IN_PERSON', joinedAt: d('2026-09-01') }], null),
    ).toEqual({ ok: true, homeClassroomId: 'A' });
  });
});

describe('isAllowedVisitDate', () => {
  it('өнөөдөр, өнгөрсөн — болно; ирээдүй, буруу формат — үгүй', () => {
    expect(isAllowedVisitDate('2026-11-08', '2026-11-08')).toBe(true);
    expect(isAllowedVisitDate('2026-10-01', '2026-11-08')).toBe(true);
    expect(isAllowedVisitDate('2026-11-09', '2026-11-08')).toBe(false);
    expect(isAllowedVisitDate('2026-11-8', '2026-11-08')).toBe(false);
  });
});

describe('hostLessonCovered', () => {
  const titles: Record<string, string> = { t1: 'Урвуу функц 1', t2: 'Урвуу функц 2', t3: 'Лог 1' };
  const titleOf = (id: string) => titles[id];
  it('баталсан хичээл байвал ЗӨВХӨН түүгээр (төлөвлөгөөг үл тоомсорлоно)', () => {
    expect(
      hostLessonCovered({
        sessions: [
          { testId: 't1', manualTitle: null },
          { testId: null, manualTitle: 'Гаднын тест' },
        ],
        planned: [{ testIds: ['t3'], customTopics: ['Давтлага'] }],
        titleOf,
      }),
    ).toEqual([
      { testId: 't1', title: 'Урвуу функц 1', source: 'CONFIRMED' },
      { testId: null, title: 'Гаднын тест', source: 'CONFIRMED' },
    ]);
  });
  it('батлаагүй бол төлөвлөгөө, давхардалгүй (хоёр хичээл ижил тесттэй)', () => {
    expect(
      hostLessonCovered({
        sessions: [],
        planned: [
          { testIds: ['t1', 't2'], customTopics: ['Иррац шалгалт'] },
          { testIds: ['t2'], customTopics: ['иррац  шалгалт'] },
        ],
        titleOf,
      }),
    ).toEqual([
      { testId: 't1', title: 'Урвуу функц 1', source: 'PLANNED' },
      { testId: 't2', title: 'Урвуу функц 2', source: 'PLANNED' },
      { testId: null, title: 'Иррац шалгалт', source: 'PLANNED' },
    ]);
  });
  it('төлөвлөгөөгүй, батлаагүй → хоосон; устсан тестийн нэр «Тест»', () => {
    expect(hostLessonCovered({ sessions: [], planned: [], titleOf })).toEqual([]);
    expect(
      hostLessonCovered({ sessions: [{ testId: 'gone', manualTitle: null }], planned: [], titleOf }),
    ).toEqual([{ testId: 'gone', title: 'Тест', source: 'CONFIRMED' }]);
  });
});

describe('diffTests', () => {
  it('байгааг хөндөхгүй, шинийг нэмж, хассаныг устгана', () => {
    const r = diffTests(
      [
        { id: 'r1', testId: 't1', title: 'A' },
        { id: 'r2', testId: 't2', title: 'B' },
        { id: 'r3', testId: null, title: 'Давтлага' },
      ],
      [
        { testId: 't2', title: 'B' },
        { testId: 't3', title: 'C' },
        { testId: null, title: ' давтлага ' },
      ],
    );
    expect(r.remove).toEqual(['r1']);
    expect(r.add).toEqual([{ testId: 't3', title: 'C' }]);
  });
  it('хүссэн жагсаалтын давхардал, хоосон нэр, хуучин давхар мөр', () => {
    const r = diffTests(
      [
        { id: 'r1', testId: 't1', title: 'A' },
        { id: 'r2', testId: 't1', title: 'A' },
      ],
      [
        { testId: 't1', title: 'A' },
        { testId: 't1', title: 'A' },
        { testId: null, title: '   ' },
      ],
    );
    expect(r).toEqual({ add: [], remove: ['r2'] });
  });
  it('бүгдийг хасах', () => {
    expect(diffTests([{ id: 'r1', testId: 't1', title: 'A' }], [])).toEqual({ add: [], remove: ['r1'] });
  });
});

describe('planCreate', () => {
  it('давхар id-г нэг болгож, аль хэдийн бүртгэгдсэнийг алгасна', () => {
    expect(planCreate(['a', 'b', 'a', '', 'c'], new Set(['b']))).toEqual({
      create: ['a', 'c'],
      skipped: [{ studentId: 'b', reason: 'DUPLICATE' }],
    });
  });
});

describe('placeLabel', () => {
  it('ангийн богино нэр / 406', () => {
    expect(placeLabel('12-6 (Баруун 4)')).toBe('12-6 ангид нөхөж суусан');
    expect(placeLabel(null)).toBe('406-д нөхөж хийсэн');
    expect(shortClassName('НИЙГЭМ (Зүүн 4)')).toBe('НИЙГЭМ');
  });
});
