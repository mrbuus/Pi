// Банкны гүйлгээ ямар зориулалттай вэ: сургалт, ном, хариултын хуудас, заалны
// торгууль, зарлага, бусад. ЦЭВЭР функц.
//
// Үнийг эзэн 2026-11-05-нд хэлсэн. Хуулгын 230 «төлбөр биш» орлогоор шалгахад
// 144 ном, 15 хариултын хуудас, 9 «сургалт + ном» хольсон төлбөр тайлбарлагдсан.

import type { MatchResult } from './huulga-match';

export type AllocKind = 'TUITION' | 'BOOK' | 'ANSWER_SHEET' | 'STAFF_FINE' | 'TRANSFER' | 'EXPENSE' | 'OTHER';

export const HUULGA_PRICES = {
  /** Шалгалтын хариултын хуудас — хэвлэлийн компаниас захиалдаг, ширхэг бүр */
  answerSheet: 1_000,
  /** Ном: жижиглэн үнэ; bulk = ангиар бөөнөөр авахад (хөнгөлөлттэй) */
  books: [
    { name: 'E1', price: 30_000 },
    { name: 'E2', price: 40_000 },
    { name: 'Хавтгайн геометр', price: 25_000, bulk: 23_000 },
  ] as { name: string; price: number; bulk?: number }[],
  /** Сарын сургалтын төлбөр (ledger.ts PRICE_TIERS-тэй ижил) */
  tuitionMonthly: [300_000, 350_000],
  /** Түүнээс доош дүн сургалтын төлбөр байх магадлал бараг үгүй (807-оос 2) */
  tuitionMin: 50_000,
  /** Түүнээс дээш ганц гүйлгээ — данс хоорондын шилжүүлэг */
  transferMin: 10_000_000,
};

export const ALLOC_LABEL: Record<AllocKind, string> = {
  TUITION: 'Сургалтын төлбөр',
  BOOK: 'Ном',
  ANSWER_SHEET: 'Хариултын хуудас',
  STAFF_FINE: 'Заалны торгууль',
  TRANSFER: 'Данс хоорондын шилжүүлэг',
  EXPENSE: 'Зарлага',
  OTHER: 'Бусад',
};

// Үгийн хил: «Номин», «Nomin-Erdene» нэрэнд таарахгүй
const NOT_LETTER = '[^\\p{L}]';
const KW = {
  fine: new RegExp(`(^|${NOT_LETTER})(zaal|заал|torguul\\p{L}*|торгуул\\p{L}*)`, 'iu'),
  sheet: /хариулт|hariult|шалгалтын цаас|shalgaltiin tsaas/iu,
  book: new RegExp(
    `(^|${NOT_LETTER})(ном|nom|book)(ын|ны|ний|нь|ууд|iin|nii|uud)?(${NOT_LETTER}|$)|боть|дэвтэр|devter|геометр|geometr|havtga|хавтга|(^|[^\\p{L}\\d])e-?[12](${NOT_LETTER}|$)|\\d\\s*ш(${NOT_LETTER}|$)|\\d\\s*(sh|shirheg)(${NOT_LETTER}|$)`,
    'iu',
  ),
  tuition: /сургалт|surgalt|төлбөр|tulbur|tolbor|сар|sar(iin|in)?\b|2027|урьдчилгаа|uridchilgaa/iu,
};

/** Дүнг ном(ууд)-ын үнээр яг тайлбарлах уу — жижиг тоогоор (bounded search) */
export function explainBooks(amount: number, maxEach = 60, only?: string[]): Record<string, number> | null {
  const prices: { name: string; price: number }[] = [];
  for (const b of HUULGA_PRICES.books) {
    if (only && !only.includes(b.name)) continue;
    prices.push({ name: b.name, price: b.price });
    if (b.bulk) prices.push({ name: b.name, price: b.bulk });
  }
  // Ихэнх тохиолдол 1–2 төрөл: эхлээд нэг төрлөөр, дараа нь хоёр төрлөөр
  for (const p of prices) if (amount % p.price === 0 && amount / p.price <= maxEach) return { [p.name]: amount / p.price };
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++) {
      if (prices[i].name === prices[j].name) continue;
      for (let a = 1; a <= maxEach; a++) {
        const rest = amount - a * prices[i].price;
        if (rest <= 0) break;
        if (rest % prices[j].price === 0 && rest / prices[j].price <= maxEach)
          return { [prices[i].name]: a, [prices[j].name]: rest / prices[j].price };
      }
    }
  return null;
}

export interface SplitPart {
  kind: AllocKind;
  amount: number;
}

export interface Classification {
  kind: AllocKind;
  /** true = хүнгүйгээр шийдэж болно (match.decision AUTO-тэй хамт сургалтад) */
  confident: boolean;
  /** Хольсон төлбөрийн санал болгох хуваалт (сургалт + ном) */
  split?: SplitPart[];
  /** Хүнд харагдах товч шалтгаан */
  reason: string;
}

export function classifyTransaction(
  tx: { direction: 'CREDIT' | 'DEBIT'; amount: number; description: string },
  match: MatchResult,
): Classification {
  const text = tx.description ?? '';
  const hasKid = match.decision !== 'NONE';
  if (tx.direction === 'DEBIT') return { kind: 'EXPENSE', confident: true, reason: 'Зарлага' };
  if (KW.fine.test(text)) return { kind: 'STAFF_FINE', confident: true, reason: 'Утгад «заал/торгууль»' };
  if (KW.sheet.test(text)) return { kind: 'ANSWER_SHEET', confident: true, reason: 'Утгад «хариулт»' };
  if (tx.amount === HUULGA_PRICES.answerSheet) return { kind: 'ANSWER_SHEET', confident: true, reason: '1,000₮ — хариултын хуудас' };

  const books = explainBooks(tx.amount);
  const bookWord = KW.book.test(text);
  if (bookWord && books) return { kind: 'BOOK', confident: true, reason: `Ном: ${bookList(books)}` };
  if (tx.amount < HUULGA_PRICES.tuitionMin) {
    if (books) return { kind: 'BOOK', confident: hasKid, reason: `Ном: ${bookList(books)}` };
    return { kind: 'OTHER', confident: false, reason: 'Бага дүн, тайлбаргүй' };
  }
  if (bookWord && !KW.tuition.test(text)) return { kind: 'BOOK', confident: false, reason: 'Утгад «ном», дүн нь номын үнэтэй таарахгүй' };

  // «Сургалт + ном» хольсон: 380,000 = 350,000 + E1. Сургалтын бүх үнэ 50,000-ийн
  // үржвэр тул тийм дүнг хуваахгүй (350,000 ≠ 300,000 + 2 геометр); хувь хүн
  // сургалттайгаа хамт авдаг нь E1/E2 (геометрийг ангиар бөөнөөр авдаг).
  // Ойрын (их) сарын үнээс эхэлнэ: 380,000 = 350,000 + E1 (300,000 + 2×E2 биш)
  for (const m of tx.amount % 50_000 === 0 ? [] : [...HUULGA_PRICES.tuitionMonthly].sort((a, b) => b - a)) {
    const rest = tx.amount - m;
    const b = rest > 0 ? explainBooks(rest, 3, ['E1', 'E2']) : null;
    if (b && hasKid)
      return {
        kind: 'TUITION',
        confident: false,
        split: [{ kind: 'TUITION', amount: m }, { kind: 'BOOK', amount: rest }],
        reason: `Сургалт ${m.toLocaleString('en-US')} + ном ${bookList(b)}`,
      };
  }
  if (!hasKid && tx.amount >= HUULGA_PRICES.transferMin) return { kind: 'TRANSFER', confident: false, reason: 'Том дүн, хүүхэдгүй' };
  if (hasKid) return { kind: 'TUITION', confident: true, reason: 'Сургалтын төлбөр' };
  return { kind: 'OTHER', confident: false, reason: 'Хүүхэд танигдсангүй' };
}

function bookList(b: Record<string, number>): string {
  return Object.entries(b)
    .map(([n, c]) => `${n} ${c}ш`)
    .join(', ');
}
