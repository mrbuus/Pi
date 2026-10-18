"use client";

import { type LucideIcon, type LucideProps } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AttStatus, HwStatus, RiskFlag } from "../world";

/**
 * /demo/* бүх хэсэгт НЭГ хэв маяг: ирц/даалгаврын төлөвийн дүрс, өнгө, шошго,
 * асуудалтай хүүхдийн улаан тэмдэг. Самбар, Ангиуд, Сурагчид ижил харагдана.
 */

/**
 * Ирсэн = өргөсөн гар (Microsoft Fluent UI «hand_right», MIT) — Teams-ийн «гар өргөх»
 * тэмдэгтэй адил, шууд танигдана (эзэн 2026-10-18).
 */
export function RaisedHandIcon({ className, ...rest }: LucideProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cn("lucide", className)} aria-hidden {...rest}>
      <path d="M12 4v6.25a.75.75 0 0 0 1.5 0V5.22c0-.24.2-.47.5-.48.26 0 .5.25.5.5v7.5a.75.75 0 0 0 1.3.52l.12-.12q.15-.13.4-.32c.36-.25.81-.5 1.3-.58.54-.1 1.05-.04 1.4.14q.31.14.44.53l-1.66 1.24-.08.07-2.18 2.17q-1.4 1.42-2.3 3.2c-.28.56-.85.91-1.47.91H9.04a1.5 1.5 0 0 1-1.33-.71C6.98 18.53 6 16.5 6 14.75V7c0-.27.22-.5.5-.5s.5.23.5.5v3.5a.75.75 0 0 0 1.5 0V5.25c0-.28.22-.5.5-.5s.5.22.5.5v5a.75.75 0 0 0 1.5 0V4c0-.28.21-.5.5-.5s.5.22.5.5m1.99-.76q-.32 0-.6.1Zm-.6.1A2 2 0 0 0 11.49 2c-.9 0-1.61.58-1.88 1.34q-.29-.1-.61-.1a2 2 0 0 0-1.99 1.82A2 2 0 0 0 4.5 7v7.75c0 2.18 1.17 4.51 1.92 5.8A3 3 0 0 0 9.04 22h2.73c1.19 0 2.28-.67 2.81-1.74q.79-1.57 2.02-2.8l2.14-2.14 1.96-1.47c.19-.14.3-.37.3-.6 0-1.06-.53-1.8-1.3-2.2a3.8 3.8 0 0 0-2.33-.29q-.79.17-1.37.5V5.25c0-1.06-.89-2.01-2.01-2" />
    </svg>
  );
}

/** Дутуу = хагас будсан тойрог (Fluent UI «circle_half_fill», MIT) — «хагас хийсэн» */
export function HalfDoneIcon({ className, ...rest }: LucideProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cn("lucide", className)} aria-hidden {...rest}>
      <path d="M3.5 12a8.5 8.5 0 0 1 17 0zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" />
    </svg>
  );
}

/** Цаасан журналын тэмдэглэгээ (эзэн 2026-10-18): Хоцорсон = «Х», Тасалсан = бүдүүн хар цэг, Чөлөөтэй = «Ч» */
function MarkIcon({ className, children, ...rest }: LucideProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/** «Х» — хоцорсон (үсгийг зураасаар зурсан, фонтоос хамаарахгүй) */
export function LateMarkIcon(props: LucideProps) {
  return (
    <MarkIcon {...props}>
      <path d="M6.5 4.5 17.5 19.5M17.5 4.5 6.5 19.5" strokeWidth={2.6} />
    </MarkIcon>
  );
}

/** Хүн дээр бүдүүн хар цэг дарсан — тасалсан */
export function AbsentMarkIcon(props: LucideProps) {
  return (
    <MarkIcon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-.5A5 5 0 0 1 8 14.5h1.5" />
      <circle cx="16.5" cy="16.5" r="4.5" fill="currentColor" />
    </MarkIcon>
  );
}

/** «Ч» — чөлөөтэй */
export function ExcusedMarkIcon(props: LucideProps) {
  return (
    <MarkIcon {...props}>
      <path d="M7.5 4.5v5a4 4 0 0 0 4 4h5" strokeWidth={2.6} />
      <path d="M16.5 4.5v15" strokeWidth={2.6} />
    </MarkIcon>
  );
}

/* ───────── Дүрсийн «гэр бүл» (эзэн 2026-10-18): ирц = нэг хүн + журналын тэмдэг,
   даалгавар = нэг дэвтэр + дотор нь тэмдэг. Lucide-ийн user/book суурь, зураас 2. ───────── */

function Stroke({ className, children, ...rest }: LucideProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const PERSON = (
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </>
);

/** Ирсэн — хүн + ✓ */
export function AttPresentIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="m16 11 2 2 4-4" /></Stroke>;
}
/** Хоцорсон — хүн + «Х» (журналын тэмдэг) */
export function AttLateIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="m17 8 5 6M22 8l-5 6" /></Stroke>;
}
/** Тасалсан — хүн + бүдүүн цэг */
export function AttAbsentIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<circle cx="19.5" cy="11" r="2.75" fill="currentColor" /></Stroke>;
}
/** Чөлөөтэй — хүн + «Ч» */
export function AttExcusedIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="M17 8v2.2a1.8 1.8 0 0 0 1.8 1.8H22M22 8v6" /></Stroke>;
}

const BOOK = <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />;

/** Хийсэн — дэвтэр + ✓ */
export function HwDoneIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="m9 9.5 2 2 4-4" /></Stroke>;
}
/** Дутуу — дэвтэр + хагас будсан тойрог */
export function HwPartialIcon(p: LucideProps) {
  return (
    <Stroke {...p}>
      {BOOK}
      <circle cx="12" cy="9.5" r="3.25" />
      <path d="M12 6.25a3.25 3.25 0 0 1 0 6.5z" fill="currentColor" stroke="none" />
    </Stroke>
  );
}
/** Хийгээгүй — дэвтэр + ✕ */
export function HwMissingIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="m14.5 7-5 5M9.5 7l5 5" /></Stroke>;
}
/** Илгээсэн — дэвтэр + дээш сум (зураг илгээсэн) */
export function HwSentIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="M12 13V6.5M9 9.5l3-3 3 3" /></Stroke>;
}

export type Tone = "success" | "warning" | "error" | "info";

export interface StatusMeta {
  label: string;
  icon: LucideIcon | typeof RaisedHandIcon;
  tone: Tone;
}

export const ATT_META: Record<AttStatus, StatusMeta> = {
  present: { label: "Ирсэн", icon: AttPresentIcon, tone: "success" },
  late: { label: "Хоцорсон", icon: AttLateIcon, tone: "warning" },
  absent: { label: "Тасалсан", icon: AttAbsentIcon, tone: "error" },
  excused: { label: "Чөлөөтэй", icon: AttExcusedIcon, tone: "info" },
};

export const HW_META: Record<HwStatus, StatusMeta> = {
  done: { label: "Хийсэн", icon: HwDoneIcon, tone: "success" },
  partial: { label: "Дутуу", icon: HwPartialIcon, tone: "warning" },
  missing: { label: "Хийгээгүй", icon: HwMissingIcon, tone: "error" },
};

/** Сонгогдсон хайрцаг/чипийн өнгө (хүрээ + дэвсгэр + бичвэр) */
export const TONE_SELECTED: Record<Tone, string> = {
  success: "border-success bg-success/15 text-success",
  warning: "border-warning bg-warning/15 text-warning",
  error: "border-error bg-error/15 text-error",
  info: "border-info bg-info/15 text-info",
};

/** Зөвхөн бичвэр/дүрсний өнгө (жагсаалт, хүснэгтэд) */
export const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

/**
 * Асуудалтай хүүхдийн тэмдэг — нэрийн ӨМНӨ тавина. Шалгуур хангаагүй бол улаан
 * цэг (дээр нь очиход/дэлгэц уншигчид шалтгаан), асуудалгүй бол ижил өргөнтэй
 * хоосон зай (баганууд зэрэгцэж харагдана).
 */
export function RiskMark({ flags, className }: { flags: RiskFlag[]; className?: string }) {
  if (!flags.length) return <span aria-hidden className={cn("inline-block size-2.5 shrink-0", className)} />;
  const text = flags.map((f) => f.label).join(", ");
  return (
    <span title={text} className={cn("inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20", className)}>
      <span className="sr-only">Шалгуур хангаагүй: {text}</span>
    </span>
  );
}

/* ───────── Цаг хамаарсан өгөгдөл: серверт биш, зөвхөн хөтөчид зурна ───────── */

const noopSubscribe = () => () => {};

/** Хөтөчид mount болсон эсэх — world.ts одоогийн цагаас хамаардаг тул hydration зөрөхөөс сэргийлнэ */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const mounted = useMounted();
  if (mounted) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <div aria-busy className="space-y-3" aria-label="Ачаалж байна">
          <div className="h-16 animate-pulse rounded-2xl bg-panel" />
          <div className="h-40 animate-pulse rounded-2xl bg-panel" />
        </div>
      )}
    </>
  );
}
