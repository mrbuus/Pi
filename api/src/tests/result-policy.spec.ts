import { manualResultSource, overrideError, resultLock } from './result-policy';

describe('TestResult.source — тестийн төрлөөр (CHAPTER_EXAM гэж бүгдийг бичихгүй)', () => {
  it.each([
    ['CHAPTER_EXAM', 'CHAPTER_EXAM'],
    ['EESH_MOCK', 'MANUAL_ENTRY'],
    ['THOUSAND', 'MANUAL_ENTRY'],
    ['DAILY', 'MANUAL_ENTRY'],
  ])('%s → %s', (type, source) => {
    expect(manualResultSource(type)).toBe(source);
  });
});

describe('Онлайн дүнгийн түгжээ', () => {
  it('онлайн дүн → ONLINE, гар дүн → түгжээгүй', () => {
    expect(resultLock({ source: 'ONLINE_TEST' }, { status: 'SUBMITTED' })).toBe(
      'ONLINE',
    );
    expect(resultLock({ source: 'MANUAL_ENTRY' }, null)).toBeNull();
    // гар дүн байхад сесс эхэлсэн байсан ч гар дүн давамгайлна
    expect(
      resultLock({ source: 'CHAPTER_EXAM' }, { status: 'SUBMITTED' }),
    ).toBeNull();
  });
  it('сурагч одоо өгч байна → IN_PROGRESS', () => {
    expect(resultLock(null, { status: 'IN_PROGRESS' })).toBe('IN_PROGRESS');
  });

  it('Багш онлайн дүнг засахгүй — шалтгаантай ч', () => {
    expect(overrideError('ONLINE', 'TEACHER', 'Хуудас солигдсон')).toMatch(
      /Багш\+/,
    );
  });
  it('Багш+/Админ — шалтгаангүй бол татгалзана, шалтгаантай бол зөвшөөрнө', () => {
    expect(overrideError('ONLINE', 'TEACHER_PLUS', '')).toMatch(/шалтгаан/);
    expect(overrideError('ONLINE', 'ADMIN', '  ')).toMatch(/шалтгаан/);
    expect(
      overrideError('ONLINE', 'TEACHER_PLUS', 'Хариуны түлхүүр буруу байсан'),
    ).toBeNull();
    expect(overrideError('ONLINE', 'ADMIN', 'Зассан')).toBeNull();
  });
  it('өгч байх үед хэн ч гар дүн бичихгүй', () => {
    expect(overrideError('IN_PROGRESS', 'ADMIN', 'шалтгаан')).toMatch(
      /өгч байна/,
    );
  });
  it('түгжээгүй мөр — хэнд ч саадгүй', () => {
    expect(overrideError(null, 'TEACHER', undefined)).toBeNull();
  });
});
