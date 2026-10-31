// 7 хоногийн ТОГТМОЛ хуваарийн цэвэр логик (React-гүй).
//
// ӨС: weekday 0=Ням … 6=Бямба. Эзэн Даваагаас эхэлж тоолдог тул харуулах
// дараалал WEEK_ORDER. effectiveTo нь API даяар ОРОЛЦУУЛСАН (сүүлийн хичээлийн
// өдөр) — split нь хуучин мөрийг «from − 1» өдрөөр хаадаг тул «өнөөдөр хүчинтэй»
// = effectiveFrom ≤ өнөөдөр ≤ effectiveTo (эсвэл null).

import { staffName, withPlus } from "@/lib/personName";
import { addDaysToKey, formatMinutes, ROOMS, WEEKDAY_LABELS, type ScheduleEntry } from "../types";

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Танхимын бүлгүүд: эзний дараалал Баруун 4 дээр, Зүүн 4 доор */
export const ROOM_GROUPS: { title: string; rooms: string[] }[] = (() => {
  const out: { title: string; rooms: string[] }[] = [];
  for (const r of ROOMS) {
    const g = out.find((x) => x.title === r.branch);
    if (g) g.rooms.push(r.value);
    else out.push({ title: r.branch, rooms: [r.value] });
  }
  return out;
})();

/** Онлайн мэт заавал харуулахгүй бүлэг — зөвхөн хичээлтэй үед */
export const OPTIONAL_GROUPS = new Set(["Зайнаас"]);
export const NO_ROOM = "";

export interface ClassInfo {
  id: string;
  name: string;
  students: number | null;
  teacherId: string | null;
  teacherName: string | null;
}

export interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role?: string | null;
}

/** Нэг давтагддаг цаг (ClassSchedule-ийн нэг мөр) */
export interface Slot {
  id: string;
  classroomId: string;
  classLabel: string;
  className: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  teacherId: string | null;
  teacherName: string | null;
  subject: string | null;
  from: string;
  to: string | null;
  students: number | null;
  /** Ижил утгатай залгаа мөрүүдийн (цуврал) сүүлийн огноо — торонд «хүртэл» харуулахад */
  seriesTo?: string | null;
}

/** "12-1 (Баруун 4)" → "12-1" */
export function classLabelOf(full: string): string {
  const m = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? m[1] : full;
}

/** Багшийн нэр: сонгох жагсаалтын displayName эсвэл «Б. Нэр»; Багш+ бол «+» (эзэн 2026-10-23) */
export function personName(
  t: { firstName: string; lastName: string; displayName?: string; role?: string | null } | null | undefined,
): string | null {
  if (!t) return null;
  if (t.displayName) return withPlus(t.displayName, t.role);
  return staffName(t);
}

export function toSlot(row: ScheduleEntry, classes?: Map<string, ClassInfo>): Slot {
  const info = classes?.get(row.classroomId);
  return {
    id: row.id,
    classroomId: row.classroomId,
    classLabel: classLabelOf(row.classroom.name),
    className: row.classroom.name,
    weekday: row.weekday,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    room: row.room,
    teacherId: row.teacherId,
    teacherName: personName(row.teacher),
    subject: row.subject,
    from: row.effectiveFrom.slice(0, 10),
    to: row.effectiveTo ? row.effectiveTo.slice(0, 10) : null,
    students: info?.students ?? row.classroom._count?.enrollments ?? null,
  };
}

export function isEffectiveOn(s: Pick<Slot, "from" | "to">, day: string): boolean {
  return s.from <= day && (s.to === null || s.to >= day);
}

export function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay();
}

/** `from`-оос хойш (оролцуулан) тухайн гарагийн анхны огноо */
export function nextOnOrAfter(weekday: number, from: string): string {
  let d = from;
  for (let i = 0; i < 7; i += 1) {
    if (weekdayOf(d) === weekday) return d;
    d = addDaysToKey(d, 1);
  }
  return from;
}

/** `before`-оос өмнөх (оролцуулахгүй) тухайн гарагийн сүүлийн огноо, `notBefore`-оос эрт бол null */
export function lastBefore(weekday: number, before: string, notBefore: string): string | null {
  let d = addDaysToKey(before, -1);
  for (let i = 0; i < 7; i += 1) {
    if (d < notBefore) return null;
    if (weekdayOf(d) === weekday) return d;
    d = addDaysToKey(d, -1);
  }
  return null;
}

const MONTH = (k: string) => Number(k.slice(5, 7));
const DAY = (k: string) => Number(k.slice(8, 10));

/** «10-р сарын 19, Даваа» (он нь энэ жил биш бол урд нь) */
export function dateLabel(key: string, today?: string, withWeekday = true): string {
  const year = key.slice(0, 4);
  const base = `${MONTH(key)}-р сарын ${DAY(key)}`;
  const y = today && today.slice(0, 4) !== year ? `${year} оны ` : "";
  return withWeekday ? `${y}${base}, ${WEEKDAY_LABELS[weekdayOf(key)]}` : `${y}${base}`;
}

/** Зөвхөн эхлэх цаг (эзэн 2026-10-31: дуусах цаг харуулахгүй) */
export function timeRange(s: { startMinute: number; endMinute: number }): string {
  return formatMinutes(s.startMinute);
}

/** Хоёр хугацааны мужийн огтлолцол (огноо мөрөөр, null = төгсгөлгүй) */
function rangesOverlap(aFrom: string, aTo: string | null, bFrom: string, bTo: string | null): boolean {
  return aFrom <= (bTo ?? "9999-12-31") && bFrom <= (aTo ?? "9999-12-31");
}

export interface Candidate {
  /** Засаж буй мөр(үүд) — өөрийгөө давхцал гэж тоолохгүй */
  ignoreIds: string[];
  classroomId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  teacherId: string | null;
  from: string;
  to: string | null;
}

export interface Conflict {
  kind: "class" | "room" | "teacher" | "capacity";
  text: string;
  /** true бол сервер татгалзана — хадгалахыг хаана */
  blocking: boolean;
  /** kind="room": тухайн танхимд давхцаж буй өөр ангийн мөр (SlotDialog «Танхим солих»-д) */
  other?: Slot;
}

/**
 * Хадгалахаас ӨМНӨ анхааруулга. Ангийн давхцлыг сервер шалгадаг (400) —
 * энд урьдчилж хэлж хаана. Танхим, багшийн давхцлыг сервер шалгадаггүй тул
 * анхааруулга болгоно (зарим үед санаатай байж болно).
 */
export function findConflicts(
  c: Candidate,
  slots: Slot[],
  classes: Map<string, ClassInfo>,
  students: number | null,
): Conflict[] {
  const out: Conflict[] = [];
  const effTeacher = (classroomId: string, teacherId: string | null) =>
    teacherId ?? classes.get(classroomId)?.teacherId ?? null;
  const mine = effTeacher(c.classroomId, c.teacherId);
  for (const s of slots) {
    if (c.ignoreIds.includes(s.id)) continue;
    if (s.weekday !== c.weekday) continue;
    if (!(c.startMinute < s.endMinute && s.startMinute < c.endMinute)) continue;
    if (!rangesOverlap(c.from, c.to, s.from, s.to)) continue;
    const day = WEEKDAY_LABELS[s.weekday];
    if (s.classroomId === c.classroomId) {
      out.push({ kind: "class", blocking: true, text: `Энэ анги ${day} гарагт ${timeRange(s)} цагт аль хэдийн хичээлтэй` });
    } else if (c.room && s.room === c.room) {
      out.push({ kind: "room", blocking: false, other: s, text: `${c.room} танхимд ${day} ${timeRange(s)} цагт ${s.classLabel} анги орно` });
    } else if (mine && effTeacher(s.classroomId, s.teacherId) === mine) {
      out.push({ kind: "teacher", blocking: false, text: `Багш ${day} ${timeRange(s)} цагт ${s.classLabel} ангид хичээлтэй` });
    }
  }
  const cap = c.room ? (ROOMS.find((r) => r.value === c.room)?.capacity ?? null) : null;
  if (cap != null && students != null && students > cap) {
    out.push({ kind: "capacity", blocking: false, text: `Сурагчдын тоо суудлаас ${students - cap}-ээр хэтэрнэ` });
  }
  return out;
}

/** Серверийн давхцлын мессежийг уншигдахуйц болгоно: «өдөрт (3)» → «Лхагва гарагт» */
export function friendlyError(message: string): string {
  return message.replace(/энэ өдөрт \((\d)\)/, (_, d: string) => `${WEEKDAY_LABELS[Number(d)] ?? ""} гарагт`);
}

/**
 * Нэг логик цуврал: slot ба түүний араас ЗАЛГАА (from = өмнөхийн to + 1), ИЖИЛ утгатай,
 * ганц утгатай тохирох мөрүүд. «Өөрчлөлтийг цуцлах» нь split-ийн хоёр хэсгийг ижил
 * болгодог тул хэрэглэгчид нэг цаг мэт харагдах ёстой.
 */
export function chainOf(slot: Slot, all: Slot[]): Slot[] {
  const out = [slot];
  let cur = slot;
  while (cur.to) {
    const next = addDaysToKey(cur.to, 1);
    const cands = all.filter((s) => s.classroomId === cur.classroomId && s.from === next && sameValues(s, cur));
    if (cands.length !== 1 || out.includes(cands[0])) break;
    out.push(cands[0]);
    cur = cands[0];
  }
  return out;
}

/** Төлөвлөсөн өөрчлөлтийн хос: ирээдүйн мөр ба түүний өмнөх (split) мөр */
export interface Planned {
  slot: Slot;
  kind: "change" | "new" | "end";
  previous: Slot | null;
}

/**
 * Өнөөдөр хүчинтэй биш ч ирээдүйд нөлөөлөх мөрүүд:
 *  change — split-ээр үүссэн ирээдүйн мөр (өмнөх мөр нь from−1-нд дууссан)
 *  new    — өмнөх мөргүй, ирээдүйд эхлэх шинэ цаг
 *  end    — өнөөдөр хүчинтэй, дуусах огноотой, залгамжлагчгүй мөр
 * Хос нь ганц утгатай тохирох үед л previous-ийг өгнө (буруу хос → буруу буцаалт).
 */
export function plannedChanges(all: Slot[], today: string): Planned[] {
  const future = all.filter((s) => s.from > today);
  const out: Planned[] = [];
  const succeeded = new Set<string>();
  const candsOf = (f: Slot) =>
    all.filter((p) => p.id !== f.id && p.classroomId === f.classroomId && p.to === addDaysToKey(f.from, -1));
  // Эхний алхам: ирээдүйн мөр бүрд НЭГ л тохирох өмнөх мөр
  const guess = new Map<string, Slot | null>();
  for (const f of future) {
    const cands = candsOf(f);
    for (const c of cands) succeeded.add(c.id);
    const same = cands.filter((p) => p.weekday === f.weekday);
    guess.set(f.id, cands.length === 1 ? cands[0] : same.length === 1 ? same[0] : null);
  }
  // Хоёр ирээдүйн мөр нэг өмнөх мөрийг заавал хоёулаа тодорхойгүй
  const hidden = new Set<string>();
  const claims = new Map<string, number>();
  for (const p of guess.values()) if (p) claims.set(p.id, (claims.get(p.id) ?? 0) + 1);
  for (const f of future) {
    const g = guess.get(f.id) ?? null;
    const prev = g && claims.get(g.id) === 1 ? g : null;
    if (prev && sameValues(prev, f)) {
      hidden.add(f.id); // буцаагдсан өөрчлөлт — өөрчлөлт биш, цувралын үргэлжлэл
      continue;
    }
    out.push({ slot: f, kind: candsOf(f).length > 0 ? "change" : "new", previous: prev });
  }
  for (const s of all) {
    if (s.to && s.to >= today && (s.from <= today || hidden.has(s.id)) && !succeeded.has(s.id))
      out.push({ slot: s, kind: "end", previous: null });
  }
  return out.sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)) || a.slot.classLabel.localeCompare(b.slot.classLabel));
}

export function effectiveDate(p: Planned): string {
  return p.kind === "end" ? addDaysToKey(p.slot.to!, 1) : p.slot.from;
}

export function sameValues(a: Slot, b: Slot): boolean {
  return (
    a.weekday === b.weekday &&
    a.startMinute === b.startMinute &&
    a.endMinute === b.endMinute &&
    (a.room ?? null) === (b.room ?? null) &&
    (a.teacherId ?? null) === (b.teacherId ?? null)
  );
}

/** Анги + цаг + танхимын эрэмбэ: эхлэх цаг → ангийн нэр */
export function bySlotTime(a: Slot, b: Slot): number {
  return a.startMinute - b.startMinute || a.classLabel.localeCompare(b.classLabel, "mn", { numeric: true });
}

/** Хуваарь засах эрх (GET /staff-capabilities/me-ээс): all = бүх анги, эс бөгөөс зөвхөн classIds */
export interface ScheduleAccess {
  all: boolean;
  classIds: string[];
}

export function canManageClass(access: ScheduleAccess | null | undefined, classroomId: string): boolean {
  return !!access && (access.all || access.classIds.includes(classroomId));
}

export function canManageAny(access: ScheduleAccess | null | undefined): boolean {
  return !!access && (access.all || access.classIds.length > 0);
}
