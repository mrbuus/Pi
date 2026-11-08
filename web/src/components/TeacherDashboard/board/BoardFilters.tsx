"use client";

import { BookOpen, Laptop, ListFilter, Minus, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  HOMEWORK_ORDER,
  HwSentIcon,
  TONE_SELECTED,
  TONE_TEXT,
  type AttPresentIcon,
  type Tone,
} from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import type { AttendanceStatus, BoardStudent, DayRec, HomeworkStatus, OnlinePayload } from "./lib";
import { cleanTitle } from "@/components/homework-practice/lib";
import DeadlineButton from "./DeadlineButton";
import { RiskDot } from "./parts";
import { scoreText, type OnlineCell } from "./StudentCard";

/**
 * Самбарын шүүлтүүр ба хичээлийн мэдээлэл (эзэн 2026-11-03: «Хяналт», «Тэмдэглэх» хоёр таб нэг
 * болсон). Шүүлтүүрийг үргэлж задалж үзүүлэхгүй — «Шүүлтүүр» товчийг дарахад гарна.
 */

export type FilterKey =
  | "risk"
  | `att:${AttendanceStatus | "none"}`
  | `hw:${HomeworkStatus | "none" | "sent"}`
  | "online:yes"
  | "online:no";

export interface FilterCtx {
  rec: DayRec;
  flags: string[];
  online: OnlineCell | null;
  sent: boolean;
  /** Энэ өдрийн шалгалтын оноотой — даалгаврыг «Тэмдэглээгүй»-д тоолохгүй (эзэн 2026-11-08) */
  quiz?: boolean;
}

export function matchesFilter(f: FilterKey, { rec, flags, online, sent, quiz }: FilterCtx): boolean {
  if (f === "hw:none") return rec.hw === null && !quiz;
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
const SENT_CHIP: ChipDef = { key: "hw:sent", label: "Илгээсэн", icon: HwSentIcon, tone: "brand" };
const ONLINE_CHIPS: ChipDef[] = [
  { key: "online:yes", label: "Бодсон", icon: Laptop, tone: "brand" },
  { key: "online:no", label: "Бодоогүй", icon: Minus, tone: "neutral" },
];

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-base font-bold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] leading-tight text-ink-dim">{label}</p>
    </div>
  );
}

/** Тухайн хичээлийн сэдэв ба онлайн гэрийн даалгавар (нэгтгэсэн тоо) */
export function LessonInfo({
  classId,
  date,
  students,
  homework,
  topic,
  onlineData,
  online,
}: {
  classId: string;
  date: string;
  students: BoardStudent[];
  homework: boolean;
  topic: string | null;
  onlineData: OnlinePayload | null;
  online: Record<string, OnlineCell>;
}) {
  const hasOnline = homework && !!onlineData && onlineData.tests.length > 0;
  const solved = students.filter((s) => online[s.id]).length;
  const scores = students.map((s) => online[s.id]).filter((o): o is OnlineCell => !!o);
  const avg = scores.length ? scores.reduce((a, o) => a + o.score, 0) / scores.length : null;
  const maxOf = scores[0]?.max ?? null;
  return (
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
                      {cleanTitle(t.title, t.variant)}
                    </Link>{" "}
                    <span className="whitespace-nowrap text-ink-dim">({t.problems} бодлого)</span>
                  </span>
                ))
              ) : (
                <span className="text-ink-dim">алга</span>
              )}
              {/* Хугацаа (эзэн 2026-11-05): даалгаврын нэрийн ард, дарж өдөр/цаг/хаах эсэхийг тохируулна */}
              <DeadlineButton key={`${classId}|${date}`} classId={classId} date={date} />
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
  );
}

/**
 * «Шүүлтүүр» товч — дарахад тоотой шүүлтүүрүүд задарна, шүүсэн үед «N/M сурагч» + «Бүгд» товч
 * үргэлж харагдана (шүүлтүүр нуугдсан ч сурагч цөөрсөн нь мэдэгдэнэ).
 */
export function BoardFilters({
  students,
  recs,
  flags,
  homework,
  online,
  sent,
  hasOnline,
  filter,
  onFilter,
  shown,
  quizScored,
}: {
  students: BoardStudent[];
  recs: Map<string, DayRec>;
  flags: Map<string, string[]>;
  homework: boolean;
  online: Record<string, OnlineCell>;
  sent: Set<string>;
  hasOnline: boolean;
  filter: FilterKey | null;
  onFilter: (f: FilterKey | null) => void;
  /** Шүүлтүүрт тохирсон сурагчийн тоо */
  shown: number;
  /** Энэ өдрийн шалгалтын оноотой сурагчид */
  quizScored?: ReadonlySet<string>;
}) {
  const [open, setOpen] = useState(false);
  const ctxOf = (s: BoardStudent): FilterCtx => ({
    rec: recs.get(s.id)!,
    flags: flags.get(s.id) ?? [],
    online: online[s.id] ?? null,
    sent: sent.has(s.id),
    quiz: quizScored?.has(s.id),
  });
  const count = (f: FilterKey) => students.filter((s) => matchesFilter(f, ctxOf(s))).length;

  const chip = (c: ChipDef) => {
    const n = count(c.key);
    const on = filter === c.key;
    // Тэг тоотой чипийг үзүүлэхгүй (идэвхтэй шүүлтүүрийг л үлдээнэ)
    if (n === 0 && !on) return null;
    const Icon = c.icon;
    return (
      <button
        key={c.key}
        type="button"
        aria-pressed={on}
        onClick={() => onFilter(on ? null : c.key)}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors sm:min-h-8 sm:px-2.5",
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
    <section aria-label="Шүүлтүүр" className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors sm:min-h-9",
            open || filter ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line bg-surface text-ink hover:border-ink/30",
          )}
        >
          <ListFilter className="size-4" aria-hidden />
          Шүүлтүүр
          {filter && <span aria-hidden className="size-2 rounded-full bg-brand-bright" />}
        </button>
        {riskN > 0 && (
          <button
            type="button"
            aria-pressed={riskOn}
            onClick={() => onFilter(riskOn ? null : "risk")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors sm:min-h-8 sm:px-2.5",
              riskOn ? TONE_SELECTED.error : "border-line bg-surface text-ink hover:border-error/50",
            )}
          >
            <RiskDot />
            Асуудалтай
            <span className="font-bold tabular-nums text-error">{riskN}</span>
          </button>
        )}
        <p className="ml-auto text-xs text-ink-dim" aria-live="polite">
          {filter ? (
            <span className="inline-flex items-center gap-1">
              <span className="tabular-nums">
                <b className="font-bold text-ink">{shown}</b>/{students.length} сурагч
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
      {open && (
        <div className="space-y-1.5 rounded-xl border border-line bg-surface p-2">
          <FilterRow label="Ирц">{ATT_CHIPS.map(chip)}</FilterRow>
          {homework ? (
            <FilterRow label="Даалгавар">{[...HW_CHIPS, SENT_CHIP].map(chip)}</FilterRow>
          ) : (
            sent.size > 0 && <FilterRow label="Даалгавар">{chip(SENT_CHIP)}</FilterRow>
          )}
          {hasOnline && <FilterRow label="Онлайн">{ONLINE_CHIPS.map(chip)}</FilterRow>}
        </div>
      )}
    </section>
  );
}
