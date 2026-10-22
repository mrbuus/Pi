"use client";

import { BookOpen, Laptop, Minus, StickyNote, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  HOMEWORK_ORDER,
  HwSentIcon,
  RiskMark,
  TONE_SELECTED,
  TONE_TEXT,
  type AttPresentIcon,
  type Tone,
} from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import {
  LATE_RANGE_SHORT,
  type AttendanceStatus,
  type BoardStudent,
  type DayRec,
  type HomeworkStatus,
  type MakeupStatus,
  type OnlinePayload,
} from "./lib";
import MakeupChip from "./MakeupChip";
import { Legend, LegendItem, RiskDot, SentMark } from "./parts";
import { scoreText, type OnlineCell } from "./StudentCard";

export type FilterKey =
  | "risk"
  | `att:${AttendanceStatus | "none"}`
  | `hw:${HomeworkStatus | "none" | "sent"}`
  | "online:yes"
  | "online:no";

interface Ctx {
  rec: DayRec;
  flags: string[];
  online: OnlineCell | null;
  sent: boolean;
}

function matches(f: FilterKey, { rec, flags, online, sent }: Ctx): boolean {
  if (f === "risk") return flags.length > 0;
  if (f === "hw:sent") return sent;
  if (f === "online:yes") return !!online;
  if (f === "online:no") return !online;
  const [kind, v] = f.split(":");
  if (kind === "att") return v === "none" ? rec.att === null : rec.att === v;
  return v === "none" ? rec.hw === null : rec.hw === v;
}

interface ChipDef {
  key: FilterKey;
  label: string;
  icon: LucideIcon | typeof AttPresentIcon;
  tone: Tone | "neutral" | "brand";
}

/** Компьютерийн баганууд: нэр өргөн, үлдсэн зай төлөвийн багануудад */
const MON_COLS =
  "md:grid-cols-[2.5rem_minmax(9rem,1.4fr)_minmax(10rem,1.1fr)_minmax(7rem,0.8fr)_minmax(5.5rem,0.6fr)_2.5rem]";

const NEUTRAL_ON = "border-ink-dim bg-ink/10 text-ink";
const BRAND_ON = "border-brand-bright bg-brand-bright/10 text-brand-soft";
const toneOn = (t: ChipDef["tone"]) => (t === "neutral" ? NEUTRAL_ON : t === "brand" ? BRAND_ON : TONE_SELECTED[t]);
const toneIcon = (t: ChipDef["tone"]) => (t === "neutral" ? "text-ink-dim" : t === "brand" ? "text-brand" : TONE_TEXT[t]);

const ATT_CHIPS: ChipDef[] = [
  ...ATTENDANCE_ORDER.map((a) => ({ key: `att:${a}` as FilterKey, label: ATTENDANCE_MARKS[a].label, icon: ATTENDANCE_MARKS[a].icon, tone: ATTENDANCE_MARKS[a].tone })),
  { key: "att:none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral" },
];
const HW_CHIPS: ChipDef[] = [
  ...HOMEWORK_ORDER.map((h) => ({ key: `hw:${h}` as FilterKey, label: HOMEWORK_MARKS[h].label, icon: HOMEWORK_MARKS[h].icon, tone: HOMEWORK_MARKS[h].tone })),
  { key: "hw:none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral" },
];
/** Тухайн хичээлийн даалгаврыг илгээсэн (Assignment/Submission) — самбарын тоймтой ижил нэр */
const SENT_CHIP: ChipDef = { key: "hw:sent", label: "Илгээсэн", icon: HwSentIcon, tone: "brand" };
const ONLINE_CHIPS: ChipDef[] = [
  { key: "online:yes", label: "Бодсон", icon: Laptop, tone: "brand" },
  { key: "online:no", label: "Бодоогүй", icon: Minus, tone: "neutral" },
];

const DASH = <Minus className="size-3.5 shrink-0 text-ink-dim/60" aria-hidden />;
const NO_FLAGS: string[] = [];

/**
 * Хяналт: зөвхөн харах, маш хурдан тойм — хичээлийн сэдэв, онлайн гэрийн даалгавар,
 * тоотой шүүлтүүр (улаан «Асуудалтай» эхэнд), нэг сурагч нэг мөр. Тайлбар нь ДООР.
 */
export default function MonitorView({
  students,
  names,
  recs,
  flags,
  homework,
  topic,
  onlineData,
  online,
  makeup,
  sent,
  filter,
  onFilter,
  onDrawer,
  footer,
}: {
  students: BoardStudent[];
  names: Map<string, string>;
  recs: Map<string, DayRec>;
  flags: Map<string, string[]>;
  homework: boolean;
  topic: string | null;
  onlineData: OnlinePayload | null;
  online: Record<string, OnlineCell>;
  makeup: Map<string, MakeupStatus>;
  sent: Set<string>;
  filter: FilterKey | null;
  onFilter: (f: FilterKey | null) => void;
  onDrawer: (id: string) => void;
  /** Хамгийн доор (тайлбарын дараа) — «Ангийн бусад мэдээлэл» */
  footer?: ReactNode;
}) {
  const hasOnline = homework && !!onlineData && onlineData.tests.length > 0;
  const ctxOf = (s: BoardStudent): Ctx => ({
    rec: recs.get(s.id)!,
    flags: flags.get(s.id) ?? NO_FLAGS,
    online: online[s.id] ?? null,
    sent: sent.has(s.id),
  });
  const count = (f: FilterKey) => students.filter((s) => matches(f, ctxOf(s))).length;
  const shown = filter ? students.filter((s) => matches(filter, ctxOf(s))) : students;
  const indexOf = new Map(students.map((s, i) => [s.id, i + 1]));

  const solved = students.filter((s) => online[s.id]).length;
  const scores = students.map((s) => online[s.id]).filter((o): o is OnlineCell => !!o);
  const avg = scores.length ? scores.reduce((a, o) => a + o.score, 0) / scores.length : null;
  const maxOf = scores[0]?.max ?? null;

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
      {/* Тухайн хичээлийн сэдэв ба онлайн гэрийн даалгавар */}
      <section
        aria-label="Хичээлийн мэдээлэл"
        className="rounded-xl border border-line bg-surface p-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4"
      >
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-brand">
            <BookOpen className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p>
              <span className="text-ink-dim">Хичээлийн сэдэв: </span>
              <span className="font-semibold text-ink">{topic || "Тавиагүй"}</span>
            </p>
            {homework && (
              <p>
                <span className="text-ink-dim">Онлайн гэрийн даалгавар: </span>
                {hasOnline ? (
                  onlineData!.tests.map((t, i) => (
                    <span key={t.testId}>
                      {i > 0 && ", "}
                      <Link href={`/app/tests/${encodeURIComponent(t.testId)}/results`} className="font-semibold text-ink underline decoration-ink-dim/40 underline-offset-4 hover:text-brand-soft">
                        {t.title}
                        {t.variant ? ` ${t.variant}` : ""}
                      </Link>{" "}
                      <span className="whitespace-nowrap text-ink-dim">({t.problems} бодлого)</span>
                    </span>
                  ))
                ) : (
                  <span className="text-ink-dim">алга</span>
                )}
              </p>
            )}
          </div>
        </div>
        {hasOnline && (
          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5 text-center md:mt-0 md:w-[15rem] md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <Stat label="Онлайнаар бодсон" value={`${solved}/${students.length}`} />
            <Stat label="Дундаж оноо" value={avg === null || maxOf === null ? "–" : scoreText(avg, maxOf)} />
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
            <RiskDot />
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
        {homework ? (
          <FilterRow label="Даалгавар">{[...HW_CHIPS, SENT_CHIP].map(chip)}</FilterRow>
        ) : (
          sent.size > 0 && <FilterRow label="Даалгавар">{chip(SENT_CHIP)}</FilterRow>
        )}
        {hasOnline && <FilterRow label="Онлайн">{ONLINE_CHIPS.map(chip)}</FilterRow>}
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
          <span>{homework ? "Даалгавар" : ""}</span>
          <span>{homework ? "Онлайн" : ""}</span>
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
                  id={s.id}
                  index={indexOf.get(s.id) ?? 0}
                  name={names.get(s.id) ?? s.firstName}
                  rec={c.rec}
                  flags={c.flags}
                  online={c.online}
                  makeup={makeup.get(s.id) ?? null}
                  sent={sent.has(s.id)}
                  homework={homework}
                  onDrawer={onDrawer}
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

      <MonitorLegend homework={homework} online={hasOnline} makeup={makeup.size > 0} sent={sent.size > 0} />
      {footer}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
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

interface RowProps {
  id: string;
  index: number;
  name: string;
  rec: DayRec;
  flags: string[];
  online: OnlineCell | null;
  makeup: MakeupStatus | null;
  sent: boolean;
  homework: boolean;
  onDrawer: (id: string) => void;
}

function MonitorRowImpl({ id, index, name, rec, flags, online, makeup, sent, homework, onDrawer }: RowProps) {
  const att = rec.att ? ATTENDANCE_MARKS[rec.att] : null;
  const AttIcon = att?.icon;
  const hwm = rec.hw ? HOMEWORK_MARKS[rec.hw] : null;
  const HwIcon = hwm?.icon;
  const note = [rec.attNote.trim(), homework ? rec.hwNote.trim() : ""].filter(Boolean);
  const noteText = [rec.attNote.trim() && `Ирц: ${rec.attNote.trim()}`, homework && rec.hwNote.trim() && `Даалгавар: ${rec.hwNote.trim()}`]
    .filter(Boolean)
    .join("\n");
  const range = rec.att === "LATE" && rec.lateRange ? LATE_RANGE_SHORT[rec.lateRange] : null;
  const by = [rec.attBy && `Ирц: ${rec.attBy}`, homework && rec.hwBy && `Даалгавар: ${rec.hwBy}`].filter(Boolean).join(", ");

  return (
    <li className={cn("row-interactive relative grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-2 py-1.5 hover:bg-ink/[0.03] md:gap-x-3 md:px-3 md:py-0", MON_COLS)}>
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 md:contents">
        <span className="flex shrink-0 items-center gap-1.5 md:col-start-1 md:row-start-1">
          <RiskMark reasons={flags} className="relative z-[1]" />
          <span className="w-5 text-xs tabular-nums text-ink-dim">{index}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 md:col-start-2 md:row-start-1">
          <button
            type="button"
            data-name-id={id}
            onClick={() => onDrawer(id)}
            className="cyrillic-tight min-w-0 truncate text-left text-sm font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-brand-soft"
          >
            {name}
          </button>
          {sent && <SentMark className="relative z-[1]" />}
        </span>
      </div>

      <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-x-3 pl-[2.625rem] text-xs text-ink-dim md:contents md:text-[13px]">
        <span title={by || undefined} className="relative z-[1] inline-flex min-w-0 items-center gap-1 whitespace-nowrap md:col-start-3 md:row-start-1">
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
          {makeup && <MakeupChip status={makeup} className="ml-1" />}
        </span>
        {homework && (
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
        <span
          title={noteText || undefined}
          className="relative z-[1] inline-flex min-w-0 flex-1 items-center gap-1 md:col-start-6 md:row-start-1 md:flex-none md:justify-center"
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

      {/* Онлайн: утсан дээр баруун талд хоёр мөрийг эзэлнэ */}
      <div className="relative z-[1] col-start-2 row-span-2 row-start-1 flex justify-end md:col-start-5 md:row-span-1 md:justify-start">
        {homework &&
          (online ? (
            <Link
              href={`/app/tests/${encodeURIComponent(online.testId)}/results`}
              aria-label={`${name}, онлайн гэрийн даалгавар ${scoreText(online.score, online.max)}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-brand-bright/40 bg-brand-bright/10 px-2 text-xs font-semibold tabular-nums text-brand-soft hover:bg-brand-bright/20 md:min-h-8"
            >
              <Laptop className="size-3.5 shrink-0" aria-hidden />
              {scoreText(online.score, online.max)}
            </Link>
          ) : (
            <span className="inline-flex min-w-11 justify-center md:justify-start" title="Онлайнаар бодоогүй">
              {DASH}
              <span className="sr-only">Онлайнаар бодоогүй</span>
            </span>
          ))}
      </div>
    </li>
  );
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameRec = (a: DayRec, b: DayRec) =>
  a.att === b.att && a.lateRange === b.lateRange && a.attNote === b.attNote && a.hw === b.hw && a.hwNote === b.hwNote && a.attBy === b.attBy && a.hwBy === b.hwBy;

const MonitorRow = memo(
  MonitorRowImpl,
  (p, n) =>
    p.id === n.id &&
    p.index === n.index &&
    p.name === n.name &&
    sameRec(p.rec, n.rec) &&
    sameList(p.flags, n.flags) &&
    p.online?.score === n.online?.score &&
    p.online?.testId === n.online?.testId &&
    p.makeup === n.makeup &&
    p.sent === n.sent &&
    p.homework === n.homework &&
    p.onDrawer === n.onDrawer,
);

function MonitorLegend({ homework, online, makeup, sent }: { homework: boolean; online: boolean; makeup: boolean; sent: boolean }) {
  const icon = (Icon: LucideIcon | typeof AttPresentIcon, cls: string) => <Icon className={cn("size-3.5", cls)} aria-hidden />;
  return (
    <div className="space-y-1.5 rounded-xl border border-dashed border-line px-3 py-2.5">
      <Legend label="Ирцийн тэмдэг">
        <LegendItem icon={<RiskDot />}>Шалгуур хангаагүй</LegendItem>
        {ATTENDANCE_ORDER.map((a) => (
          <LegendItem key={a} icon={icon(ATTENDANCE_MARKS[a].icon, TONE_TEXT[ATTENDANCE_MARKS[a].tone])}>
            {ATTENDANCE_MARKS[a].label}
          </LegendItem>
        ))}
        <LegendItem icon={DASH}>Тэмдэглээгүй, байхгүй</LegendItem>
        {makeup && <LegendItem icon={<MakeupChip status="DONE" />}>Нөхөх хичээлийн төлөв</LegendItem>}
      </Legend>
      {homework && (
        <Legend label="Даалгаврын тэмдэг">
          {HOMEWORK_ORDER.map((h) => (
            <LegendItem key={h} icon={icon(HOMEWORK_MARKS[h].icon, TONE_TEXT[HOMEWORK_MARKS[h].tone])}>
              {HOMEWORK_MARKS[h].label}
            </LegendItem>
          ))}
          {online && (
            <LegendItem icon={icon(Laptop, "text-brand")}>
              <span className="tabular-nums">
                <b className="font-bold text-ink">9</b>/12
              </span>{" "}
              онлайн гэрийн даалгаврын оноо
            </LegendItem>
          )}
          {sent && <LegendItem icon={<SentMark />}>Даалгавраа илгээсэн</LegendItem>}
          <LegendItem icon={icon(StickyNote, "text-brand")}>Тэмдэглэл</LegendItem>
        </Legend>
      )}
    </div>
  );
}
