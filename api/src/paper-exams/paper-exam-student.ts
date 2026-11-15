/**
 * Сурагчийн нэгдсэн шалгалтын тайлбар — ЦЭВЭР (ӨС-гүй) хэсэг (эзэн 2026-11-15):
 *   - зөвхөн өөрийн хувилбар, зөвхөн АЛДСАН бодлого;
 *   - бодлогын нөхцөл, сонголт л эхэндээ; чанар, тайлбар, бодолт, зөв хариу нь
 *     шат шатаар (stage) серверээс ирнэ — хуудаснаас бүх бодолтыг шууд хуулж авахгүй;
 *   - дахин оролдоход хариуг сервер шалгана (зөв хариу клиент рүү очихгүй).
 */
import type { GuideContent } from './paper-exam-guide';
import type { ItemStatus, PaperItem } from './paper-exam-logic';

export interface GuideRow {
  label: string;
  number: number | null;
  content: GuideContent;
}

/** «II.2» → 2.2.* багцуудын бодлогууд; «12» → 12-р бодлого */
export function itemsOfGuide(row: GuideRow, items: PaperItem[]): PaperItem[] {
  if (row.number !== null) return items.filter((i) => i.number === row.number);
  const m = row.label.match(/^II\.(\d+)$/);
  return m ? items.filter((i) => i.label?.startsWith(`2.${m[1]}.`)) : [];
}

/** Алдсан эсэх: бодлого (эсвэл 2-р хэсгийн бодлогын аль нэг багц) зөв биш */
export function isMissed(row: GuideRow, items: PaperItem[], statuses: ItemStatus[]): boolean {
  const own = itemsOfGuide(row, items);
  if (own.length === 0) return false;
  return own.some((it) => {
    const st = statuses[items.indexOf(it)];
    return st !== 'CORRECT' && st !== 'UNGRADED';
  });
}

/** Эхний харагдац: нөхцөл, сонголт, нүднүүдийн нэр — зөв хариу, бодолтгүй */
export function publicGuide(row: GuideRow) {
  const c = row.content;
  return {
    label: row.label,
    number: row.number,
    content: {
      kind: c.kind,
      points: c.points,
      statement: c.statement,
      image: c.image,
      choices: c.choices,
      fields: c.fields?.map((f) => ({ key: f.key, part: f.part })),
      parts: c.parts,
      topic: c.topic,
      stepCount: c.steps.length,
    },
  };
}

/**
 * Шат: 1 — ашиглагдах чанар, 2 — энгийнээр, 3 — 100x100-ын төстэй бодлого,
 * 3+k — бодолтын эхний k алхам; бүх алхам нээгдсэн үед зөв хариу.
 */
export function guideStage(row: GuideRow, stage: number) {
  const c = row.content;
  const s = Math.max(0, Math.min(Math.floor(stage), 3 + c.steps.length));
  const steps = Math.max(0, s - 3);
  const done = steps >= c.steps.length;
  return {
    stage: s,
    rule: s >= 1 ? c.rule : undefined,
    easy: s >= 2 ? c.easy : undefined,
    refs: s >= 3 ? c.refs : undefined,
    steps: steps > 0 ? c.steps.slice(0, steps) : undefined,
    answer: done && c.kind === 'choice' ? c.answer : undefined,
    fields: done && c.kind === 'fill' ? c.fields : undefined,
  };
}

/** Дахин оролдлого: сонгох бол үсэг, нөхөх бол {нүд: цифр}; нөхөхөд хэсэг бүрийн зөв эсэх */
export function checkGuide(
  row: GuideRow,
  answer: unknown,
): { correct: boolean; parts?: boolean[] } {
  const c = row.content;
  if (c.kind === 'choice') {
    return { correct: typeof answer === 'string' && answer.trim().toUpperCase() === c.answer };
  }
  const given = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : {};
  const parts = (c.parts ?? []).map((_, part) =>
    (c.fields ?? [])
      .filter((f) => f.part === part)
      .every((f) => String(given[f.key] ?? '').trim() === f.value),
  );
  return { correct: parts.length > 0 && parts.every(Boolean), parts };
}
