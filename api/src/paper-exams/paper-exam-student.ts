/**
 * Сурагчийн нэгдсэн шалгалтын «Бодлого» — ЦЭВЭР (ӨС-гүй) хэсэг (эзэн 2026-11-16):
 *   - зөвхөн ӨӨРИЙН өгсөн хувилбарын бодлого, тайлбар, бодолт (нөгөө хувилбарынх очихгүй);
 *   - бодлого бүрт өөрийнх нь зөв/алдсан — бусад сурагчийн гүйцэтгэлийн хувь очихгүй.
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

/**
 * Сурагчид очих бодлого (эзэн 2026-11-16: өөрийн хувилбарын тайлбар, бодолт, зөв хариу
 * шууд нээлттэй). Талбаруудыг ил жагсаана — санд нэмэгдсэн өөр талбар дагаж гарахгүй.
 */
export function studentGuide(row: GuideRow): GuideRow {
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
      answer: c.answer,
      fields: c.fields?.map((f) => ({ key: f.key, value: f.value, part: f.part })),
      parts: c.parts?.map((p) => ({ points: p.points })),
      rule: c.rule,
      easy: c.easy,
      refs: c.refs.map((r) => ({ chapter: r.chapter, test: r.test, number: r.number, text: r.text })),
      steps: c.steps,
      topic: c.topic,
    },
  };
}
