import {
  ROOMS,
  addDays,
  classById,
  fromKey,
  mondayIndex,
  teacherById,
  toMin,
  type Branch,
  type DemoClass,
  type DemoLesson,
  type DemoRoom,
  type DemoTeacher,
} from "../world";

/** Эзний дараалал: Баруун 4 дээр, Зүүн 4 доор */
export const BRANCHES: Branch[] = ["Баруун 4", "Зүүн 4"];

/** Нэг багш нэгэн зэрэг өөр ангид хичээлтэй байгаа нь */
export interface Clash {
  teacher: DemoTeacher;
  /** Давхцаж буй бусад ангийн нэр («13-2») */
  with: string[];
}

/** Нэг хичээл + түүнд хамаарах бүх тооцоолсон мэдээлэл (мөр бүр дахин тооцохгүй) */
export interface LessonView {
  lesson: DemoLesson;
  cls: DemoClass;
  room: DemoRoom | null;
  students: number;
  capacity: number | null;
  /** Суудлаас илүү сурагч (0 = багтаж байна) */
  over: number;
  lead: DemoTeacher | null;
  assistant: DemoTeacher | null;
  clashes: Clash[];
}

export function roomOf(id: string): DemoRoom | null {
  return ROOMS.find((r) => r.id === id) ?? null;
}

/** Хичээлүүдийг нэгтгэж: танхимын багтаамж, давтагдах багш зэргийг тооцно */
export function decorate(lessons: DemoLesson[]): LessonView[] {
  const spans = lessons.map((l) => ({
    l,
    s: toMin(l.slot.start),
    e: toMin(l.slot.end),
    ids: [l.leadId, l.assistantId].filter((x): x is string => !!x),
  }));
  const out: LessonView[] = [];
  for (const { l, s, e, ids } of spans) {
    const cls = classById(l.classId);
    if (!cls) continue;
    const room = roomOf(l.slot.room);
    const students = cls.students.length;
    const capacity = room?.capacity ?? null;
    const clashes: Clash[] = [];
    for (const id of ids) {
      const teacher = teacherById(id);
      if (!teacher) continue;
      const others = spans.filter((o) => o.l.id !== l.id && o.s < e && s < o.e && o.ids.includes(id));
      if (others.length) {
        clashes.push({ teacher, with: others.map((o) => classById(o.l.classId)?.label ?? "") });
      }
    }
    out.push({
      lesson: l,
      cls,
      room,
      students,
      capacity,
      over: capacity ? Math.max(0, students - capacity) : 0,
      lead: teacherById(l.leadId),
      assistant: teacherById(l.assistantId),
      clashes,
    });
  }
  return out;
}

/** Өдрийн хичээлүүдээс ажиллаж буй багш бүрийн хичээлийн тоо (ахлах / туслах) */
export interface TeacherLoad {
  teacher: DemoTeacher;
  lead: number;
  assistant: number;
  clash: boolean;
}

export function teacherLoads(views: LessonView[], teachers: DemoTeacher[]): TeacherLoad[] {
  return teachers.map((teacher) => {
    let lead = 0;
    let assistant = 0;
    let clash = false;
    for (const v of views) {
      if (v.lesson.leadId === teacher.id) lead++;
      if (v.lesson.assistantId === teacher.id) assistant++;
      if (v.clashes.some((c) => c.teacher.id === teacher.id)) clash = true;
    }
    return { teacher, lead, assistant, clash };
  });
}

/** Давхцсан багш (өдрийн дотор) ба давчуу танхимын тоо */
export function warningCounts(views: LessonView[]): { over: number; clash: number } {
  const clashTeachers = new Set<string>();
  let over = 0;
  for (const v of views) {
    if (v.over > 0) over++;
    for (const c of v.clashes) clashTeachers.add(c.teacher.id);
  }
  return { over, clash: clashTeachers.size };
}

/** «2 цаг 30 мин» */
export function durationLabel(start: string, end: string): string {
  const mins = toMin(end) - toMin(start);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} цаг` : "", m ? `${m} мин` : ""].filter(Boolean).join(" ");
}

export const timeRange = (l: DemoLesson): string => `${l.slot.start}–${l.slot.end}`;

/** Тухайн өдрийг агуулсан 7 хоногийн Даваа гарагийн огноо */
export function weekStartOf(dateKey: string): string {
  return addDays(dateKey, -mondayIndex(fromKey(dateKey)));
}

/** «10-р сарын 12–18» эсвэл «9-р сарын 28 – 10-р сарын 4» */
export function weekRangeLabel(startKey: string): string {
  const a = fromKey(startKey);
  const b = fromKey(addDays(startKey, 6));
  const left = `${a.getMonth() + 1}-р сарын ${a.getDate()}`;
  return a.getMonth() === b.getMonth() ? `${left}–${b.getDate()}` : `${left} – ${b.getMonth() + 1}-р сарын ${b.getDate()}`;
}

export function relativeDay(key: string, today: string): string | null {
  if (key === today) return "Өнөөдөр";
  if (key === addDays(today, 1)) return "Маргааш";
  if (key === addDays(today, -1)) return "Өчигдөр";
  return null;
}

/** Нийт ажиллах өвөрмөц багшийн тоо */
export function uniqueTeacherCount(lessons: DemoLesson[]): number {
  const ids = new Set<string>();
  for (const l of lessons) {
    ids.add(l.leadId);
    if (l.assistantId) ids.add(l.assistantId);
  }
  return ids.size;
}
