import { classifyTransaction, explainBooks } from './huulga-classify';
import type { MatchResult } from './huulga-match';

const kid: MatchResult = { decision: 'AUTO', candidates: [{ studentId: 'k', score: 2, signals: ['NAME', 'SURNAME'] }] };
const none: MatchResult = { decision: 'NONE', candidates: [] };
const c = (amount: number, description: string, match: MatchResult = kid, direction: 'CREDIT' | 'DEBIT' = 'CREDIT') =>
  classifyTransaction({ amount, description, direction }, match);

describe('номын дүн', () => {
  it('E1, E2 хослол (дүнгээр тайлбарлагдана; аль хослол нь гэдгийг хүн утгаас харна)', () => {
    const price = { E1: 30_000, E2: 40_000 } as Record<string, number>;
    const total = (b: Record<string, number> | null) => Object.entries(b ?? {}).reduce((t, [n, k]) => t + price[n] * k, 0);
    expect(total(explainBooks(800_000))).toBe(800_000); // «Дэвтэр1-24ш дэвтэр2-2ш»
    expect(explainBooks(70_000)).toEqual({ E1: 1, E2: 1 });
    expect(explainBooks(30_000)).toEqual({ E1: 1 });
  });
  it('Хавтгайн геометр бөөний үнээр (874,000 = 38 × 23,000)', () => {
    expect(explainBooks(874_000)).toEqual({ 'Хавтгайн геометр': 38 });
  });
  it('тайлбарлагдахгүй дүн', () => {
    expect(explainBooks(19_300)).toBeNull();
  });
});

describe('ангилал', () => {
  it('сургалтын төлбөр', () => {
    expect(c(350_000, 'Тэмүүлэн 99110002')).toMatchObject({ kind: 'TUITION', confident: true });
    expect(c(2_150_000, '12-2 Тэмүүлэн бүтэн жил')).toMatchObject({ kind: 'TUITION', confident: true });
  });
  it('350,000-г «300,000 + 2 геометр» гэж хуваахгүй', () => {
    expect(c(350_000, 'Тэмүүлэн').split).toBeUndefined();
  });
  it('сургалт + ном хольсон → хуваалтын санал (380,000 = 350,000 + E1)', () => {
    expect(c(380_000, 'Тэмүүлэн 99110002')).toMatchObject({
      kind: 'TUITION',
      confident: false,
      split: [{ kind: 'TUITION', amount: 350_000 }, { kind: 'BOOK', amount: 30_000 }],
    });
  });
  it('номын мөнгө: «ном» гэдэг үгтэй, нэрэнд биш', () => {
    expect(c(40_000, '12-1 B.Munkhtulga 2-r nom')).toMatchObject({ kind: 'BOOK', confident: true });
    expect(c(40_000, '12-1 Номинжин')).toMatchObject({ kind: 'BOOK' }); // дүн нь E2
    expect(c(350_000, '12-7 Э.Номинжин')).toMatchObject({ kind: 'TUITION', confident: true });
  });
  it('хариултын хуудас (1,000₮) ба «хариулт» гэдэг үг', () => {
    expect(c(1_000, 'regzedmaa')).toMatchObject({ kind: 'ANSWER_SHEET', confident: true });
    expect(c(60_000, 'ЗҮҮН 4 ХАРИУЛТЫН ХУУДАС', none)).toMatchObject({ kind: 'ANSWER_SHEET' });
  });
  it('заалны торгууль 30,000 нь E1-тэй ижил дүн ч үгээр ялгарна', () => {
    expect(c(30_000, 'GNZY ZAAL', none)).toMatchObject({ kind: 'STAFF_FINE', confident: true });
    expect(c(15_000, 'torguuli sainsanaa', none)).toMatchObject({ kind: 'STAFF_FINE' });
  });
  it('зарлага', () => {
    expect(c(200, 'Ухаалаг банкны үйлчилгээний хураамж', none, 'DEBIT')).toMatchObject({ kind: 'EXPENSE', confident: true });
  });
  it('хүүхэдгүй том дүн → данс хоорондын шилжүүлэг (хүн батална)', () => {
    expect(c(100_000_000, 'сургалтын төлбөрүүд', none)).toMatchObject({ kind: 'TRANSFER', confident: false });
  });
  it('хүүхэдгүй дунд дүн → бусад (хүн шийднэ)', () => {
    expect(c(784_000, 'Баянхонгор аймаг', none)).toMatchObject({ kind: 'OTHER', confident: false });
  });
});
