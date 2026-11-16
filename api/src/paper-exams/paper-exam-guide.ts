/**
 * Нэгдсэн шалгалтын бодлогын тайлбар (PaperExamGuide.content) — цэвэр, I/O-гүй.
 *
 * Сурагч дүнгээ харсны дараа бодлого бүрт шат шатаар авна: мэдэж байх ёстой чанар → энгийн
 * тайлбар → 100x100 номын төстэй бодлого → бодолтын алхмууд → зөв хариу. Бичвэр дэх томьёо
 * `$…$`, тусдаа мөрийн томьёо `$$…$$` (вэбийн MathText-ийн дүрэм).
 */
export interface GuideRef {
  /** 100x100 номын бүлэг: «Тоо тоолол» */
  chapter: string;
  test: number;
  /** Бодлогын дугаар: «4» */
  number: string;
  text: string;
}

export interface GuideField {
  /** Нүдний нэр: «a», «ef» */
  key: string;
  /** Зөв утга: «2», «18» */
  value: string;
  /** Аль хэсэгт хамаарах (parts-ийн индекс) */
  part: number;
}

export interface GuideContent {
  kind: 'choice' | 'fill';
  points: number;
  /** Нөхцөлийн мөрүүд */
  statement: string[];
  /** Нөхцөлийн зураг (data:image/png;base64,…) */
  image?: string;
  /** Сонголтууд LaTeX-ээр, A-аас эхлэн */
  choices?: string[];
  /** Зөв хариу «A»…«E» */
  answer?: string;
  /**
   * Түгээмэл алдаа — БУРУУ сонголтын үсэг → тайлбар (зөвхөн сонгох бодлогод).
   * Сурагчид бодолттой (`steps`) яг ижил нөхцөлөөр очно.
   */
  mistakes?: Record<string, string>;
  fields?: GuideField[];
  parts?: { points: number }[];
  /** Мэдэж байх ёстой чанар, томьёо */
  rule: string[];
  /** Энгийн үгээр, жижиг жишээтэй */
  easy: string[];
  refs: GuideRef[];
  /** Бодолтын алхмууд: `$$…$$` эсвэл өгүүлбэр */
  steps: string[];
  topic: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

/** `$` тэмдгийн тоо тэгш эсэх — сондгой бол томьёо хаагдаагүй, дэлгэц эвдэрнэ. */
const balanced = (s: string) => (s.match(/\$/g) ?? []).length % 2 === 0;

/**
 * Ачаалахын өмнөх шалгалт: алдааны жагсаалт буцаана (хоосон = зөв).
 * Буруу бүтэцтэй тайлбар санд орвол сурагчийн дэлгэц дээр л илэрдэг тул энд хатуу шалгана.
 */
export function guideContentErrors(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') return ['content объект биш'];
  const c = raw as Partial<GuideContent>;
  if (c.kind !== 'choice' && c.kind !== 'fill') errors.push('kind буруу');
  if (!Number.isInteger(c.points) || (c.points ?? 0) <= 0)
    errors.push('points эерэг бүхэл тоо биш');
  for (const k of ['statement', 'rule', 'easy', 'steps'] as const) {
    if (!isStrings(c[k]) || c[k].length === 0) errors.push(`${k} хоосон`);
    else if (!c[k].every(balanced)) errors.push(`${k}: $ тэмдэг хаагдаагүй`);
  }
  if (typeof c.topic !== 'string' || !c.topic) errors.push('topic хоосон');
  if (
    !Array.isArray(c.refs) ||
    !c.refs.every(
      (r) =>
        r &&
        typeof r.chapter === 'string' &&
        Number.isInteger(r.test) &&
        typeof r.number === 'string' &&
        typeof r.text === 'string' &&
        balanced(r.text),
    )
  )
    errors.push('refs буруу');
  if (c.image !== undefined && !/^data:image\/png;base64,/.test(c.image))
    errors.push('image нь data:image/png биш');
  if (c.kind === 'choice') {
    if (!isStrings(c.choices) || c.choices.length < 2 || c.choices.length > 5)
      errors.push('choices 2–5 байх ёстой');
    else if (!LETTERS.slice(0, c.choices.length).includes(c.answer ?? ''))
      errors.push('answer сонголтод алга');
  }
  if (c.mistakes !== undefined) errors.push(...mistakesErrors(c));
  if (c.kind === 'fill') {
    const parts = c.parts ?? [];
    if (!Array.isArray(c.fields) || c.fields.length === 0)
      errors.push('fields хоосон');
    else if (
      !c.fields.every(
        (f) =>
          /^[a-z]{1,3}$/.test(f.key) &&
          /^[0-9]{1,3}$/.test(f.value) &&
          f.key.length === f.value.length &&
          Number.isInteger(f.part) &&
          f.part >= 0 &&
          f.part < parts.length,
      )
    )
      errors.push('fields буруу (нүдний нэр, утгын урт, хэсэг)');
    if (parts.reduce((t, p) => t + (p?.points ?? 0), 0) !== c.points)
      errors.push('parts-ийн онооны нийлбэр points-тэй тэнцэхгүй');
  }
  return errors;
}

/** `mistakes`-ийн шалгалт: зөвхөн сонгох бодлогод, сонголтын үсэгт, зөв хариунд биш, хоосон биш. */
function mistakesErrors(c: Partial<GuideContent>): string[] {
  const m = c.mistakes;
  if (c.kind !== 'choice') return ['mistakes зөвхөн сонгох бодлогод'];
  if (!m || typeof m !== 'object' || Array.isArray(m))
    return ['mistakes объект биш'];
  const errors: string[] = [];
  const letters = LETTERS.slice(0, c.choices?.length ?? 0);
  for (const [k, v] of Object.entries(m)) {
    if (!letters.includes(k)) errors.push(`mistakes.${k}: сонголтод алга`);
    else if (k === c.answer) errors.push(`mistakes.${k}: зөв хариунд тайлбар бичихгүй`);
    if (typeof v !== 'string' || !v.trim()) errors.push(`mistakes.${k}: хоосон`);
    else if (!balanced(v)) errors.push(`mistakes.${k}: $ тэмдэг хаагдаагүй`);
  }
  return errors;
}
