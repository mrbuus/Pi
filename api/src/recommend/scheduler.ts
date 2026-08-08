// Сурагчид ДАРААГИЙН бодлогыг санал болгох ЦЭВЭР логик — I/O байхгүй тул
// unit тестэд бүрэн ордог (grading.ts, tuition/proration.ts-тэй ижил зарчим).
//
// ══ ЯАГААД ЭНЭ МОДУЛЬ ХЭРЭГТЭЙ ВЭ ══════════════════════════════════════
//
// 6125 бодлоготой. Сурагч аль нэгийг нь санамсаргүй бодох нь цагийн гарз:
// хэтэрхий амархан бол шинэ зүйл сурахгүй, хэтэрхий хэцүү бол урам хугарна.
// Энэ модуль нь ЯГ ОДОО хамгийн их суралцах бодлогыг сонгоно.
//
// ══ ДӨРВӨН СУДАЛГААНЫ ЗАРЧИМ ═══════════════════════════════════════════
//
// 1. ДАВТАН СЭРГЭЭХ (spaced retrieval). Roediger & Karpicke (2006): дахин
//    унших биш, ӨӨРИЙГӨӨ ШАЛГАХ нь урт хугацааны тогтоцыг эрс нэмэгдүүлдэг
//    («testing effect»). Тиймээс буруу бодсон бодлого ТОДОРХОЙ хугацааны
//    дараа дахин ирнэ — шууд дараа нь биш (шууд давтвал богино хугацааны
//    ой ажиллаж, жинхэнэ сурахгүй).
//
// 2. ХҮССЭН ХҮНДРЭЛ (desirable difficulty). Bjork. Хэт амархан даалгавар
//    суралцах үр дүнгүй. Оновчтой цэг нь ойролцоогоор 70–85% амжилтын
//    магадлал — сурагч чадах ч хүчлэх шаардлагатай түвшин. Энэ модуль
//    бодлогын түвшинг сурагчийн чадвартай тааруулна.
//
// 3. ХОЛИХ (interleaving). Rohrer & Taylor (2007): нэг сэдвийг дараалан
//    бодохоос (blocked) олон сэдвийг холих (interleaved) нь шалгалтын
//    гүйцэтгэлийг мэдэгдэхүйц дээшлүүлдэг. Учир нь сурагч «ямар аргаар
//    бодох вэ» гэдгийг СОНГОЖ сурдаг — жинхэнэ шалгалт яг ийм байдаг.
//    Тиймээс санал болгосон жагсаалт дараалсан ижил сэдэвтэй байхыг хориглоно.
//
// 4. СУЛ ТАЛ РУУ ЧИГЛЭХ. Сурагчийн алдаа их гаргадаг сэдэв илүү жинтэй.
//    Гэхдээ ЗӨВХӨН сул тал өгвөл урам хугарна — хүчтэй сэдвээс ч
//    хааяа оруулж итгэл төрүүлнэ.
//
// ══ ЯАГААД FSRS/SM-2-ЫГ ШУУД ХЭРЭГЛЭЭГҮЙ ВЭ ════════════════════════════
//
// FSRS болон SM-2 нь КАРТ цээжлэхэд (нэг зөв хариу) зориулагдсан. Математикийн
// бодлого өөр: сурагч ижил бодлогыг цээжилчихвэл утгагүй — ойлголтыг нь
// шилжүүлэх ёстой. Тиймээс энд «интервал» нь тухайн БОДЛОГОД биш, тухайн
// СЭДЭВ/УР ЧАДВАРт хамаарна, дараа нь тэр сэдвээс ӨӨР бодлого сонгоно.
// Хэрэв ирээдүйд яг тэр бодлогыг давтах шаардлага гарвал `sameProblemOk`
// тохиргоог үнэн болгоно.

/** Хугацааг миллисекундээр — тестэд тогтмол утга өгөх боломжтой байхын тулд. */
export type Millis = number;

export interface AttemptSignal {
  problemId: string;
  /** Тухайн бодлогын сэдэв/ур чадварын түлхүүр (Chapter.id эсвэл tag) */
  topicId: string;
  correct: boolean;
  /** Оролдсон мөч (epoch ms) */
  at: Millis;
}

export interface CandidateProblem {
  id: string;
  topicId: string;
  /**
   * Бодлогын хүндрэл 0..1 (0 = хамгийн амархан). Бодит өгөгдлөөс:
   * `1 - correctRate`. correctRate байхгүй бол 0.5 гэж үзнэ.
   */
  difficulty: number;
  /** Хэдэн сурагч оролдсон — цөөн оролдлоготой бол difficulty найдваргүй */
  attemptCount?: number;
}

export interface RecommendOptions {
  /** Одоогийн мөч (epoch ms) */
  now: Millis;
  /** Хэдэн бодлого санал болгох */
  limit: number;
  /**
   * Дараалан ижил сэдэв зөвшөөрөх дээд тоо (Зарчим 3 — холих).
   * Өгөгдмөл 1 = хоёр ижил сэдэв дараалан ирэхгүй.
   */
  maxConsecutiveSameTopic?: number;
  /** Яг ижил бодлогыг дахин санал болгохыг зөвшөөрөх эсэх (өгөгдмөл: үгүй) */
  sameProblemOk?: boolean;
}

export type RecommendReason =
  | 'RETRY_TOPIC'
  | 'WEAK_TOPIC'
  | 'RIGHT_LEVEL'
  | 'NEW_TOPIC'
  | 'CONFIDENCE';

export interface Recommendation {
  problemId: string;
  topicId: string;
  score: number;
  reason: RecommendReason;
}

/** Сэдэв бүрийн одоогийн байдал — гадна талаас ч харах боломжтой. */
export interface TopicState {
  topicId: string;
  attempts: number;
  correct: number;
  /** 0..1 — эзэмшсэн байдал. Оролдлого цөөн бол 0.5 руу татна (Bayes өмнөх). */
  mastery: number;
  /** Сүүлд оролдсон мөч, хэзээ ч оролдоогүй бол null */
  lastAt: Millis | null;
  /** Сүүлийн оролдлого буруу байсан эсэх */
  lastWrong: boolean;
}

const DAY: Millis = 24 * 60 * 60 * 1000;

/**
 * Оролдлого цөөн байхад эзэмшилтийг 0.5 руу татах хүч.
 * 2 гэдэг нь «2 хуурамч оролдлого нэмсэнтэй тэнцүү» гэсэн үг (Laplace
 * жигдрүүлэлт). 1 оролдлогоор 0% эсвэл 100% гэж дүгнэхээс сэргийлнэ.
 */
const PRIOR_STRENGTH = 2;

/** Буруу бодсон сэдвийг ХЭДЭН хоногийн дараа дахин санал болгох вэ (Зарчим 1) */
const RETRY_AFTER_DAYS = 1;

export function buildTopicStates(
  history: AttemptSignal[],
): Map<string, TopicState> {
  const byTopic = new Map<string, TopicState>();
  // Хугацааны дарааллаар — «сүүлийн оролдлого» зөв тодорхойлогдоно.
  for (const a of [...history].sort((x, y) => x.at - y.at)) {
    let s = byTopic.get(a.topicId);
    if (!s) {
      s = {
        topicId: a.topicId,
        attempts: 0,
        correct: 0,
        mastery: 0.5,
        lastAt: null,
        lastWrong: false,
      };
      byTopic.set(a.topicId, s);
    }
    s.attempts += 1;
    if (a.correct) s.correct += 1;
    s.lastAt = a.at;
    s.lastWrong = !a.correct;
  }
  for (const s of byTopic.values()) {
    // Laplace жигдрүүлэлт: цөөн оролдлоготой сэдвийг хэт итгэлтэй дүгнэхгүй.
    s.mastery =
      (s.correct + 0.5 * PRIOR_STRENGTH) / (s.attempts + PRIOR_STRENGTH);
  }
  return byTopic;
}

/**
 * Оновчтой хүндрэл нь эзэмшилтээс ХЭР доогуур байх вэ.
 *
 * Амжилтын магадлалын бүдүүн загвар: p ≈ mastery − difficulty + 0.5.
 * Хүссэн хүндрэлийн зорилт p ≈ 0.7–0.8 (Bjork) → difficulty ≈ mastery − 0.2.
 *
 * Жишээ: mastery 0.85 (сайн) → difficulty 0.65 (цөөхөн хүн бодсон бодлого).
 *        mastery 0.35 (сул)  → difficulty 0.15 (ихэнх хүн бодсон бодлого).
 */
const DESIRABLE_GAP = 0.2;

/**
 * Бодлогын хүндрэл сурагчийн чадварт ХЭР ТААРЧ байгааг 0..1-ээр өгнө.
 *
 * ⚠️ ЧИГЛЭЛ: эзэмшилт ӨНДӨР байх тусам ХҮНД бодлого таарна.
 *    (Анхны хувилбарт томьёо УРВУУ байсныг unit тест барьсан, 2026-08-08.)
 *
 * `difficulty` нь `1 − correctRate` — 0 бол бүгд бодсон (амархан),
 * 1 бол хэн ч бодоогүй (хэцүү).
 *
 * Гауссын хэлбэр — оновчтой цэгээс аль ч тийш холдвол оноо жигд буурна.
 * Огцом таслах (hard cutoff) биш учир нь: тохирох бодлого олдохгүй үед
 * ойролцоо түвшнийхийг өгөх нь юу ч өгөхгүй байхаас дээр.
 */
export function fitScore(difficulty: number, mastery: number): number {
  const ideal = clamp01(mastery - DESIRABLE_GAP);
  const spread = 0.28; // хэр өргөн хүрээг «таарсан» гэж үзэх вэ
  const d = (clamp01(difficulty) - ideal) / spread;
  return Math.exp(-0.5 * d * d);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Дараагийн бодлогуудыг санал болгоно.
 *
 * Оноо = таарц × сэдвийн жин. Дараа нь ХОЛИХ дүрмээр эрэмбийг тохируулна.
 */
export function recommend(
  history: AttemptSignal[],
  candidates: CandidateProblem[],
  opts: RecommendOptions,
): Recommendation[] {
  const { now, limit } = opts;
  const maxSame = opts.maxConsecutiveSameTopic ?? 1;
  const topics = buildTopicStates(history);
  const seen = new Set(history.map((h) => h.problemId));

  const scored: Recommendation[] = [];

  for (const p of candidates) {
    if (!opts.sameProblemOk && seen.has(p.id)) continue;

    const st = topics.get(p.topicId);
    // Оролдлого цөөнтэй бодлогын difficulty найдваргүй — 0.5 руу татна.
    const n = p.attemptCount ?? 0;
    const difficulty =
      n >= 5 ? clamp01(p.difficulty) : (clamp01(p.difficulty) * n + 0.5 * (5 - n)) / 5;

    let reason: RecommendReason;
    let weight: number;

    if (!st) {
      // Огт хүрээгүй сэдэв — судлах хэрэгтэй, гэхдээ хэт эрт биш.
      reason = 'NEW_TOPIC';
      weight = 1.0;
    } else if (st.lastWrong && st.lastAt !== null && now - st.lastAt >= RETRY_AFTER_DAYS * DAY) {
      // Зарчим 1: буруу бодсон сэдвийг ХАНГАЛТТАЙ хугацааны дараа дахин.
      reason = 'RETRY_TOPIC';
      weight = 1.6;
    } else if (st.mastery < 0.6) {
      reason = 'WEAK_TOPIC';
      weight = 1.35;
    } else if (st.mastery > 0.85) {
      // Зарчим 4: хүчтэй сэдвээс хааяа — итгэл төрүүлэх, мартахаас сэргийлэх.
      reason = 'CONFIDENCE';
      weight = 0.55;
    } else {
      reason = 'RIGHT_LEVEL';
      weight = 1.0;
    }

    const mastery = st?.mastery ?? 0.5;
    const score = fitScore(difficulty, mastery) * weight;
    scored.push({ problemId: p.id, topicId: p.topicId, score, reason });
  }

  scored.sort((a, b) => b.score - a.score || a.problemId.localeCompare(b.problemId));
  return interleave(scored, limit, maxSame);
}

/**
 * ХОЛИХ (Зарчим 3): оноогоор эрэмбэлсэн жагсаалтаас сонгохдоо нэг сэдэв
 * дараалан `maxSame`-ээс олон удаа орохыг зөвшөөрөхгүй.
 *
 * Алгоритм: эрэмбийг дагаж явна; сүүлийн `maxSame` ширхэг нь ижил сэдэвтэй
 * бол ӨӨР сэдэвтэй хамгийн өндөр оноотойг нь урагшлуулна. Өөр сэдэв огт
 * байхгүй бол дүрмийг сулруулна (хоосон буцаахаас дээр).
 */
function interleave(
  ranked: Recommendation[],
  limit: number,
  maxSame: number,
): Recommendation[] {
  const out: Recommendation[] = [];
  const pool = [...ranked];

  while (out.length < limit && pool.length > 0) {
    const tail = out.slice(-maxSame);
    const blocked =
      tail.length === maxSame && tail.every((r) => r.topicId === tail[0].topicId)
        ? tail[0].topicId
        : null;

    let idx = blocked === null ? 0 : pool.findIndex((r) => r.topicId !== blocked);
    if (idx === -1) idx = 0; // өөр сэдэв алга — дүрмийг сулруулна
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** Санал болгосон шалтгааныг сурагчид харуулах МОНГОЛ бичвэр. */
export const REASON_TEXT: Record<RecommendReason, string> = {
  RETRY_TOPIC: 'Өмнө нь бүдэрсэн сэдэв — одоо дахин оролдох цаг болжээ',
  WEAK_TOPIC: 'Энэ сэдвийг бэхжүүлэх хэрэгтэй',
  RIGHT_LEVEL: 'Танд яг тохирох түвшин',
  NEW_TOPIC: 'Шинэ сэдэв',
  CONFIDENCE: 'Сайн эзэмшсэн сэдэв — мартахгүйн тулд',
};
