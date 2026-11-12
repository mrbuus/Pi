// Банкны гүйлгээ → хүүхэд. ЦЭВЭР функц (I/O-гүй).
//
// Дүрэм нь жинхэнэ өгөгдлөөр хэмжигдсэн (docs/PLAN-BANK-HUULGA.md, 2026-11-05):
// ажилтны гараар бөглөсөн 1,293 + 739 гүйлгээтэй харьцуулахад автоматаар буруу
// оноосон нь 2 (хоёул ажилтны хариу эргэлзээтэй), өмнөх Colab кодынх 12.
//
// Эзний «2 шүүлтүүр» дүрэм: автоматаар оноохын тулд НЭГ хүүхэд дээр хоёр баримт
// давхцах ёстой — утас + нэр, овог + нэр, эсвэл сурсан данс (ах дүүгүй хүүхдэд).
// Ганц баримттай бол хүн нэг товшоод батална.

import { extractPhones } from './phone-extract';

export interface RosterStudent {
  id: string;
  lastName: string;
  firstName: string;
  /** Хүүхэд, аав, ээжийн 8 оронтой дугаар */
  phones: string[];
  archived: boolean;
  /** Нийгэмд суудаг: үндсэн анги нь Нийгэм, эсвэл шийтийн «Нийгэм» хуудсанд мөртэй */
  social?: boolean;
}

export interface PayerHint {
  kind: 'ACCOUNT' | 'PHONE';
  value: string;
  studentId: string;
}

export type MatchSignal =
  | 'PHONE' // утгад хүүхэд/эцэг эхийн утас
  | 'PHONE_LEARNED' // гараар баталсан утас, ах дүүгүй хүүхэд — шийдвэрлэх жин
  | 'ACCOUNT' // өмнө нь энэ хүүхдэд оноосон илгээгчийн данс
  | 'ACCOUNT_LEARNED' // тэр данс зөвхөн энэ хүүхдэд, ах дүүгүй — шийдвэрлэх жин
  | 'NAME' // нэр (зураасгүй, латинаар ч)
  | 'SURNAME'; // овог (ялгалын нөхцөлтэй, эхний үсгээр ч)

export interface MatchCandidate {
  studentId: string;
  score: number;
  signals: MatchSignal[];
}

export type MatchDecision =
  | 'AUTO' // нэг хүүхэд, 2+ баримт — автоматаар
  | 'SUGGEST' // нэг хүүхэд, 1 баримт — нэг товшоод батлах
  | 'CHOOSE' // хэд хэдэн хүүхэд ижил — сонгох
  | 'SPLIT' // хоёр хүүхдийн нэр — хамтын шилжүүлэг, хуваах
  | 'NONE';

export interface MatchResult {
  decision: MatchDecision;
  candidates: MatchCandidate[];
  /** Утгад «нийгэм» — known: нийгэмд суудаг хүүхэд л үлдсэн эсэх */
  social?: { known: boolean };
}

/**
 * Нийгмийн хичээлийн төлбөр (эзэн 2026-11-12): «Нийгэм», «нийгмийн анги», «niigem»,
 * «niigm», «Niigmiin». Математикийн төлбөрт холихгүй, нийгэмд суудаг хүүхдэд л ононо.
 */
export const SOCIAL_WORD = /нийг[эе]?м|nii?g[eiy]*m/iu;

// ── Бичвэр ─────────────────────────────────────────────────────────────────

/** Зөвхөн үсэг, жижиг: «Бат-Эрдэнэ» = «бат эрдэнэ» = «батэрдэнэ» */
export const nameKey = (v: string | null | undefined) => String(v ?? '').toLowerCase().replace(/[^\p{L}]+/gu, '');

const TR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: 'i', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Гийгүүлэгчийн араг: кирилл, латин ялгаагүй. Эцэг эхчүүд «misheel», «temuulen»,
 * «unurjargal» гэж бичдэг — эгшиг (ө/ү-г o/u/v гэж янз бүр) хаяад гийгүүлэгчээр харьцуулна.
 */
export function skeleton(v: string): string {
  return [...nameKey(v)]
    .map((c) => TR[c] ?? c)
    .join('')
    .replace(/kh/g, 'h')
    .replace(/ts|tz/g, 'c')
    .replace(/ch/g, 'c')
    .replace(/sh/g, 's')
    .replace(/zh/g, 'j')
    .replace(/ph/g, 'f')
    .replace(/[aeiouyvwq]/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** Овгийн эхний үсгийг латинаар бичихэд («G.Bulgantamir» = «Г.Булгантамир») */
const INITIAL_LATIN: Record<string, string[]> = {
  а: ['a'], б: ['b'], в: ['v', 'w'], г: ['g'], д: ['d'], е: ['e', 'y'], ё: ['y'], ж: ['j', 'z'], з: ['z'], и: ['i'],
  й: ['i'], к: ['k'], л: ['l'], м: ['m'], н: ['n'], о: ['o'], ө: ['o', 'u'], п: ['p'], р: ['r'], с: ['s'], т: ['t'],
  у: ['u'], ү: ['u', 'v'], ф: ['f'], х: ['h', 'k'], ц: ['c', 't'], ч: ['c'], ш: ['s'], э: ['e'], ю: ['y'], я: ['y'],
};

const INITIAL_DIGRAPH: Record<string, string> = { ш: 'sh', ч: 'ch', х: 'kh', ц: 'ts', ж: 'zh' };

/** Латин эхний үсэг зөвхөн цэгтэй хэлбэрээр («G.Bulgantamir», «Sh. Nomin») — «350k»-ийн k биш */
function latinInitials(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:^|[^\p{L}\d])([a-z]{1,2})\s*\.\s*(?=\p{L})/giu)) out.add(m[1].toLowerCase());
  return out;
}

/** «Батболдын», «Ууганбаярын» → ялгалын нөхцөлийг хасна */
const GENITIVE = /(гийн|ийн|ын|ний|ны|ий|н|ы)$/;

/** Монгол утас: 8 орон, 5–9-өөр эхэлнэ; «9976 3589» мэт 4+4 хуваасныг ч (phone-extract.ts) */
export const phonesIn = extractPhones;

export function normalizePhone(v: string | null | undefined): string | null {
  const d = String(v ?? '').replace(/\D/g, '').replace(/^976(?=\d{8}$)/, '');
  return d.length === 8 ? d : null;
}

/**
 * Хаан банк утганд илгээгчийн нэрийг залгадаг: «… ХААНААС: 150000 МӨНХЖАРГАЛ
 * БААСАНЖАРГАЛ». Тэр нь эцэг эхийн нэр — өөр хүүхдийн НЭР-тэй давхцаж буруу
 * оноож байсан (2026-11-06). Илгээгчийн хэсгээс зөвхөн ОВОГ-ийн баримт авна:
 * аав төлбөл түүний нэр = хүүхдийн овог.
 */
export function splitSender(text: string): { main: string; sender: string } {
  const m = /ХААНААС:?\s*\d*\s*/iu.exec(text);
  return m ? { main: text.slice(0, m.index), sender: text.slice(m.index + m[0].length) } : { main: text, sender: '' };
}

function tokensOf(text: string) {
  const toks = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  const all = new Set(toks);
  // «Бат Эрдэнэ», «Бат-Эрдэнэ» → «батэрдэнэ»
  for (let i = 0; i + 1 < toks.length; i++) all.add(toks[i] + toks[i + 1]);
  return { all: [...all], singles: new Set(toks.filter((t) => t.length === 1)) };
}

// ── Индекс ─────────────────────────────────────────────────────────────────

export interface MatchIndex {
  roster: Map<string, RosterStudent>;
  phone: Map<string, Set<string>>;
  firstName: Map<string, Set<string>>;
  firstSkeleton: Map<string, Set<string>>;
  lastName: Map<string, Set<string>>;
  lastSkeleton: Map<string, Set<string>>;
  learnedPhone: Map<string, Set<string>>;
  learnedAccount: Map<string, Set<string>>;
  /** Ах дүүтэй (ижил овог эсвэл хуваалцсан утас) — сурсан холбоос шийдвэрлэхгүй */
  hasSibling: Set<string>;
}

const add = (m: Map<string, Set<string>>, k: string, id: string) => {
  if (!k) return;
  const s = m.get(k) ?? new Set<string>();
  s.add(id);
  m.set(k, s);
};

export function buildMatchIndex(students: RosterStudent[], hints: PayerHint[]): MatchIndex {
  const idx: MatchIndex = {
    roster: new Map(),
    phone: new Map(),
    firstName: new Map(),
    firstSkeleton: new Map(),
    lastName: new Map(),
    lastSkeleton: new Map(),
    learnedPhone: new Map(),
    learnedAccount: new Map(),
    hasSibling: new Set(),
  };
  const surnameCount = new Map<string, number>();
  for (const s of students) {
    idx.roster.set(s.id, s);
    for (const p of s.phones) add(idx.phone, p, s.id);
    add(idx.firstName, nameKey(s.firstName), s.id);
    add(idx.lastName, nameKey(s.lastName), s.id);
    if (skeleton(s.firstName).length >= 3) add(idx.firstSkeleton, skeleton(s.firstName), s.id);
    if (skeleton(s.lastName).length >= 3) add(idx.lastSkeleton, skeleton(s.lastName), s.id);
    surnameCount.set(nameKey(s.lastName), (surnameCount.get(nameKey(s.lastName)) ?? 0) + 1);
  }
  for (const s of students)
    if ((surnameCount.get(nameKey(s.lastName)) ?? 0) > 1 || s.phones.some((p) => (idx.phone.get(p)?.size ?? 0) > 1))
      idx.hasSibling.add(s.id);
  for (const h of hints) {
    if (!idx.roster.has(h.studentId)) continue;
    add(h.kind === 'ACCOUNT' ? idx.learnedAccount : idx.learnedPhone, h.value, h.studentId);
  }
  return idx;
}

// ── Тулгалт ────────────────────────────────────────────────────────────────

export function matchTransaction(tx: { description: string; counterparty: string | null }, idx: MatchIndex): MatchResult {
  const signals = new Map<string, Set<MatchSignal>>();
  const hit = (id: string, s: MatchSignal) => {
    const set = signals.get(id) ?? new Set<MatchSignal>();
    set.add(s);
    signals.set(id, set);
  };
  const text = tx.description ?? '';

  for (const p of phonesIn(text)) {
    for (const id of idx.phone.get(p) ?? []) hit(id, 'PHONE');
    const learned = idx.learnedPhone.get(p);
    // Ижил утас = нэг баримт; ах дүүгүй ганц хүүхдэд л нэмэлт жин
    if (learned) for (const id of learned) { hit(id, 'PHONE'); if (learned.size === 1 && !idx.hasSibling.has(id)) hit(id, 'PHONE_LEARNED'); }
  }
  const acct = tx.counterparty ? idx.learnedAccount.get(tx.counterparty) : undefined;
  if (acct) for (const id of acct) { hit(id, 'ACCOUNT'); if (acct.size === 1 && !idx.hasSibling.has(id)) hit(id, 'ACCOUNT_LEARNED'); }

  const { main, sender } = splitSender(text);
  const { all, singles } = tokensOf(main);
  for (const t of all) {
    if (t.length < 2) continue;
    const sk = skeleton(t);
    for (const id of idx.firstName.get(t) ?? []) hit(id, 'NAME');
    if (sk.length >= 3) for (const id of idx.firstSkeleton.get(sk) ?? []) hit(id, 'NAME');
    for (const id of idx.lastName.get(t) ?? []) hit(id, 'SURNAME');
    const stem = t.replace(GENITIVE, '');
    if (stem !== t && stem.length >= 3) for (const id of idx.lastName.get(stem) ?? []) hit(id, 'SURNAME');
    if (sk.length >= 3) for (const id of idx.lastSkeleton.get(sk) ?? []) hit(id, 'SURNAME');
  }
  // «Б.Тэмүүлэн»: нэр таарсан хүүхдийн овгийн эхний үсэг тусдаа үсгээр бичигдсэн
  // Илгээгч («НЭР ОВОГ») — хүүхэд өөрөө эсвэл аав төлбөл тэр нэр нь хүүхдийн овог.
  // Ганцаараа хүүхэд заахгүй (эхийн нэр өөр хүүхдийн овогтой давхцана): утганд нэр
  // нь бичигдсэн хүүхдийн овгийг л батална.
  const senderTokens = new Set(tokensOf(sender).all);
  for (const [id, s] of signals)
    if (s.has('NAME') && !s.has('SURNAME') && senderTokens.has(nameKey(idx.roster.get(id)!.lastName))) hit(id, 'SURNAME');
  const latin = latinInitials(main);
  for (const [id, s] of signals) {
    const ini = nameKey(idx.roster.get(id)!.lastName)[0];
    if (!ini || !s.has('NAME') || s.has('SURNAME')) continue;
    const viaLatin = (INITIAL_LATIN[ini] ?? []).some((l) => latin.has(l)) || (INITIAL_DIGRAPH[ini] !== undefined && latin.has(INITIAL_DIGRAPH[ini]));
    if (singles.has(ini) || viaLatin) hit(id, 'SURNAME');
  }

  // «Нийгэм» гэсэн гүйлгээ: нийгэмд суудаг хүүхэд таарвал бусдыг хасна — ижил нэртэй
  // математикийн хүүхдэд (Батмөнх Хонгорзул ↔ Мөнхзул Хонгорзул) мөнгө орохгүй. Харин
  // математикийн хүүхэд илүү баттай таарвал (утас + нэр ↔ зөвхөн нэр) хасахгүй — хүн шийднэ
  const socialTx = SOCIAL_WORD.test(text);
  const isSocial = (id: string) => !!idx.roster.get(id)!.social;
  const best = (pick: (id: string) => boolean) => Math.max(0, ...[...signals].filter(([id]) => pick(id)).map(([, s]) => s.size));
  const socialKnown = socialTx && best(isSocial) > 0 && best(isSocial) >= best((id) => !isSocial(id));
  if (socialKnown) for (const id of [...signals.keys()]) if (!isSocial(id)) signals.delete(id);
  const res = matchCore(signals, idx, all);
  return socialTx ? { ...res, social: { known: socialKnown } } : res;
}

function matchCore(signals: Map<string, Set<MatchSignal>>, idx: MatchIndex, all: string[]): MatchResult {
  // Архивласан (гарсан) хүүхэд идэвхтэйтэй тэнцвэл ар тал руу
  const cands: MatchCandidate[] = [...signals.entries()]
    .map(([studentId, s]) => ({ studentId, signals: [...s], score: s.size - (idx.roster.get(studentId)!.archived ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score);
  if (!cands.length) return { decision: 'NONE', candidates: [] };

  const firstOf = (id: string) => nameKey(idx.roster.get(id)!.firstName);
  const strongNamed = cands.filter((c) => c.signals.includes('NAME') && signals.get(c.studentId)!.size >= 2);
  if (strongNamed.length >= 2 && new Set(strongNamed.map((c) => firstOf(c.studentId))).size >= 2)
    return { decision: 'SPLIT', candidates: strongNamed.slice(0, 6) };

  const top = cands[0].score;
  const tops = cands.filter((c) => c.score === top);
  if (top >= 2 && tops.length === 1) {
    const w = tops[0];
    const ws = signals.get(w.studentId)!;
    // Сурсан данс/утас нь утгад нэрлэгдсэн ӨӨР хүүхэдтэй зөрчилдвөл (ач, зээгийн төлбөр) шийдэхгүй
    if ((ws.has('ACCOUNT_LEARNED') || ws.has('PHONE_LEARNED')) && !ws.has('NAME')) {
      const named = cands.filter((c) => c.studentId !== w.studentId && c.signals.includes('NAME'));
      if (named.length) return { decision: 'CHOOSE', candidates: [w, ...named].slice(0, 6) };
    }
    // Ижил овогтой (ах дүү) өөр хүүхдийн нэр утгад байвал хамтын шилжүүлэг
    const toks = new Set(all);
    const wLast = nameKey(idx.roster.get(w.studentId)!.lastName);
    const sibs = [...idx.roster.values()].filter(
      (s) => s.id !== w.studentId && nameKey(s.lastName) === wLast && nameKey(s.firstName) !== firstOf(w.studentId) && toks.has(nameKey(s.firstName)),
    );
    if (sibs.length)
      return {
        decision: 'SPLIT',
        candidates: [w, ...sibs.map((s) => cands.find((c) => c.studentId === s.id) ?? { studentId: s.id, score: 1, signals: ['NAME' as MatchSignal] })].slice(0, 6),
      };
    return { decision: 'AUTO', candidates: [w] };
  }
  return { decision: tops.length === 1 ? 'SUGGEST' : 'CHOOSE', candidates: (tops.length === 1 ? cands : tops).slice(0, 6) };
}
