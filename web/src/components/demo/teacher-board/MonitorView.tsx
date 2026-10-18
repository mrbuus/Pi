"use client";

import { BookOpen, Clock, FileX, Laptop, Minus, StickyNote, X, type LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ATT_META, HW_META, RiskMark, TONE_SELECTED, TONE_TEXT, type RaisedHandIcon, type Tone, HwSentIcon } from "../shell/status";
import {
  LATE_RANGE_SHORT,
  type AttStatus,
  type DayRecord,
  type DemoClass,
  type DemoLesson,
  type DemoStudent,
  type HwStatus,
  type RiskFlag,
  type TestResult,
} from "../world";
import { Legend, LegendItem } from "./parts";
import { ATT_ORDER, HW_ORDER } from "./StatusBoxes";
import { onlineStats, resultOf } from "./store";

export type FilterKey =
  | "risk"
  | `att:${AttStatus | "none"}`
  | `hw:${HwStatus | "none"}`
  | "sub:yes"
  | "sub:no"
  | "sub:late";

interface Ctx {
  rec: DayRecord;
  flags: RiskFlag[];
  late: boolean;
}

function matches(f: FilterKey, { rec, flags, late }: Ctx): boolean {
  if (f === "risk") return flags.length > 0;
  if (f === "sub:yes") return !!rec.submission;
  if (f === "sub:no") return !rec.submission;
  if (f === "sub:late") return late;
  const [kind, v] = f.split(":");
  if (kind === "att") return v === "none" ? rec.att === null : rec.att === v;
  return v === "none" ? rec.hw === null : rec.hw === v;
}

interface ChipDef {
  key: FilterKey;
  label: string;
  icon: LucideIcon | typeof RaisedHandIcon;
  tone: Tone | "neutral" | "brand";
}

/** Компьютерийн баганууд: нэр нь илүү өргөн, үлдсэн зай төлөвийн багануудад жигд хуваагдана */
const MON_COLS =
  "md:grid-cols-[2.5rem_minmax(9rem,1.4fr)_minmax(9rem,1fr)_minmax(7rem,0.8fr)_minmax(5.5rem,0.6fr)_minmax(4.5rem,0.5fr)_2.5rem]";

const NEUTRAL_ON = "border-ink-dim bg-ink/10 text-ink";
const BRAND_ON = "border-brand-bright bg-brand-bright/10 text-brand-soft";

function toneOn(t: ChipDef["tone"]): string {
  return t === "neutral" ? NEUTRAL_ON : t === "brand" ? BRAND_ON : TONE_SELECTED[t];
}
function toneIcon(t: ChipDef["tone"]): string {
  return t === "neutral" ? "text-ink-dim" : t === "brand" ? "text-brand" : TONE_TEXT[t];
}

const ATT_CHIPS: ChipDef[] = [
  ...ATT_ORDER.map((a) => ({ key: `att:${a}` as FilterKey, label: ATT_META[a].label, icon: ATT_META[a].icon, tone: ATT_META[a].tone })),
  { key: "att:none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral" },
];
const HW_CHIPS: ChipDef[] = [
  ...HW_ORDER.map((h) => ({ key: `hw:${h}` as FilterKey, label: HW_META[h].label, icon: HW_META[h].icon, tone: HW_META[h].tone })),
  { key: "hw:none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral" },
];
const SUB_CHIPS: ChipDef[] = [
  { key: "sub:yes", label: "Илгээсэн", icon: HwSentIcon, tone: "brand" },
  { key: "sub:no", label: "Илгээгээгүй", icon: FileX, tone: "neutral" },
  { key: "sub:late", label: "Хоцорч илгээсэн", icon: Clock, tone: "warning" },
];

/**
 * Хяналт: зөвхөн харах, маш хурдан тойм — тухайн хичээлийн даалгавар, онлайн
 * дүн, тоотой шүүлтүүр, сурагч бүр нэг мөрөнд. Тайлбар нь жагсаалтын ДООР.
 */
export default function MonitorView({
  lesson,
  students,
  records,
  flags,
  lateIds,
  filter,
  onFilter,
  onDrawer,
  onViewer,
}: {
  cls: DemoClass;
  lesson: DemoLesson;
  students: DemoStudent[];
  records: Map<string, DayRecord>;
  flags: Map<string, RiskFlag[]>;
  lateIds: Set<string>;
  filter: FilterKey | null;
  onFilter: (f: FilterKey | null) => void;
  onDrawer: (id: string) => void;
  onViewer: (id: string) => void;
}) {
  const hw = lesson.homework;
  const ctxOf = (s: DemoStudent): Ctx => ({
    rec: records.get(s.id)!,
    flags: flags.get(s.id) ?? [],
    late: lateIds.has(s.id),
  });
  const count = (f: FilterKey) => students.filter((s) => matches(f, ctxOf(s))).length;
  const shown = filter ? students.filter((s) => matches(filter, ctxOf(s))) : students;
  const stats = hw ? onlineStats(students, hw) : null;

  const chip = (c: ChipDef) => {
    const n = count(c.key);
    const on = filter === c.key;
    const Icon = c.icon;
    return (
      <button
        key={c.key}
        type="button"
        aria-pressed={on}
        disabled={n === 0 && !on}
        onClick={() => onFilter(on ? null : c.key)}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-40 sm:min-h-8 sm:px-2.5",
          on ? cn(toneOn(c.tone), "font-semibold") : "border-line bg-surface text-ink-dim hover:border-ink/30 hover:text-ink",
        )}
      >
        <Icon className={cn("size-3.5 shrink-0", toneIcon(c.tone))} aria-hidden />
        {c.label}
        <span className={cn("tabular-nums", on ? "font-bold" : "font-semibold text-ink")}>{n}</span>
      </button>
    );
  };

  const riskN = count("risk");
  const riskOn = filter === "risk";

  return (
    <>
      {/* Тухайн хичээлийн даалгавар ба онлайн дүн */}
      <section
        aria-label="Хичээлийн мэдээлэл"
        className="rounded-xl border border-line bg-surface p-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
      >
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-brand">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            {hw ? (
              <p className="text-sm text-ink">
                <span className="text-ink-dim">Гэрийн даалгавар: </span>
                <b className="font-bold">{hw.title}</b>{" "}
                <span className="whitespace-nowrap text-ink-dim">({hw.problems} бодлого)</span>
              </p>
            ) : (
              <p className="text-sm text-ink-dim">Энэ хичээлд шалгах гэрийн даалгавар байхгүй</p>
            )}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-ink-dim">Хичээлийн сэдэв:</span>
              <span className="font-semibold text-ink">{lesson.topic}</span>
              {lesson.chips.map((c) => (
                <span key={c} className="rounded-full bg-brand-bright/10 px-2 py-0.5 text-xs font-semibold text-brand-soft">
                  {c}
                </span>
              ))}
            </p>
          </div>
        </div>
        {stats && (
          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-center md:mt-0 md:w-[22rem] md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <Stat label="Онлайнаар бодсон" value={`${stats.solved}/${stats.total}`} />
            <Stat
              label="Дундаж зөв"
              value={stats.avgCorrect === null ? "-" : `${String(stats.avgCorrect).replace(".", ",")}/${stats.problems}`}
            />
            <Stat
              label="Их алдсан бодлого"
              value={stats.mostMissed.length ? stats.mostMissed.map((m) => m.n).join(", ") : "-"}
              title={stats.mostMissed.map((m) => `${m.n}-р бодлого: ${m.missed} хүн`).join(", ")}
            />
          </div>
        )}
      </section>

      {/* Тоотой шүүлтүүр: дарвал шүүнэ, дахин дарвал арилна */}
      <section aria-label="Шүүлтүүр" className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={riskOn}
            disabled={riskN === 0 && !riskOn}
            onClick={() => onFilter(riskOn ? null : "risk")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors disabled:opacity-40 sm:min-h-8 sm:px-2.5",
              riskOn ? TONE_SELECTED.error : "border-line bg-surface text-ink hover:border-error/50",
            )}
          >
            <span aria-hidden className="inline-flex size-2.5 rounded-full bg-error ring-2 ring-error/20" />
            Асуудалтай
            <span className="font-bold tabular-nums text-error">{riskN}</span>
          </button>
          <p className="ml-auto text-xs text-ink-dim" aria-live="polite">
            {filter ? (
              <span className="inline-flex items-center gap-1">
                <span className="tabular-nums">
                  <b className="font-bold text-ink">{shown.length}</b>/{students.length} сурагч
                </span>
                <button
                  type="button"
                  onClick={() => onFilter(null)}
                  className="-my-2 -mr-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-brand hover:bg-brand-bright/10 sm:min-h-8"
                >
                  <X className="size-3.5" aria-hidden />
                  Бүгд
                </button>
              </span>
            ) : (
              <span>{students.length} сурагч</span>
            )}
          </p>
        </div>
        <FilterRow label="Ирц">{ATT_CHIPS.map(chip)}</FilterRow>
        {hw && <FilterRow label="Даалгавар">{HW_CHIPS.map(chip)}</FilterRow>}
        {hw && <FilterRow label="Илгээлт">{SUB_CHIPS.map(chip)}</FilterRow>}
      </section>

      {/* Нягт жагсаалт: нэг сурагч нэг мөр */}
      <section aria-label="Сурагчдын жагсаалт" className="overflow-hidden rounded-xl border border-line bg-surface">
        <div
          aria-hidden
          className={cn("hidden h-9 items-center gap-x-3 border-b border-line bg-ink/[0.03] px-3 text-xs font-semibold text-ink-dim md:grid", MON_COLS)}
        >
          <span />
          <span>Сурагч</span>
          <span>Ирц</span>
          <span>{hw ? "Даалгавар" : ""}</span>
          <span>{hw ? "Илгээлт" : ""}</span>
          <span>{hw ? "Онлайн" : ""}</span>
          <span className="flex justify-center">
            <StickyNote className="size-3.5" aria-hidden />
          </span>
        </div>
        {shown.length > 0 ? (
          <ul className="divide-y divide-line">
            {shown.map((s) => {
              const c = ctxOf(s);
              return (
                <MonitorRow
                  key={s.id}
                  student={s}
                  rec={c.rec}
                  flags={c.flags}
                  late={c.late}
                  result={hw ? resultOf(s, hw) : null}
                  problems={hw?.problems ?? 0}
                  hasHomework={!!hw}
                  onDrawer={onDrawer}
                  onViewer={onViewer}
                />
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-ink-dim">
            Шүүлтүүрт тохирох сурагч алга
            <button
              type="button"
              onClick={() => onFilter(null)}
              className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 font-semibold text-ink hover:bg-ink/5 sm:min-h-9"
            >
              Бүх сурагчийг харах
            </button>
          </div>
        )}
      </section>

      <MonitorLegend hasHomework={!!hw} />
    </>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title} className="min-w-0">
      <p className="truncate text-base font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] leading-tight text-ink-dim">{label}</p>
    </div>
  );
}

/** Утсан дээр хажуу тийш гүйдэг нэг мөр (шошго нь наалттай), компьютер дээр ороож багтана */
function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="overflow-x-auto [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-1.5 sm:w-auto sm:flex-wrap">
        <span className="sticky left-0 z-[1] flex min-h-11 w-[4.75rem] shrink-0 items-center bg-bg text-xs font-semibold text-ink-dim sm:static sm:min-h-0 sm:w-20 sm:bg-transparent">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

const DASH = <Minus className="size-3.5 shrink-0 text-ink-dim/60" aria-hidden />;

interface RowProps {
  student: DemoStudent;
  rec: DayRecord;
  flags: RiskFlag[];
  late: boolean;
  result: TestResult | null;
  problems: number;
  hasHomework: boolean;
  onDrawer: (id: string) => void;
  onViewer: (id: string) => void;
}

function MonitorRowImpl({ student, rec, flags, late, result, problems, hasHomework, onDrawer, onViewer }: RowProps) {
  const att = rec.att ? ATT_META[rec.att] : null;
  const AttIcon = att?.icon;
  const hwm = rec.hw ? HW_META[rec.hw] : null;
  const HwIcon = hwm?.icon;
  const note = [rec.attNote.trim(), rec.hwNote.trim()].filter(Boolean);
  const noteText = [rec.attNote.trim() && `Ирц: ${rec.attNote.trim()}`, rec.hwNote.trim() && `Даалгавар: ${rec.hwNote.trim()}`]
    .filter(Boolean)
    .join("\n");
  const range = rec.att === "late" && rec.lateRange ? LATE_RANGE_SHORT[rec.lateRange] : null;

  return (
    <li className={cn("row-interactive relative grid min-h-11 grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-x-2 px-2 py-1.5 hover:bg-ink/[0.03] md:gap-x-3 md:px-3 md:py-0", MON_COLS)}>
      {/* 1-р мөр (утас) / 1–2-р багана (компьютер): тэмдэг, дугаар, нэр */}
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 md:contents">
        <span className="flex shrink-0 items-center gap-1.5 md:col-start-1 md:row-start-1">
          {/* Тэмдгийн тайлбар (title) хулганаар харагдахын тулд мөрийн товчны дээр */}
          <RiskMark flags={flags} className="relative z-[1]" />
          <span className="w-5 text-xs tabular-nums text-ink-dim">{student.index}</span>
        </span>
        <button
          type="button"
          data-name-id={student.id}
          onClick={() => onDrawer(student.id)}
          className="cyrillic-tight min-w-0 truncate text-left text-sm font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-brand-soft md:col-start-2 md:row-start-1"
        >
          {student.name}
        </button>
      </div>

      {/* 2-р мөр (утас) / тус тусын багана (компьютер) */}
      <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-x-3 pl-[2.625rem] text-xs text-ink-dim md:contents md:text-[13px]">
        <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap md:col-start-3 md:row-start-1">
          <span className="sr-only">Ирц: </span>
          {att && AttIcon ? (
            <>
              <AttIcon className={cn("size-3.5 shrink-0", TONE_TEXT[att.tone])} aria-hidden />
              <span className="text-ink">{att.label}</span>
              {range && <span className="font-semibold tabular-nums text-ink">{range}</span>}
            </>
          ) : (
            <>
              {DASH}
              <span>Тэмдэглээгүй</span>
            </>
          )}
        </span>
        {hasHomework && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap md:col-start-4 md:row-start-1">
            <span className="sr-only">Даалгавар: </span>
            {hwm && HwIcon ? (
              <>
                <HwIcon className={cn("size-3.5 shrink-0", TONE_TEXT[hwm.tone])} aria-hidden />
                <span className="sr-only text-ink md:not-sr-only">{hwm.label}</span>
              </>
            ) : (
              <>
                {DASH}
                <span className="sr-only md:not-sr-only">Тэмдэглээгүй</span>
              </>
            )}
          </span>
        )}
        {hasHomework && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums md:col-start-6 md:row-start-1">
            <Laptop className="size-3.5 shrink-0 md:hidden" aria-hidden />
            <span className="sr-only">Онлайн тест: </span>
            {result ? (
              <span title={`Онлайн тест: ${result.correct} зөв, ${problems} бодлого`}>
                <b className="font-bold text-ink">{result.correct}</b>/{problems}
              </span>
            ) : (
              <span title="Онлайнаар бодоогүй" className="inline-flex">
                {DASH}
                <span className="sr-only">Онлайнаар бодоогүй</span>
              </span>
            )}
          </span>
        )}
        <span
          title={noteText || undefined}
          className="relative z-[1] inline-flex min-w-0 flex-1 items-center gap-1 md:col-start-7 md:row-start-1 md:flex-none md:justify-center"
        >
          {note.length > 0 && (
            <>
              <StickyNote className="size-3.5 shrink-0 text-brand" aria-hidden />
              <span className="sr-only">Тэмдэглэл: </span>
              <span className="min-w-0 truncate md:sr-only">{note.join(", ")}</span>
            </>
          )}
        </span>
      </div>

      {/* Илгээлт: утсан дээр баруун талд хоёр мөрийг эзэлнэ */}
      <div className="relative z-[1] col-start-2 row-span-2 row-start-1 flex justify-end md:col-start-5 md:row-span-1 md:justify-start">
        {hasHomework && rec.submission ? (
          <button
            type="button"
            data-open-id={student.id}
            onClick={() => onViewer(student.id)}
            aria-label={`${student.name}, илгээсэн ${rec.submission.pages} хуудсыг нээх${late ? ", хугацаа хэтэрсэн" : ""}`}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-brand-bright/40 bg-brand-bright/10 px-2 text-xs font-semibold tabular-nums text-brand-soft hover:bg-brand-bright/20 md:min-h-8"
          >
            <HwSentIcon className="size-3.5 shrink-0" aria-hidden />
            {rec.submission.pages} х.
            {late && (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-warning/50 bg-surface">
                <Clock className="size-3 text-warning" aria-hidden />
              </span>
            )}
          </button>
        ) : hasHomework ? (
          <span className="inline-flex min-w-11 justify-center md:justify-start" title="Илгээгээгүй">
            {DASH}
            <span className="sr-only">Илгээгээгүй</span>
          </span>
        ) : null}
      </div>
    </li>
  );
}

const sameFlags = (a: RiskFlag[], b: RiskFlag[]) => a.length === b.length && a.every((f, i) => f.label === b[i].label);
const sameRec = (a: DayRecord, b: DayRecord) =>
  a.att === b.att &&
  a.lateRange === b.lateRange &&
  a.attNote === b.attNote &&
  a.hw === b.hw &&
  a.hwNote === b.hwNote &&
  a.submission?.submittedAt === b.submission?.submittedAt;

const MonitorRow = memo(
  MonitorRowImpl,
  (p, n) =>
    p.student === n.student &&
    sameRec(p.rec, n.rec) &&
    sameFlags(p.flags, n.flags) &&
    p.late === n.late &&
    p.result === n.result &&
    p.problems === n.problems &&
    p.hasHomework === n.hasHomework &&
    p.onDrawer === n.onDrawer &&
    p.onViewer === n.onViewer,
);

function MonitorLegend({ hasHomework }: { hasHomework: boolean }) {
  const icon = (Icon: LucideIcon | typeof RaisedHandIcon, cls: string) => <Icon className={cn("size-3.5", cls)} aria-hidden />;
  return (
    <div className="space-y-1.5 rounded-xl border border-dashed border-line px-3 py-2.5">
      <Legend label="Ирцийн тэмдэг">
        <LegendItem icon={<span aria-hidden className="inline-flex size-2.5 rounded-full bg-error ring-2 ring-error/20" />}>
          Шалгуур хангаагүй
        </LegendItem>
        {ATT_ORDER.map((a) => (
          <LegendItem key={a} icon={icon(ATT_META[a].icon, TONE_TEXT[ATT_META[a].tone])}>
            {ATT_META[a].label}
          </LegendItem>
        ))}
        <LegendItem icon={DASH}>Тэмдэглээгүй, байхгүй</LegendItem>
      </Legend>
      {hasHomework && (
        <Legend label="Даалгаврын тэмдэг">
          {HW_ORDER.map((h) => (
            <LegendItem key={h} icon={icon(HW_META[h].icon, TONE_TEXT[HW_META[h].tone])}>
              {HW_META[h].label}
            </LegendItem>
          ))}
          <LegendItem icon={icon(HwSentIcon, "text-brand")}>Илгээсэн хуудас</LegendItem>
          <LegendItem icon={icon(Clock, "text-warning")}>Хугацаа хэтэрсэн</LegendItem>
          <LegendItem icon={icon(Laptop, "text-ink-dim")}>
            <span className="tabular-nums">
              <b className="font-bold text-ink">9</b>/14
            </span>{" "}
            онлайн тестийн зөв бодлого
          </LegendItem>
          <LegendItem icon={icon(StickyNote, "text-brand")}>Тэмдэглэл</LegendItem>
        </Legend>
      )}
    </div>
  );
}
