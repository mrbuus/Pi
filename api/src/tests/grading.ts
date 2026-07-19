// Дүн бодолт ба shuffle-ийн ЦЭВЭР логик — I/O байхгүй тул unit тестэд бүрэн ордог.
// Session-т суурилсан шалгалтын хөдөлгүүр (Шийдвэр 2, 6) энэ модулийг л ашиглана.

import { ProblemFormat } from '../generated/prisma/enums';

// ============ Хариу харьцуулалт ============

// Хариу харьцуулалт: CHOICE — стринг (A–E), FILL_NUMBER — string эсвэл объект.
export function answerToken(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value).trim().toLowerCase();
  }
  return JSON.stringify(value).trim().toLowerCase();
}

// Тоон хариуг канон хэлбэрт оруулна: "4" == "4.0", "-3.50" == "-3.5", "+5" == "5".
export function asNumber(token: string): number | null {
  if (token === '' || !/^[-+]?\d*\.?\d+$/.test(token)) return null;
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

export function tokensMatch(correct: unknown, given: unknown): boolean {
  const a = answerToken(correct);
  const b = answerToken(given);
  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null && nb !== null) return na === nb;
  return a === b;
}

export function answersEqual(correct: unknown, given: unknown): boolean {
  // Хариу түлхүүр байхгүй бол авто оноо өгөхгүй (хуурамч хариу зохиохгүй).
  if (correct === null || correct === undefined || correct === '') return false;
  if (given === null || given === undefined || given === '') return false;
  if (typeof correct === 'object' && typeof given === 'object') {
    const c = correct as Record<string, unknown>;
    const g = given as Record<string, unknown>;
    const keys = Object.keys(c);
    if (keys.length === 0) return false;
    return keys.every((k) => tokensMatch(c[k], g[k]));
  }
  return tokensMatch(correct, given);
}

// ============ Сонголтын харагдацын горим (Шийдвэр 6) ============

// Импортын placeholder: choices нь жинхэнэ утга биш ["A".."E"] үсгүүд л байдаг.
// Ийм бодлогод жинхэнэ хувилбарууд нь бодлогын текст дотор тул үсгээ хадгалж,
// байрлал СОЛИХГҮЙ (үсэг = текст доторх хувилбарын цорын ганц холбоос).
export function isPlaceholderChoices(choices: unknown): boolean {
  if (!Array.isArray(choices) || choices.length === 0) return false;
  return choices.every(
    (c) => typeof c === 'string' && /^[A-Za-zА-Яа-я]$/.test(c.trim()),
  );
}

export type ChoiceMode = 'TEXT' | 'LETTER' | null;

export interface GradableProblem {
  id: string;
  format: ProblemFormat;
  choices: unknown; // Problem.choices JSON
  correctAnswer: unknown; // Problem.correctAnswer JSON
  choiceOptions?: { order: number; text: string; isCorrect: boolean }[];
}

// Бодлого ямар горимоор харагдахыг тодорхойлно:
//  TEXT   — бүтэцтэй сонголтуудтай: үсэггүй, shuffle хийгдэнэ
//  LETTER — placeholder дата: үсэгтэй, байрлал хөдлөхгүй (цаас/текстийн лавлагаа)
export function choiceModeOf(p: GradableProblem): ChoiceMode {
  if (p.format !== ProblemFormat.CHOICE) return null;
  if (p.choiceOptions && p.choiceOptions.length > 0) return 'TEXT';
  if (Array.isArray(p.choices) && p.choices.length > 0) {
    return isPlaceholderChoices(p.choices) ? 'LETTER' : 'TEXT';
  }
  return null;
}

// Сонголтын текстүүд ЭХ (каноник) дарааллаар.
export function choiceTextsOf(p: GradableProblem): string[] {
  if (p.choiceOptions && p.choiceOptions.length > 0) {
    return [...p.choiceOptions]
      .sort((a, b) => a.order - b.order)
      .map((o) => o.text);
  }
  if (Array.isArray(p.choices)) return p.choices.map((c) => String(c));
  return [];
}

// ============ Детерминистик shuffle ============

// mulberry32 — жижиг, хурдан seeded PRNG (crypto шаардлагагүй, зөвхөн жигд тархалт хэрэгтэй)
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [0..n) индексүүдийг seed-ээс детерминистикээр холино (Fisher–Yates).
export function shuffledIndices(n: number, rand: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

// Бодлого бүрийн сонголтын дарааллыг нэг seed-ээс үүсгэнэ. Бодлогын ID-гаар
// эрэмбэлж хэшлэх тул тестийн бодлогын дараалал өөрчлөгдсөн ч тогтвортой.
export function buildChoiceOrder(
  problems: GradableProblem[],
  seed: number,
): Record<string, number[]> {
  const order: Record<string, number[]> = {};
  for (const p of problems) {
    if (choiceModeOf(p) !== 'TEXT') continue;
    const n = choiceTextsOf(p).length;
    if (n < 2) continue;
    // problemId-г тоон хэш болгож seed-тэй хольж бодлого бүрд өөр урсгал гаргана
    let h = seed >>> 0;
    for (const ch of p.id) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
    order[p.id] = shuffledIndices(n, mulberry32(h));
  }
  return order;
}

// ============ Нэг бодлогын дүн ============

// draftAnswers-ийн утга: TEXT горимд display индекс (number),
// LETTER горимд үсэг (string), FILL/OPEN-д стринг утга.
export function gradeAnswer(
  p: GradableProblem,
  rawAnswer: unknown,
  choiceOrder?: number[],
): { correct: boolean; canonicalAnswer: unknown } {
  const mode = choiceModeOf(p);

  if (mode === 'TEXT') {
    if (typeof rawAnswer !== 'number' || !Number.isInteger(rawAnswer)) {
      return { correct: false, canonicalAnswer: null };
    }
    const texts = choiceTextsOf(p);
    // display индекс → эх индекс (shuffle-гүй бол шууд)
    const origIdx = choiceOrder ? choiceOrder[rawAnswer] : rawAnswer;
    if (origIdx === undefined || origIdx < 0 || origIdx >= texts.length) {
      return { correct: false, canonicalAnswer: null };
    }
    // Шинэ загвар: isCorrect flag — үсэг/байрлалаас бүрэн ангид (Шийдвэр 2)
    if (p.choiceOptions && p.choiceOptions.length > 0) {
      const sorted = [...p.choiceOptions].sort((a, b) => a.order - b.order);
      const opt = sorted[origIdx];
      return {
        correct: !!opt?.isCorrect,
        canonicalAnswer: opt?.text ?? null,
      };
    }
    // Хуучин загвар: correctAnswer = үсэг → эх индексийг үсэг болгож тулгана.
    // canonicalAnswer нь сонгосон ТЕКСТ — үсэггүй UI-д review дээр утгатай харагдана.
    const letter = String.fromCharCode(65 + origIdx);
    return {
      correct: answersEqual(p.correctAnswer, letter),
      canonicalAnswer: texts[origIdx] ?? letter,
    };
  }

  // LETTER / FILL_NUMBER / OPEN — стринг/объект харьцуулалт хэвээр
  return {
    correct: answersEqual(p.correctAnswer, rawAnswer),
    canonicalAnswer: rawAnswer ?? null,
  };
}
