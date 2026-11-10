// «Зураг татах»-ын агуулга (эзэн 2026-11-08) — өдрийн хуваарьт харагдаж буй БҮХ зүйл: анги,
// цаг, багш, тест (товчилсон нэр), тарах/үлдэнэ, тарсан цаг, онолын зураг, тэмдэглэл, ирц,
// зөөсөн хичээл, амрах анги, амралтын өдөр, хоол, ажиллах багш. Зурахаас (drawSchedule.ts)
// тусдаа цэвэр өгөгдөл.
import { clockUB } from "@/components/lesson-records/types";
import { getClassroomColor } from "@/lib/classroomColor";
import { withPlus } from "@/lib/personName";
import { groupTestNames, regroupTopicText } from "@/lib/testNames";
import { formatMinutes, roomCapacityOf, roomOrderOf, WEEKDAY_LABELS } from "../types";
import { roadOf } from "./RoadMap";
import { branchOf, DISMISS_LABEL, shortClass, type DayPlanResponse } from "./types";

export interface ExportRow {
  className: string;
  /** Ангийн өнгө — зөвхөн зүүн зурвас */
  color: string;
  /** «14 сурагч» — танхим зурагт ОРОХГҮЙ (эзэн 2026-11-08) */
  sub: string;
  /** Тестүүд товчилсон, бодлогын санд байхгүй сэдэвтэй */
  tests: string;
  /** Тест хийгдсэн (бүртгэлтэй) эсэх */
  done: boolean;
  /** Ахлах, туслах (Багш+ нэрэнд «+») */
  lead: string;
  assistant: string;
  /** Нэмэлт мөр: тарах, тэмдэглэл, ирц г.м. — тус бүр [шошго, утга, тэмдэглэх эсэх] */
  extras: { label: string; text: string; tone: "info" | "warn" | "dim" }[];
}

export interface ExportBlock {
  /** «15:00–16:30» — дуусах цаг нь олонх мөрийнх */
  time: string;
  rows: ExportRow[];
}

export interface ExportModel {
  title: string;
  year: string;
  notices: string[];
  branches: { name: string; count: number; blocks: ExportBlock[] }[];
  footer: { label: string; text: string }[];
}

const BRANCHES = ["Баруун 4", "Зүүн 4", "Бусад"];

export function exportModel(data: DayPlanResponse): ExportModel {
  const [y, m, d] = data.date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[new Date(`${data.date}T00:00:00.000Z`).getUTCDay()];
  const notices: string[] = [];
  if (data.isHoliday) notices.push(data.holiday?.title || "Амралтын өдөр");
  const resting = [...new Set(data.restingClasses.map((r) => shortClass(r.classroomName)))];
  if (resting.length) notices.push(`Амарна: ${resting.join(", ")}`);

  const branches = BRANCHES.map((name) => {
    const rows = data.entries
      .filter((e) => branchOf(e.classroomName) === name)
      .sort((a, b) => a.startMinute - b.startMinute || roomOrderOf(a.room) - roomOrderOf(b.room));
    const blocks: { time: string; rows: ExportRow[]; ends: number[] }[] = [];
    for (const e of rows) {
      const time = formatMinutes(e.startMinute);
      const { today, doneToday, topics } = roadOf(e, data.tests);
      const tests =
        [groupTestNames(today.map((x) => x.short)), ...topics].filter(Boolean).join("; ") ||
        (e.topic ? regroupTopicText(e.topic) : "");
      const extras: ExportRow["extras"] = [];
      if (e.exception?.kind === "MOVED")
        extras.push({
          label: "",
          text:
            e.exception.originalDate !== data.date
              ? `${e.exception.originalDate.slice(5).replace("-", ".")}-ээс зөөсөн`
              : "Цаг, танхим өөрчилсөн",
          tone: "warn",
        });
      if (e.plan?.dismissMode) extras.push({ label: "", text: DISMISS_LABEL[e.plan.dismissMode], tone: "info" });
      if (e.dismissalAt) extras.push({ label: "Тарсан", text: clockUB(e.dismissalAt), tone: "dim" });
      if (e.plan?.photoStudent) extras.push({ label: "Онолын зураг", text: e.plan.photoStudent.name, tone: "dim" });
      if (e.record) {
        extras.push({ label: "", text: "Батлагдсан", tone: "info" });
        if (e.record.attendanceMarked > 0) {
          extras.push({ label: "Ирсэн", text: `${e.record.presentCount}/${e.record.enrolledCount}`, tone: "dim" });
          if (e.record.absentCount > 0) extras.push({ label: "Тасалсан", text: String(e.record.absentCount), tone: "warn" });
        }
        if (e.record.problemNumbersText) extras.push({ label: "Бодсон", text: e.record.problemNumbersText, tone: "dim" });
        if (e.record.description) extras.push({ label: "Тайлбар", text: e.record.description, tone: "dim" });
      }
      const capacity = roomCapacityOf(e.room);
      if (capacity && e.students > capacity) extras.push({ label: "", text: `${e.students - capacity} суудал дутна`, tone: "warn" });
      if (e.note) extras.push({ label: "Тэмдэглэл", text: e.note.body, tone: "dim" });
      const row: ExportRow = {
        className: shortClass(e.classroomName),
        color: getClassroomColor(e.classroomId),
        sub: `${e.students} сурагч`,
        tests,
        done: doneToday,
        lead: withPlus(e.leadTeacher?.name, e.leadTeacher?.role) ?? "",
        assistant: withPlus(e.assistantTeacher?.name, e.assistantTeacher?.role) ?? "",
        extras,
      };
      const last = blocks.at(-1);
      if (last?.time === time) {
        last.rows.push(row);
        last.ends.push(e.endMinute);
      } else blocks.push({ time, rows: [row], ends: [e.endMinute] });
    }
    // Блокийн дуусах цаг = хамгийн олон давтагдсан нь; ялгаатай мөрд «Дуусах» (дэлгэцтэй ижил)
    const out: ExportBlock[] = blocks.map((b) => {
      const count = new Map<number, number>();
      for (const end of b.ends) count.set(end, (count.get(end) ?? 0) + 1);
      const end = [...count.entries()].sort((x, z) => z[1] - x[1] || x[0] - z[0])[0][0];
      b.rows.forEach((r, i) => {
        if (b.ends[i] !== end) r.extras.unshift({ label: "Дуусах", text: formatMinutes(b.ends[i]), tone: "warn" });
      });
      return { time: `${b.time}–${formatMinutes(end)}`, rows: b.rows };
    });
    return { name, count: rows.length, blocks: out };
  }).filter((b) => b.count > 0);

  const footer: ExportModel["footer"] = [];
  const working = data.roster?.teachers.map((t) => withPlus(t.name, t.role)) ?? [];
  if (working.length) footer.push({ label: "Ажиллах багш", text: working.join(", ") });
  if (data.meal && (data.meal.cook || data.meal.food))
    footer.push({
      label: "Хоол",
      text: [data.meal.cook ? withPlus(data.meal.cook.name, data.meal.cook.role) : null, data.meal.food]
        .filter(Boolean)
        .join(" — "),
    });

  return {
    title: `${m}-р сарын ${d}, ${weekday}`,
    year: String(y),
    notices,
    branches,
    footer,
  };
}
