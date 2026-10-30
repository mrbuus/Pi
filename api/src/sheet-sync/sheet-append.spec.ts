import { DbStudent, UnmatchedRow } from './payment-plan';
import {
  AppendCandidate,
  editDistance,
  findSumFormula,
  freeRows,
  isoToSerial,
  judge,
  rowIsFree,
  rowWrites,
  sectionFor,
  startDateFor,
  sumFormulaFor,
  toRequests,
  verifyWritten,
  writeHeaderProblems,
} from './sheet-append';

const kid = (over: Partial<AppendCandidate> = {}): AppendCandidate => ({
  id: 'u1',
  lastName: 'Баярбал',
  firstName: 'Халиун',
  phone: '99112233',
  fatherPhone: '88112233',
  motherPhone: null,
  school: '1-р сургууль',
  grade: 12,
  joinedOn: '2026-10-28',
  firstPresent: '2026-10-28',
  classrooms: ['13-3 (Зүүн 4)'],
  ...over,
});
const row = (over: Partial<UnmatchedRow> = {}): UnmatchedRow => ({
  tab: 'Суудал баталгаажуулалт',
  row: 50,
  rowKey: 'x',
  lastName: 'Өөр',
  firstName: 'Хүүхэд',
  phone: '90000000',
  fatherPhone: null,
  motherPhone: null,
  section: '12-1',
  branch: null,
  school: null,
  grade: null,
  start: null,
  form: null,
  paidTotal: 0,
  ...over,
});
const ctx = (over: Partial<Parameters<typeof judge>[1]> = {}) => ({ today: '2026-10-30', unmatched: [], students: [] as DbStudent[], matched: new Set<string>(), ...over });
const HEADER = ['89', 'Овог', 'Нэр', 'Анги', 'Өөрийн утас', 'Аав', 'Ээж', 'Сургууль', 'Анги', '', 'Сууж эхэлсэн өдөр', 'Урьдчилгаа', 'Салбар', 'Хэлбэр'];

describe('шийтэд шинэ хүүхэд нэмэх', () => {
  it('эхэлсэн өдөр = анх ирсэн өдөр; ирц бүртгэхээс өмнө эхэлсэн бол бүртгэлийн огноо', () => {
    expect(startDateFor({ joinedOn: '2026-10-28', firstPresent: '2026-10-30' })).toBe('2026-10-30');
    expect(startDateFor({ joinedOn: '2026-11-02', firstPresent: '2026-10-30' })).toBe('2026-10-30');
    expect(startDateFor({ joinedOn: '2026-09-01', firstPresent: '2026-10-28' })).toBe('2026-09-01');
    expect(startDateFor({ joinedOn: null, firstPresent: '2026-10-28' })).toBe('2026-10-28');
  });

  it('анги: «12-4» хэлбэрийн ганц анги; Нийгэм эсвэл хоёр анги бол нэмэхгүй', () => {
    expect(sectionFor(['13-3 (Зүүн 4)'])).toEqual({ section: '13-3', branch: 'Зүүн 4' });
    expect(sectionFor(['12-4 (Баруун 4)', 'НИЙГЭМ (Зүүн 4)'])).toEqual({ section: '12-4', branch: 'Баруун 4' });
    expect(sectionFor(['НИЙГЭМ (Зүүн 4)'])).toHaveProperty('error');
    expect(sectionFor(['12-4 (Баруун 4)', '12-5 (Баруун 4)'])).toHaveProperty('error');
  });

  it('аюулгүй нөхцөл: овог, утас, ирээдүйн огноо, давхар бүртгэл, төстэй мөр', () => {
    expect(judge(kid(), ctx())).toEqual({ ok: true, row: { section: '13-3', branch: 'Зүүн 4', start: '2026-10-28' } });
    expect(judge(kid({ lastName: '' }), ctx()).ok).toBe(false);
    expect(judge(kid({ phone: '123' }), ctx()).ok).toBe(false);
    expect(judge(kid({ firstPresent: '2026-10-31', joinedOn: null }), ctx()).ok).toBe(false);
    const twin = { id: 'u2', firstName: 'Халиун', lastName: 'Баярбал' } as DbStudent;
    expect(judge(kid(), ctx({ students: [twin], matched: new Set(['u2']) })).ok).toBe(false);
    // үсгийн алдаатай ижил хүүхэд шийтэд холбогдоогүй байна
    expect(judge(kid(), ctx({ unmatched: [row({ lastName: 'Баярбаал', firstName: 'Халиун' })] })).ok).toBe(false);
    // ижил утастай мөр төлбөрийн хуудсанд
    expect(judge(kid(), ctx({ unmatched: [row({ fatherPhone: '88112233' })] })).ok).toBe(false);
    // «гарсан» хуудсанд эцгийн утас ижил ч нэр огт өөр — ах/эгч нь, саадгүй
    expect(judge(kid(), ctx({ unmatched: [row({ tab: 'гарсан', fatherPhone: '88112233', firstName: 'Тэмүүлэн' })] })).ok).toBe(true);
  });

  it('засварын зай', () => {
    expect(editDistance('булггантамир', 'булгантамир')).toBe(1);
    expect(editDistance('', 'аб')).toBe(2);
  });

  it('сул мөр: бөглөсөн хамгийн доод мөрийн дараах дугаартай хоосон мөр, дугаарыг хадгална', () => {
    const grid = [HEADER, [], [1, 'А', 'Б'], [2, 'В', 'Г'], [3], [4]];
    expect(freeRows(grid, 3, 100)).toEqual([
      { row: 5, number: null },
      { row: 6, number: null },
      { row: 7, number: 5 },
    ]);
    // дугааргүй бол өмнөхөөс +1
    expect(freeRows([HEADER, [], [7, 'А', 'Б']], 1, 100)).toEqual([{ row: 4, number: 8 }]);
    // нэргүй боловч агуулгатай мөр (нийлбэр) тааралдвал зогсоно
    expect(freeRows([HEADER, [], [1, 'А', 'Б'], ['', '', '', '', '', '', '', '', '', '', '', 'Нийт']], 2, 100)).toEqual([]);
    // хуудасны мөр дууссан
    expect(freeRows([HEADER, [], [1, 'А', 'Б']], 2, 3)).toEqual([]);
    expect(rowIsFree([12])).toBe(true);
    expect(rowIsFree(['тайлбар'])).toBe(false);
    expect(rowIsFree([12, '', 'x'])).toBe(false);
  });

  it('урьдчилгааны томьёог шинэ мөрөнд хуулна (зөвхөн нэг мөрийн нийлбэр)', () => {
    expect(sumFormulaFor('=sum(O696,R696,U696)', 696, 697)).toBe('=sum(O697,R697,U697)');
    expect(sumFormulaFor('=sum(O696,R695)', 696, 697)).toBeNull();
    expect(sumFormulaFor(350000, 696, 697)).toBeNull();
    const grid = [HEADER, [], [1, 'А', 'Б', '', '', '', '', '', '', '', '', '=sum(O3,R3)'], [2, 'В', 'Г', '', '', '', '', '', '', '', '', 300000]];
    expect(findSumFormula(grid)).toEqual({ row: 3, formula: '=sum(O3,R3)' });
  });

  it('гарчиг өөрчлөгдвөл бичихгүй', () => {
    expect(writeHeaderProblems(HEADER)).toEqual([]);
    const moved = [...HEADER];
    moved[4] = 'Аав';
    expect(writeHeaderProblems(moved).length).toBeGreaterThan(0);
  });

  it('нүднүүд: текст нь томьёо болохгүй, анги огноо болохгүй, огноо серийн дугаар + формат', () => {
    const k = kid({ lastName: '=HYPERLINK("x")' });
    const r = { section: '13-3', branch: 'Зүүн 4', start: '2026-10-28' };
    const writes = rowWrites(k, r, { row: 697, number: null }, { today: '2026-10-30', formula: '=sum(O697)' });
    const by = Object.fromEntries(writes.map((w) => [w.col, w]));
    expect(by[0]).toBeUndefined(); // урьдчилж бичсэн дугаарт хүрэхгүй
    expect(by[1].value).toEqual({ stringValue: '=HYPERLINK("x")' });
    expect(by[1].note).toContain('pimath.mn');
    expect(by[3].value).toEqual({ stringValue: '12-р анги' });
    expect(by[4].value).toEqual({ numberValue: 99112233 });
    expect(by[6]).toBeUndefined(); // ээжийн утас алга — хоосон үлдэнэ
    expect(by[8].value).toEqual({ stringValue: '13-3' });
    expect(by[9].value).toEqual({ stringValue: 'Шинэ' });
    expect(by[10]).toEqual({ col: 10, value: { numberValue: isoToSerial('2026-10-28') }, dateFormat: 'mm/dd' });
    expect(by[11].value).toEqual({ formulaValue: '=sum(O697)' });
    expect(by[12].value).toEqual({ stringValue: 'зүүн' });
    expect(by[13]).toBeUndefined(); // хэлбэрийг ажилтан бөглөнө
    expect(isoToSerial('2026-09-01')).toBe(46266);

    const req = toRequests(5, 697, writes);
    expect(req).toHaveLength(writes.length);
    expect(req.find((q) => q.updateCells.range.startColumnIndex === 10)?.updateCells.fields).toBe('userEnteredValue,userEnteredFormat.numberFormat');
    expect(req.every((q) => q.updateCells.range.startRowIndex === 696 && q.updateCells.range.endRowIndex === 697)).toBe(true);
  });

  it('буцааж уншаад шалгана', () => {
    const r = { section: '13-3', branch: 'Зүүн 4', start: '2026-10-28' };
    const back = [695, 'Баярбал', 'Халиун', '12-р анги', 99112233, 88112233, '', '1-р сургууль', '13-3', 'Шинэ', isoToSerial('2026-10-28')];
    expect(verifyWritten(back, kid(), r)).toBe(true);
    expect(verifyWritten([...back.slice(0, 2), 'Өөр', ...back.slice(3)], kid(), r)).toBe(false);
  });
});
