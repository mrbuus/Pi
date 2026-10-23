// Ангийн 7 хоногийн хэв маягийг (гараг бүрд цаг/танхим) нэг дор засах ЦЭВЭР
// логик (эзэн 2026-10-23). I/O-гүй — тесттэй (class-pattern.spec.ts).
//
// ТҮҮХИЙГ ХЭЗЭЭ Ч УСТГАХГҮЙ: өнгөрсөнд эхэлсэн мөрийг зөвхөн effectiveTo-гоор
// хааж (хассан өдөр) эсвэл хувааж (өөрчлөгдсөн өдөр) шинэ мөр нээнэ. Ирц,
// даалгавар, тэмдэглэл нь хуучин мөр/огноондоо хэвээр үлдэнэ.

import { addDateDays } from '../common/date';

const FAR_FUTURE = new Date('9999-12-31');

export interface PatternRow {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  teacherId: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface DesiredDay {
  weekday: number;
  startMinute: number;
  endMinute: number;
  room?: string | null;
  /** undefined = хэвээр, null = ангийн багш руу */
  teacherId?: string | null;
}

export interface AddDay {
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  teacherId: string | null;
}

export interface PatternPlan {
  /** Өөрчлөлтгүй өдөр */
  keep: PatternRow[];
  /** Өөрчлөгдсөн өдөр — `from`-оос хуваана (row.effectiveFrom ≥ from бол шууд засна) */
  change: {
    row: PatternRow;
    data: {
      startMinute: number;
      endMinute: number;
      room: string | null;
      teacherId: string | null;
    };
  }[];
  /** Хассан өдөр, өнгөрсөнд эхэлсэн → effectiveTo = from − 1 */
  end: { row: PatternRow; effectiveTo: Date }[];
  /** Хассан өдөр, хараахан эхлээгүй (effectiveFrom > өнөөдөр) мөр — түүхгүй */
  dropUnstarted: PatternRow[];
  /** Шинэ гараг */
  add: AddDay[];
}

export class PatternError extends Error {}

const normRoom = (r: string | null | undefined): string | null => {
  const t = (r ?? '').trim();
  return t === '' ? null : t;
};

/** Тухайн огноонд хүчинтэй эсэх (effectiveTo оролцуулсан) */
export function activeOn(
  row: Pick<PatternRow, 'effectiveFrom' | 'effectiveTo'>,
  day: Date,
): boolean {
  return row.effectiveFrom <= day && day <= (row.effectiveTo ?? FAR_FUTURE);
}

/**
 * @param rows  тухайн ангийн БҮХ ClassSchedule мөр
 * @param days  хүссэн 7 хоног (гараг давтагдахгүй)
 * @param from  хүчин төгөлдөр болох өдөр (≥ өнөөдөр)
 * @param today УБ-ын өнөөдөр
 */
export function planPattern(
  rows: PatternRow[],
  days: DesiredDay[],
  from: Date,
  today: Date,
): PatternPlan {
  if (from < today)
    throw new PatternError(
      'Өнгөрсөн өдрөөс өөрчлөх боломжгүй — өнөөдөр эсвэл түүнээс хойших огноо сонгоно уу',
    );
  const seen = new Set<number>();
  for (const d of days) {
    if (seen.has(d.weekday))
      throw new PatternError('Нэг гарагт нэг л хичээл сонгоно уу');
    seen.add(d.weekday);
    if (d.startMinute >= d.endMinute)
      throw new PatternError('Дуусах цаг эхлэх цагаас хойш байх ёстой');
  }
  // Ирээдүйд (from-оос хойш) эхлэх төлөвлөсөн мөр байвал — хоёр өөрчлөлт бие
  // биеэ дарахаас сэргийлж татгалзана.
  if (rows.some((r) => r.effectiveFrom > from))
    throw new PatternError(
      'Энэ ангид сонгосон огнооноос хойш эхлэх төлөвлөсөн өөрчлөлт байна — эхлээд түүнийг шийднэ үү эсвэл тэр өдрөөс хойш огноо сонгоно уу',
    );

  const active = rows.filter((r) => activeOn(r, from));
  const byDay = new Map<number, PatternRow[]>();
  for (const r of active)
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);

  const plan: PatternPlan = {
    keep: [],
    change: [],
    end: [],
    dropUnstarted: [],
    add: [],
  };
  const remove = (row: PatternRow) => {
    if (row.effectiveFrom < from)
      plan.end.push({ row, effectiveTo: addDateDays(from, -1) });
    else if (row.effectiveFrom > today) plan.dropUnstarted.push(row);
    else
      throw new PatternError(
        'Өнөөдрөөс эхэлсэн хичээлийг маргаашаас эхлэн хасна уу',
      );
  };

  for (const d of days) {
    const existing = byDay.get(d.weekday) ?? [];
    if (existing.length > 1)
      throw new PatternError(
        'Энэ гарагт хоёр хичээлтэй байна — тус бүрийг тор дээрээс засна уу',
      );
    const room = normRoom(d.room);
    if (existing.length === 0) {
      plan.add.push({
        weekday: d.weekday,
        startMinute: d.startMinute,
        endMinute: d.endMinute,
        room,
        teacherId: d.teacherId ?? null,
      });
      continue;
    }
    const row = existing[0];
    const teacherId = d.teacherId === undefined ? row.teacherId : d.teacherId;
    const same =
      row.startMinute === d.startMinute &&
      row.endMinute === d.endMinute &&
      normRoom(row.room) === room &&
      (row.teacherId ?? null) === (teacherId ?? null);
    if (same) plan.keep.push(row);
    else
      plan.change.push({
        row,
        data: {
          startMinute: d.startMinute,
          endMinute: d.endMinute,
          room,
          teacherId,
        },
      });
  }
  for (const [weekday, list] of byDay)
    if (!seen.has(weekday)) for (const row of list) remove(row);
  return plan;
}

export function planIsEmpty(p: PatternPlan): boolean {
  return (
    !p.change.length &&
    !p.end.length &&
    !p.dropUnstarted.length &&
    !p.add.length
  );
}

/** «13-5 (Зүүн 4)» → { label: '13-5', branch: 'Зүүн 4' } */
export function splitClassName(full: string): {
  label: string;
  branch: string | null;
} {
  const m = full.trim().match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m
    ? { label: m[1].trim(), branch: m[2].trim() }
    : { label: full.trim(), branch: null };
}

/** Богино нэр + салбар → «13-5 (Зүүн 4)». Хэрэглэгч дагавар бичсэн бол хасна. */
export function composeClassName(label: string, branch: string | null): string {
  const clean = splitClassName(label.replace(/\s+/g, ' ')).label;
  return branch ? `${clean} (${branch})` : clean;
}
