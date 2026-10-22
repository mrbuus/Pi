"use client";

import { Laptop, Minus, MoreHorizontal, NotebookPen, StickyNote, UserCheck } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  HOMEWORK_ORDER,
  RiskMark,
  TONE_SELECTED,
  TONE_TEXT,
  type MarkMeta,
} from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import {
  ABSENCE_REASONS,
  EXCUSED_REASONS,
  HOMEWORK_REASONS,
  LATE_RANGES,
  LATE_RANGE_LABEL,
  LATE_RANGE_SHORT,
  NOTE_MAX,
  type AttendanceStatus,
  type DayRec,
  type HomeworkStatus,
  type LateRangeValue,
  type MakeupStatus,
} from "./lib";
import MakeupChip from "./MakeupChip";
import { SentMark } from "./parts";

/** Ирц ба даалгаврын мөр ижил багануудтай — хоёр мөр босоогоор тэгширнэ */
const COLS = "grid-cols-[1.5rem_repeat(4,minmax(0,1fr))] sm:grid-cols-[5.75rem_repeat(4,minmax(0,1fr))]";

/** Бүх хайрцгийн нийтлэг хэлбэр: утсан дээр дүрс дээр, бичиг доор (≥44px); компьютер дээр нэг мөр */
export const BOX =
  "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 text-[11px] font-medium leading-tight transition-colors sm:min-h-9 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[13px]";
const BOX_IDLE = "border-line bg-surface text-ink-dim hover:border-ink/30 hover:text-ink";

/** Онлайн дүн: «9/12», «8,5/12» */
export function scoreText(score: number, max: number): string {
  const f = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  return `${f(score)}/${f(max)}`;
}

export interface OnlineCell {
  score: number;
  max: number;
  testId: string;
}

function StatusGroup<T extends string>({
  label,
  values,
  metaOf,
  value,
  onChange,
  extra,
  leading,
  className = "",
  children,
}: {
  label: string;
  values: T[];
  metaOf: Record<T, MarkMeta>;
  value: T | null;
  onChange: (v: T | null) => void;
  /** Сонгогдсон хайрцаг дотор нэмэлт бичиг (ж: «10–30 мин») */
  extra?: (v: T) => ReactNode;
  leading?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid items-stretch gap-1 sm:gap-1.5", className)}>
      {leading}
      {values.map((v) => {
        const meta = metaOf[v];
        const on = value === v;
        const Icon = meta.icon;
        const more = on ? extra?.(v) : null;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            // Дахин дарвал цэвэрлэнэ
            onClick={() => onChange(on ? null : v)}
            className={cn(BOX, "active:scale-[0.98]", on ? cn(TONE_SELECTED[meta.tone], "font-semibold") : BOX_IDLE)}
          >
            <Icon className={cn("size-4 shrink-0", on ? TONE_TEXT[meta.tone] : "opacity-60")} aria-hidden />
            <span className="cyrillic-tight max-w-full truncate">{meta.label}</span>
            {more && <span className="max-w-full truncate font-bold tabular-nums">{more}</span>}
          </button>
        );
      })}
      {children}
    </div>
  );
}

function RowLabel({ icon: Icon, text, className }: { icon: typeof UserCheck; text: string; className: string }) {
  return (
    <span aria-hidden className={cn("flex items-center justify-center gap-1.5 text-xs font-semibold sm:justify-start sm:pl-1", className)}>
      {/* Утсан дээр зөвхөн дүрс, том дэлгэцэнд зөвхөн үг (эзэн 2026-10-18) */}
      <Icon className="size-4 shrink-0 sm:hidden" />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

export interface CardProps {
  id: string;
  index: number;
  name: string;
  rec: DayRec;
  flags: string[];
  /** Энэ ангид гэрийн даалгаврыг тэмдэглэнэ (танхимын анги) */
  homework: boolean;
  /** Өмнөх хичээлийн онлайн гэрийн даалгаврын тест байгаа эсэх */
  onlineTests: boolean;
  online: OnlineCell | null;
  makeup: MakeupStatus | null;
  /** Тухайн хичээлийн даалгаврыг илгээсэн */
  sent: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  onAtt: (id: string, v: AttendanceStatus | null) => void;
  onRange: (id: string, r: LateRangeValue | null) => void;
  onAttNote: (id: string, text: string, typed: boolean) => void;
  onHw: (id: string, v: HomeworkStatus | null) => void;
  onHwNote: (id: string, text: string, typed: boolean) => void;
  onDrawer: (id: string) => void;
}

function StudentCardImpl({
  id,
  index,
  name,
  rec,
  flags,
  homework,
  onlineTests,
  online,
  makeup,
  sent,
  open,
  onToggle,
  onAtt,
  onRange,
  onAttNote,
  onHw,
  onHwNote,
  onDrawer,
}: CardProps) {
  const detailId = `note-${id}`;
  const preview = [rec.attNote.trim(), homework ? rec.hwNote.trim() : ""].filter(Boolean).join(", ");
  const detailRef = useRef<HTMLDivElement>(null);
  // «⋯»-ээр нээхэд компьютер дээр (хулгана) бичих талбарт фокуслана; утсан дээр гар гарч ирэхгүй
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    detailRef.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")?.focus({ preventScroll: true });
  }, [open]);

  const toggle = (viaMore: boolean) => {
    focusOnOpen.current = viaMore && !open && window.matchMedia("(pointer: fine)").matches;
    onToggle(id);
  };

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1 rounded-xl border border-line bg-surface p-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:p-2">
      {/* Нэр: утсан дээр дээд мөр, компьютер дээр зүүн багана */}
      <div className="col-start-1 row-start-1 flex min-h-11 min-w-0 items-center gap-1.5 pl-1 sm:min-h-0 sm:flex-col sm:items-stretch sm:gap-0.5 sm:pt-1">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:shrink">
          <RiskMark reasons={flags} />
          <span className="w-5 shrink-0 text-xs tabular-nums text-ink-dim">{index}</span>
          <button
            type="button"
            data-name-id={id}
            onClick={() => onDrawer(id)}
            aria-label={`${name}, сурагчийн мэдээлэл`}
            className="cyrillic-tight min-h-11 min-w-0 truncate text-left text-sm font-semibold text-ink underline decoration-ink-dim/40 decoration-dotted underline-offset-4 hover:text-brand-soft hover:decoration-brand-soft sm:min-h-8"
          >
            {name}
          </button>
          {sent && <SentMark />}
        </div>
        {makeup && (
          <span className="shrink-0 sm:pl-[2.625rem]">
            <MakeupChip status={makeup} />
          </span>
        )}
        {!open && preview && (
          <button
            type="button"
            aria-controls={detailId}
            aria-expanded={false}
            onClick={() => toggle(false)}
            title={preview}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-md text-left text-xs text-ink-dim hover:text-ink sm:min-h-6 sm:flex-none sm:pl-[2.625rem]"
          >
            <StickyNote className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="sr-only">Тэмдэглэл: </span>
            <span className="min-w-0 truncate">{preview}</span>
          </button>
        )}
      </div>

      {/* Хайрцгууд ба тайлбар */}
      <div className="col-span-2 col-start-1 row-start-2 mt-0.5 min-w-0 space-y-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0">
        <StatusGroup
          label={`Ирц, ${name}`}
          values={ATTENDANCE_ORDER}
          metaOf={ATTENDANCE_MARKS}
          value={rec.att}
          onChange={(v) => onAtt(id, v)}
          extra={(v) => (v === "LATE" && rec.lateRange ? LATE_RANGE_SHORT[rec.lateRange] : null)}
          className={cn(COLS, "rounded-lg bg-brand-bright/[0.07] p-1")}
          leading={<RowLabel icon={UserCheck} text="Ирц" className="text-brand" />}
        />
        {homework && (
          <StatusGroup
            label={`Даалгавар, ${name}`}
            values={HOMEWORK_ORDER}
            metaOf={HOMEWORK_MARKS}
            value={rec.hw}
            onChange={(v) => onHw(id, v)}
            className={cn(COLS, "rounded-lg bg-ink/[0.05] p-1")}
            leading={<RowLabel icon={NotebookPen} text="Даалгавар" className="text-ink-dim" />}
          >
            {online ? (
              <Link
                href={`/app/tests/${encodeURIComponent(online.testId)}/results`}
                aria-label={`${name}, онлайн гэрийн даалгавар ${scoreText(online.score, online.max)}, дүнг нээх`}
                className={cn(BOX, "border-brand-bright/40 bg-brand-bright/10 text-brand-soft hover:bg-brand-bright/20")}
              >
                <span className="inline-flex items-center gap-1">
                  <Laptop className="size-4 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Онлайн</span>
                </span>
                <span className="max-w-full truncate font-bold tabular-nums">{scoreText(online.score, online.max)}</span>
              </Link>
            ) : (
              <span
                title={onlineTests ? "Онлайнаар бодоогүй" : "Онлайн гэрийн даалгавар алга"}
                className={cn(BOX, "border-dashed border-line bg-transparent text-ink-dim/70")}
              >
                <span className="inline-flex items-center gap-1">
                  <Laptop className="size-4 shrink-0 opacity-50" aria-hidden />
                  <span className="hidden sm:inline">Онлайн</span>
                </span>
                <Minus className="size-3.5 shrink-0 opacity-60" aria-hidden />
                <span className="sr-only">{onlineTests ? "Онлайнаар бодоогүй" : "Онлайн гэрийн даалгавар алга"}</span>
              </span>
            )}
          </StatusGroup>
        )}
        {open && (
          <div ref={detailRef} id={detailId}>
            <NoteDetail
              name={name}
              rec={rec}
              homework={homework}
              onRange={(r) => onRange(id, r)}
              onAttNote={(t, typed) => onAttNote(id, t, typed)}
              onHwNote={(t, typed) => onHwNote(id, t, typed)}
            />
          </div>
        )}
      </div>

      {/* «⋯» — тайлбарын хэсгийг нээх/хаах */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={`${open ? "Тэмдэглэл хаах" : "Тэмдэглэл нээх"}, ${name}`}
        title={open ? "Тэмдэглэл хаах" : "Тэмдэглэл"}
        onClick={() => toggle(true)}
        className={cn(
          "col-start-2 row-start-1 inline-flex size-11 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink sm:col-start-3 sm:size-9",
          open && "bg-ink/[0.06] text-ink",
        )}
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
    </li>
  );
}

/* ───────── Тайлбар: хоцролтын хугацаа, шалтгаан, чөлөөт бичвэр ───────── */

function Chips<T extends string>({
  label,
  options,
  labelOf,
  value,
  onPick,
  className = "flex flex-wrap gap-1",
}: {
  label: string;
  options: readonly T[];
  labelOf?: (v: T) => string;
  value: string | null;
  onPick: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o)}
            className={cn(
              "cyrillic-tight min-h-11 rounded-lg border px-2.5 text-[13px] transition-colors sm:min-h-8",
              on ? "border-brand-bright bg-brand-bright/10 font-semibold text-brand-soft" : "border-line bg-surface text-ink-dim hover:border-ink/30 hover:text-ink",
            )}
          >
            {labelOf ? labelOf(o) : o}
          </button>
        );
      })}
    </div>
  );
}

const FIELD =
  "field-sizing-content block min-h-11 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-5 text-ink placeholder:text-ink-dim/70 disabled:cursor-not-allowed disabled:bg-ink/[0.03] sm:min-h-9 sm:py-1.5";

function Counter({ value }: { value: string }) {
  if (value.length <= NOTE_MAX - 40) return null;
  return (
    <p className="mt-0.5 text-right text-[11px] tabular-nums text-ink-dim">
      {value.length}/{NOTE_MAX}
    </p>
  );
}

function NoteInput({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (t: string) => void;
}) {
  return (
    <div>
      {/* Хүрээ, фокусын цагираг зөвхөн талбар дээр — хоёр давхар цагираггүй */}
      <textarea
        rows={1}
        value={value}
        maxLength={NOTE_MAX}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        enterKeyHint="done"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={FIELD}
      />
      <Counter value={value} />
    </div>
  );
}

/**
 * Шалтгаан: богино, гүйдэг жагсаалтаас сонгоод ард нь үргэлжлүүлэн бичиж болно (эзэн
 * 2026-10-18). Сонгосны дараа жагсаалт алга болж зай эзлэхгүй.
 */
function ReasonCombo({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (t: string, typed: boolean) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const q = value.trim().toLowerCase();
  const picked = options.some((o) => q.startsWith(o));
  const list = picked ? [] : q ? options.filter((o) => o.startsWith(q)) : options;
  // Хоосон үед шууд харагдана (гар нээгдэхгүйгээр сонгоно); бичиж эхэлбэл шүүгдэнэ
  const show = list.length > 0 && (q === "" || focused);
  return (
    <div>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={NOTE_MAX}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-expanded={show}
        aria-controls={id}
        aria-autocomplete="list"
        enterKeyHint="done"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value, true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={FIELD}
      />
      {show && (
        <ul id={id} role="listbox" aria-label={label} className="mt-1 max-h-[7.5rem] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface py-0.5">
          {list.map((o) => (
            <li key={o} role="option" aria-selected={false}>
              <button
                type="button"
                // Талбарын фокусыг алдахгүй (гар хаагдаж, нээгдээд байхгүй)
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o, false);
                  const el = ref.current;
                  if (el && document.activeElement === el) requestAnimationFrame(() => el.setSelectionRange(o.length, o.length));
                }}
                className="flex min-h-11 w-full items-center px-3 text-left text-sm text-ink transition-colors hover:bg-ink/5 sm:min-h-9"
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Counter value={value} />
    </div>
  );
}

function NoteDetail({
  name,
  rec,
  homework,
  onRange,
  onAttNote,
  onHwNote,
}: {
  name: string;
  rec: DayRec;
  homework: boolean;
  onRange: (r: LateRangeValue | null) => void;
  onAttNote: (t: string, typed: boolean) => void;
  onHwNote: (t: string, typed: boolean) => void;
}) {
  const late = rec.att === "LATE";
  const away = rec.att === "ABSENT" || rec.att === "EXCUSED";
  const hwNeeds = homework && (rec.hw === "PARTIAL" || rec.hw === "NOT_DONE");
  const showHw = hwNeeds || (homework && rec.hwNote.trim() !== "");
  const showAtt = late || away || !showHw || rec.attNote.trim() !== "";

  const attTitle = late ? "Хэр хоцорсон бэ" : rec.att === "ABSENT" ? "Тасалсан шалтгаан" : rec.att === "EXCUSED" ? "Чөлөөний шалтгаан" : "Тэмдэглэл";
  const hwTitle = rec.hw === "PARTIAL" ? "Дутуу хийсэн шалтгаан" : rec.hw === "NOT_DONE" ? "Хийгээгүй шалтгаан" : "Даалгаврын тэмдэглэл";

  return (
    <div className="space-y-2.5 rounded-lg border border-line bg-bg p-2">
      {showAtt && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-dim">{attTitle}</p>
          {late && (
            <Chips
              label={`Хоцорсон хугацаа, ${name}`}
              options={LATE_RANGES}
              labelOf={(r) => LATE_RANGE_LABEL[r]}
              className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap"
              value={rec.lateRange}
              onPick={(r) => onRange(rec.lateRange === r ? null : r)}
            />
          )}
          {away ? (
            <ReasonCombo
              label={`Шалтгаан, ${name}`}
              value={rec.attNote}
              options={rec.att === "EXCUSED" ? EXCUSED_REASONS : ABSENCE_REASONS}
              placeholder="Шалтгаан сонгох эсвэл бичих"
              onChange={onAttNote}
            />
          ) : (
            <NoteInput
              label={`${late ? "Хоцролтын тэмдэглэл" : "Тэмдэглэл"}, ${name}`}
              value={rec.attNote}
              disabled={rec.att === null}
              placeholder={rec.att === null ? "Ирцийг тэмдэглэсний дараа" : late ? "Тэмдэглэл (заавал биш)" : "Тэмдэглэл бичих"}
              onChange={(t) => onAttNote(t, true)}
            />
          )}
        </div>
      )}
      {showHw && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-dim">{hwTitle}</p>
          {hwNeeds ? (
            <ReasonCombo
              label={`Даалгаврын шалтгаан, ${name}`}
              value={rec.hwNote}
              options={HOMEWORK_REASONS}
              placeholder="Шалтгаан сонгох эсвэл бичих"
              onChange={onHwNote}
            />
          ) : (
            <NoteInput
              label={`Даалгаврын тайлбар, ${name}`}
              value={rec.hwNote}
              placeholder="Тайлбар бичих"
              onChange={(t) => onHwNote(t, true)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* Засварласан сурагчийн карт л дахин зурагдана */
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export default memo(StudentCardImpl, (p, n) => {
  for (const k of Object.keys(n) as Array<keyof CardProps>) {
    if (k === "flags") {
      if (!sameList(p.flags, n.flags)) return false;
    } else if (k === "online") {
      const a = p.online;
      const b = n.online;
      if (a?.score !== b?.score || a?.max !== b?.max || a?.testId !== b?.testId) return false;
    } else if (k === "rec") {
      const a = p.rec;
      const b = n.rec;
      if (a.att !== b.att || a.lateRange !== b.lateRange || a.attNote !== b.attNote || a.hw !== b.hw || a.hwNote !== b.hwNote) return false;
    } else if (p[k] !== n[k]) return false;
  }
  return true;
});
