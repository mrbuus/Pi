import { Laptop, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  HOMEWORK_ORDER,
  HwSentIcon,
  TONE_TEXT,
  type AttPresentIcon,
  type Tone,
} from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import type { StatusCounts } from "./lib";

/** Тайлбарын нэг зүйл (дүрс + бичиг) — жагсаалтын ДООР (эзэн: legend хамгийн доор) */
export function LegendItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </li>
  );
}

export function Legend({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-dim", className)}>
      {children}
    </ul>
  );
}

/** Шалгуур хангаагүй сурагчийн улаан цэгийн тайлбарын дүрс (marks.tsx RiskMark-тай ижил) */
export function RiskDot() {
  return <span aria-hidden className="inline-flex size-2.5 rounded-full bg-error ring-2 ring-error/20" />;
}

/** Тухайн хичээлийн даалгаврыг илгээсэн сурагчийн жижиг тэмдэг (нэрийн ард) */
export function SentMark({ className = "" }: { className?: string }) {
  return (
    <span title="Даалгавраа илгээсэн" className={cn("inline-flex shrink-0 text-brand", className)}>
      <HwSentIcon className="size-3.5" aria-hidden />
      <span className="sr-only">Даалгавраа илгээсэн</span>
    </span>
  );
}

/* ───────── Төлөв бүрийн тоо (эзэн 2026-10-22) — самбарын тойм, drawer хоёулаа ───────── */

export interface CountDef {
  key: string;
  label: string;
  icon: LucideIcon | typeof AttPresentIcon;
  tone: Tone | "neutral" | "brand";
  value: number;
  /** «12/15» хэлбэрээр */
  total?: number;
  /** Тэг үед: утсан дээр нууна, компьютер дээр бүдэг (давхардал, хэвтээ гүйлгээгүй) */
  hideZero?: boolean;
  /** Тэг үед бүр мөсөн нууна (ж: тэмдэглээгүй сурагчгүй) */
  dropZero?: boolean;
}

const toneIcon = (t: CountDef["tone"]) => (t === "neutral" ? "text-ink-dim" : t === "brand" ? "text-brand" : TONE_TEXT[t]);

/** Ирцийн тоо: Ирсэн, Хоцорсон, Тасалсан, Чөлөөтэй (+ Тэмдэглээгүй) — marks.tsx-ийн дүрс, өнгө */
export function attendanceCounts(c: StatusCounts, opts: { total?: number; unmarked?: boolean } = {}): CountDef[] {
  return [
    ...ATTENDANCE_ORDER.map((a, i) => ({
      key: a,
      label: ATTENDANCE_MARKS[a].label,
      icon: ATTENDANCE_MARKS[a].icon,
      tone: ATTENDANCE_MARKS[a].tone,
      value: c.attendance[a],
      ...(i === 0 ? { total: opts.total } : { hideZero: true }),
    })),
    ...(opts.unmarked
      ? [{ key: "att-none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral" as const, value: c.attendance.unmarked, dropZero: true }]
      : []),
  ];
}

/** Даалгаврын тоо: Хийсэн, Дутуу, Хийгээгүй (+ Тэмдэглээгүй) + Илгээсэн (+ Онлайн) */
export function homeworkCounts(
  c: StatusCounts | null,
  opts: { total?: number; unmarked?: boolean; sent?: number | null; online?: number | null } = {},
): CountDef[] {
  const out: CountDef[] = [];
  if (c) {
    out.push(
      ...HOMEWORK_ORDER.map((h, i) => ({
        key: h,
        label: HOMEWORK_MARKS[h].label,
        icon: HOMEWORK_MARKS[h].icon,
        tone: HOMEWORK_MARKS[h].tone,
        value: c.homework[h],
        ...(i === 0 ? { total: opts.total } : { hideZero: true }),
      })),
    );
    if (opts.unmarked) out.push({ key: "hw-none", label: "Тэмдэглээгүй", icon: Minus, tone: "neutral", value: c.homework.unmarked, dropZero: true });
  }
  if (opts.sent !== undefined && opts.sent !== null)
    out.push({ key: "sent", label: "Илгээсэн", icon: HwSentIcon, tone: "brand", value: opts.sent, total: opts.total });
  if (opts.online !== undefined && opts.online !== null)
    out.push({ key: "online", label: "Онлайн", icon: Laptop, tone: "brand", value: opts.online, total: opts.total });
  return out;
}

/**
 * Нэг мөр тоо: «Ирц» шошго + төлөв бүр (дүрс, нэр, тоо). Багтахгүй бол ороож доош буух тул
 * 390px утсан дээр хэвтээ гүйлгээ гарахгүй. `CountGrid` дотор шошгонууд нэг баганад тэгширнэ.
 */
export function CountRow({ label, items, className = "" }: { label: string; items: CountDef[]; className?: string }) {
  const shown = items.filter((i) => !(i.dropZero && i.value === 0));
  if (!shown.length) return null;
  return (
    <div role="group" aria-label={label} className={cn("contents", className)}>
      <span className="pt-px text-[11px] font-semibold leading-5 text-ink-dim sm:text-xs">{label}</span>
      <ul className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 sm:gap-x-3.5">
        {shown.map((i) => {
          const Icon = i.icon;
          const zero = i.value === 0;
          const text = `${i.label} ${i.value}${i.total !== undefined ? `/${i.total}` : ""}`;
          return (
            <li
              key={i.key}
              title={text}
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap leading-5",
                zero && i.hideZero && "hidden opacity-55 sm:inline-flex",
              )}
            >
              <Icon className={cn("size-3.5 shrink-0", toneIcon(i.tone))} aria-hidden />
              <span className="text-ink-dim">{i.label}</span>
              <b className="font-bold tabular-nums text-ink">
                {i.value}
                {i.total !== undefined && <span className="font-medium text-ink-dim">/{i.total}</span>}
              </b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Хэд хэдэн `CountRow`-ийн шошгыг нэг баганад тэгшилнэ */
export function CountGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5 text-xs sm:text-[13px]", className)}>
      {children}
    </div>
  );
}
