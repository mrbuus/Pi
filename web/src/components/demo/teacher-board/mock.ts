/**
 * Багшийн самбарт л хэрэгтэй зохиомол өгөгдөл: өдрийн нийтлэг тэмдэглэл ба
 * илгээлтийн хувийн сэтгэгдэл. Анги, сурагч, хичээл, ирц, даалгавар, тестийн
 * дүн бүгд `../world.ts`-ээс ирнэ (бусад демо хэсэгтэй ижил харагдана).
 */

import {
  ME,
  fromMin,
  hashStr,
  rngFrom,
  teacherById,
  toMin,
  type DemoClass,
  type DemoLesson,
  type DemoStudent,
  type DemoTeacher,
} from "../world";

export interface Note {
  id: string;
  text: string;
  author: string;
  /** «08:15» */
  time: string;
}

export interface Comment {
  id: string;
  from: "teacher" | "student";
  author: string;
  text: string;
  /** «Өчигдөр 21:14» гэх мэт богино шошго */
  time: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- Өдрийн нийтлэг тэмдэглэл (тухайн ангийн бүх багш харна) ---------- */

const NOTE_POOL = [
  "45–47-р хуудасны дасгалыг дараагийн хичээлд шалгана",
  "Интегралын хэрэглээг давтав, гэрийн даалгавар 3 бодлого",
  "Дараагийн хичээлд богино шалгалт авна, бүгдэд сануулав",
  "Хоцорсон сурагчидтай хичээлийн дараа ярилцана",
  "Дэвтэр шалгасан, зарим сурагчийн бодолт дутуу байна",
  "Эцэг эхийн хурлын өмнө ирцийн мэдээг шинэчилнэ",
  "Самбарын бодолтын зургийг ангийн группт тавьсан",
  "7-р бодлогыг олонх нь алдсан, дахин тайлбарлана",
];

/** Өнгөрсөн ба явагдаж буй хичээлд 0–2 тэмдэглэл; ирээдүйн хичээлд байхгүй */
export function seedNotes(cls: DemoClass, lesson: DemoLesson | null): Note[] {
  if (!lesson || lesson.status === "upcoming") return [];
  const r = rngFrom(hashStr(`notes|${cls.id}|${lesson.dateKey}`));
  const roll = r();
  const count = roll < 0.35 ? 0 : roll < 0.8 ? 1 : 2;
  const authors = [teacherById(lesson.leadId), teacherById(lesson.assistantId), ME].filter((t): t is DemoTeacher => t !== null);
  const pool = [...NOTE_POOL];
  const start = toMin(lesson.slot.start);
  return Array.from({ length: count }, (_, i) => ({
    id: `${lesson.dateKey}-n${i}`,
    text: pool.splice(Math.floor(r() * pool.length), 1)[0],
    author: authors[Math.floor(r() * authors.length)].name,
    time: fromMin(start - 40 + i * 70 + Math.floor(r() * 25)),
  }));
}

/* ---------- Илгээлтийн хувийн сэтгэгдэл (багш ба тухайн сурагч л харна) ---------- */

const STUDENT_MSG = [
  "Багш аа, 3-р бодлогын бодолтоо дахин шалгаж өгөөч",
  "Хоёр дахь хуудсыг бүдэг зурсан тул дахин илгээлээ",
  "Сүүлийн бодлогыг ойлгосонгүй, тайлбарлаж өгнө үү",
];
const TEACHER_MSG = [
  "Сайн байна, 2-р бодлогын хариуг дахин шалгаарай",
  "Хичээл дээр хамт тайлбарлая",
  "Бодолтын алхмуудыг арай дэлгэрэнгүй бичвэл илүү дээр",
];

export function seedComments(dateKey: string, student: DemoStudent): Comment[] {
  const r = rngFrom(hashStr(`msg|${dateKey}|${student.id}`));
  const k = Math.floor(r() * 3);
  const pupil: Comment = {
    id: `${student.id}-s`,
    from: "student",
    author: student.name,
    text: STUDENT_MSG[Math.floor(r() * STUDENT_MSG.length)],
    time: `Өмнөх өдөр 21:${pad(10 + Math.floor(r() * 40))}`,
  };
  const teacher: Comment = {
    id: `${student.id}-t`,
    from: "teacher",
    author: ME.name,
    text: TEACHER_MSG[Math.floor(r() * TEACHER_MSG.length)],
    time: `Тэр өдөр 08:${pad(5 + Math.floor(r() * 40))}`,
  };
  if (k === 0) return [pupil, teacher];
  if (k === 1) return [teacher];
  return [];
}
