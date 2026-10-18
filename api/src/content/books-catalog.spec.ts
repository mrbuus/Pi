import { TestGradingMode, TestType } from '../generated/prisma/enums';
import { freeTestIds, numSuffix, topicOf, type ChapterLite, type TestLite } from './books-catalog.service';
import { phaseOf } from '../mock-exams/mock-exams.service';

const t = (id: string, title: string, o: Partial<TestLite> = {}): TestLite => ({
  id, title, variantLabel: null, groupKey: null, createdAt: new Date(2026, 0, 1), gradingMode: TestGradingMode.AUTO, type: TestType.DAILY, problemCount: 8, ...o,
});
const ch = (id: string, title: string, order: number, tests: TestLite[], freePreview = false): ChapterLite => ({ id, title, order, freePreview, tests });

describe('Номын каталог — үнэгүй тестийн дүрэм', () => {
  it('сэдвийн нэр ба дугаарыг зөв задална', () => {
    expect(topicOf('Тоо тоолол · Тест 1')).toBe('Тоо тоолол');
    expect(topicOf('Аналитик геометр')).toBe('Аналитик геометр');
    expect(numSuffix('Аналитик геометр 12')).toBe(12);
    expect(numSuffix('1000 бодлого · Сорил 3-A')).toBe(3);
    expect(numSuffix('Хавтгай геометр')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('100x100 загвар: сэдэв бүрийн эхний бүлгийн A ба B хувилбар үнэгүй, бусад түгжээтэй', () => {
    const chapters = [
      ch('c1', 'Тоо тоолол · Тест 1', 101, [t('a1', 'Тоо тоолол 1', { variantLabel: 'A', groupKey: 'g1' }), t('b1', 'Тоо тоолол 1', { variantLabel: 'B', groupKey: 'g1' })]),
      ch('c2', 'Тоо тоолол · Тест 2', 102, [t('a2', 'Тоо тоолол 2', { variantLabel: 'A', groupKey: 'g2' }), t('b2', 'Тоо тоолол 2', { variantLabel: 'B', groupKey: 'g2' })]),
      ch('c3', 'Рациональ тэгшитгэл · Тест 1', 201, [t('a3', 'Рациональ тэгшитгэл 1', { variantLabel: 'A', groupKey: 'g3' })]),
    ];
    expect([...freeTestIds(chapters)].sort()).toEqual(['a1', 'a3', 'b1']);
  });

  it('300x300 загвар: бүлэг = сэдэв, дугаарласан тестүүдээс зөвхөн эхнийх (огноо биш, нэрний дугаараар)', () => {
    const chapters = [ch('c', 'Аналитик геометр', 1, [
      t('x3', 'Аналитик геометр 3', { createdAt: new Date(2026, 0, 1), groupKey: 'Аналитик геометр' }),
      t('x1', 'Аналитик геометр 1', { createdAt: new Date(2026, 0, 5), groupKey: 'Аналитик геометр' }),
      t('x2', 'Аналитик геометр 2', { groupKey: 'Аналитик геометр' }),
    ])];
    expect([...freeTestIds(chapters)]).toEqual(['x1']);
  });

  it('гар дүнтэй эсвэл бодлогогүй тестийг үнэгүй гэж өгөхгүй; freePreview бүлэг нэмэгдэнэ', () => {
    const chapters = [
      ch('h1', 'Хавтгай геометр I', 1, [t('m1', 'Тест 1', { gradingMode: TestGradingMode.MANUAL, problemCount: 0 })]),
      ch('p1', 'Логарифм · Тест 1', 10, [t('l1', 'Логарифм 1')]),
      ch('p2', 'Логарифм · Тест 2', 11, [t('l2', 'Логарифм 2')], true),
      ch('p3', 'Логарифм · Тест 3', 12, [t('l3', 'Логарифм 3')]),
    ];
    expect([...freeTestIds(chapters)].sort()).toEqual(['l1', 'l2']);
  });
});

describe('Үнэгүй тест — онцгой тохиолдол', () => {
  it('эхний бүлэг нь гар дүнтэй бол дараагийн онлайн бүлгийн эхний тест үнэгүй', () => {
    const chapters = [
      ch('s1', 'Сорил · 1', 1, [t('m', 'Сорил 1', { gradingMode: TestGradingMode.MANUAL })]),
      ch('s2', 'Сорил · 2', 2, [t('a', 'Сорил 2')]),
      ch('s3', 'Сорил · 3', 3, [t('b', 'Сорил 3')]),
    ];
    expect([...freeTestIds(chapters)]).toEqual(['a']);
  });
  it('бүтэн сорил (1000 бодлого, ЭЕШ сорил) үнэгүй өгөгдөхгүй', () => {
    const chapters = [ch('k', '1000 бодлого · Сорил 7-A', 1, [t('x', 'Сорил 7-A', { type: TestType.THOUSAND })]), ch('e', 'ЭЕШ · 1', 2, [t('y', 'ЭЕШ 1', { type: TestType.EESH_MOCK })])];
    expect(freeTestIds(chapters).size).toBe(0);
  });
});

describe('Жишиг сорилын үе шат', () => {
  const ev = { startsAt: new Date('2026-10-18T03:00:00Z'), endsAt: new Date('2026-10-18T03:30:00Z') };
  it('эхлэхээс өмнө upcoming, цонхонд live, дараа нь done', () => {
    expect(phaseOf(ev, new Date('2026-10-18T02:59:00Z'))).toBe('upcoming');
    expect(phaseOf(ev, new Date('2026-10-18T03:10:00Z'))).toBe('live');
    expect(phaseOf(ev, new Date('2026-10-18T03:31:00Z'))).toBe('done');
  });
});
