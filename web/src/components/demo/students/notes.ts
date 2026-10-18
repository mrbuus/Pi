import { addDays, hashStr, rngFrom, teacherById, todayKey, type DemoStudent, type RiskFlag } from "../world";

/**
 * Багшийн тэмдэглэлийн ЖИШЭЭ (зохиомол, seed-тэй). Бодит: notes.service — сурагч бүрт
 * (огноо, зохиогч багш, текст); зөвхөн багш нар харна.
 */
export interface NoteItem {
  id: string;
  dateKey: string;
  author: string;
  text: string;
}

const GENERAL = [
  "Хичээл дээр идэвхтэй оролцож, асуулт тавьж байна",
  "Гэрийн даалгавраа тогтмол хийж байгаа, үргэлжлүүлэн дэмжинэ",
  "Дэвтрээ мартсан тул дараагийн хичээлд авчрахаар тохирсон",
  "Явцын шалгалтын өмнө нэмэлт бодлого өгсөн",
  "Онлайн тестийг сайн бодсон, илүү хүнд бодлого руу шилжүүлнэ",
  "Хуудсаа дутуу илгээсэн тул дахин илгээхийг сануулсан",
  "Сэдвийг ойлгоход хүндрэлтэй байна, хичээлийн дараа тайлбарласан",
  "Эцэг эхтэй утсаар ярьсан, ахиц сайн гэдгийг дуулгасан",
];

const BY_FLAG: Partial<Record<RiskFlag["kind"], string>> = {
  attendance: "Ирц буурсан, эцэг эхэд мэдэгдэж шалтгааныг тодруулна",
  absences: "Хичээл тасалсан тул эцэг эхтэй холбогдсон",
  lates: "Хоцролт олширсон, шалтгааныг асууна",
  homework: "Даалгаврын гүйцэтгэл буурсан, нэмэлт тусламж санал болгосон",
  streak: "Даалгавар дараалан хийгээгүй, сурагчтай ярилцсан",
};

export function sampleNotes(student: DemoStudent, flags: RiskFlag[], teacherIds: Array<string | null>): NoteItem[] {
  const r = rngFrom(hashStr(`notes|${student.id}`));
  const authors = teacherIds.map((id) => teacherById(id)?.name).filter((n): n is string => !!n);
  const author = () => authors[Math.floor(r() * authors.length)] ?? "Багш";
  const today = todayKey();
  const out: NoteItem[] = [];
  const used = new Set<number>();

  for (const f of flags) {
    const text = BY_FLAG[f.kind];
    if (text && !out.some((n) => n.text === text)) {
      out.push({ id: `${student.id}-f-${f.kind}`, dateKey: addDays(today, -Math.floor(r() * 12)), author: author(), text });
    }
  }
  const extra = 2 + Math.floor(r() * 3);
  for (let i = 0; i < extra; i++) {
    let k = Math.floor(r() * GENERAL.length);
    while (used.has(k)) k = (k + 1) % GENERAL.length;
    used.add(k);
    out.push({ id: `${student.id}-g-${k}`, dateKey: addDays(today, -(4 + Math.floor(r() * 36))), author: author(), text: GENERAL[k] });
  }
  return out.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
