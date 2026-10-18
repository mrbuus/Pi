"use client";

import { Clock, MoreHorizontal, NotebookPen, StickyNote, UserCheck } from "lucide-react";
import { memo, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { RiskMark, HwSentIcon } from "../shell/status";
import {
  ABSENCE_REASONS,
  HOMEWORK_REASONS,
  LATE_RANGES,
  LATE_RANGE_LABEL,
  LATE_RANGE_SHORT,
  type AttStatus,
  type DayRecord,
  type DemoStudent,
  type HwStatus,
  type LateRange,
  type RiskFlag,
} from "../world";
import { ATT_META, ATT_ORDER, BOX, HW_META, HW_ORDER, StatusGroup } from "./StatusBoxes";
import { NOTE_MAX } from "./store";

/** Ирц ба даалгаврын мөр ижил багануудтай — хоёр мөр босоогоор тэгширнэ */
const COLS = "grid-cols-[1.5rem_repeat(4,minmax(0,1fr))] sm:grid-cols-[5.75rem_repeat(4,minmax(0,1fr))]";

function RowLabel({ icon: Icon, text, className }: { icon: typeof UserCheck; text: string; className: string }) {
  return (
    <span aria-hidden className={cn("flex items-center justify-center gap-1.5 text-xs font-semibold sm:justify-start sm:pl-1", className)}>
      {/* Утсан дээр зөвхөн дүрс (зай бага), том дэлгэцэнд зөвхөн үг (эзэн 2026-10-18) */}
      <Icon className="size-4 shrink-0 sm:hidden" />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

export interface CardProps {
  student: DemoStudent;
  rec: DayRecord;
  flags: RiskFlag[];
  /** Илгээлт хугацаанаас хоцорсон */
  late: boolean;
  /** Энэ хичээлд шалгах даалгавар бий */
  homework: boolean;
  open: boolean;
  onToggle: (id: string) => void;
  onAtt: (id: string, v: AttStatus | null) => void;
  onRange: (id: string, r: LateRange | null) => void;
  onAttNote: (id: string, text: string, typed: boolean) => void;
  onHw: (id: string, v: HwStatus | null) => void;
  onHwNote: (id: string, text: string, typed: boolean) => void;
  onViewer: (id: string) => void;
  onDrawer: (id: string) => void;
}

function StudentCardImpl({
  student,
  rec,
  flags,
  late,
  homework,
  open,
  onToggle,
  onAtt,
  onRange,
  onAttNote,
  onHw,
  onHwNote,
  onViewer,
  onDrawer,
}: CardProps) {
  const id = student.id;
  const detailId = `note-${id}`;
  const preview = [rec.attNote.trim(), homework ? rec.hwNote.trim() : ""].filter(Boolean).join(", ");
  const detailRef = useRef<HTMLDivElement>(null);
  // «⋯»-ээр нээхэд компьютер дээр (хулгана) бичих талбарт фокуслана; утсан дээр гар гарч ирэхгүй
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    detailRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
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
          <RiskMark flags={flags} />
          <span className="w-5 shrink-0 text-xs tabular-nums text-ink-dim">{student.index}</span>
          <button
            type="button"
            data-name-id={id}
            onClick={() => onDrawer(id)}
            aria-label={`${student.name}, сурагчийн мэдээлэл`}
            className="cyrillic-tight min-h-11 min-w-0 truncate text-left text-sm font-semibold text-ink underline decoration-ink-dim/40 decoration-dotted underline-offset-4 hover:text-brand-soft hover:decoration-brand-soft sm:min-h-8"
          >
            {student.name}
          </button>
        </div>
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
          label={`Ирц, ${student.name}`}
          values={ATT_ORDER}
          metaOf={ATT_META}
          value={rec.att}
          onChange={(v) => onAtt(id, v)}
          extra={(v) => (v === "late" && rec.lateRange ? LATE_RANGE_SHORT[rec.lateRange] : null)}
          className={cn(COLS, "rounded-lg bg-brand-bright/[0.07] p-1")}
          leading={<RowLabel icon={UserCheck} text="Ирц" className="text-brand" />}
        />
        {homework && (
          <StatusGroup
            label={`Даалгавар, ${student.name}`}
            values={HW_ORDER}
            metaOf={HW_META}
            value={rec.hw}
            onChange={(v) => onHw(id, v)}
            className={cn(COLS, "rounded-lg bg-ink/[0.05] p-1")}
            leading={<RowLabel icon={NotebookPen} text="Даалгавар" className="text-ink-dim" />}
          >
            {rec.submission ? (
              <button
                type="button"
                data-open-id={id}
                onClick={() => onViewer(id)}
                aria-label={`${student.name}, илгээсэн ${rec.submission.pages} хуудсыг нээх${late ? ", хугацаа хэтэрсэн" : ""}`}
                className={cn(BOX, "border-brand-bright/40 bg-brand-bright/10 text-brand-soft hover:bg-brand-bright/20 active:scale-[0.98]")}
              >
                <span className="inline-flex items-center gap-1">
                  <HwSentIcon className="size-4 shrink-0" aria-hidden />
                  <span className="font-bold tabular-nums sm:hidden">{rec.submission.pages} х.</span>
                </span>
                <span className="cyrillic-tight max-w-full truncate">Илгээсэн</span>
                <span className="hidden rounded bg-brand-bright/15 px-1.5 text-xs font-bold tabular-nums sm:inline">
                  {rec.submission.pages} х.
                </span>
                {late && <Clock className="absolute right-1 top-1 size-3 text-warning" aria-hidden />}
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-label={`${student.name}, илгээгээгүй`}
                className={cn(BOX, "cursor-not-allowed border-dashed border-line bg-transparent px-0 text-[10px] tracking-tight text-ink-dim/70 sm:px-2 sm:text-[13px] sm:tracking-normal")}
              >
                <HwSentIcon className="size-4 shrink-0 opacity-40" aria-hidden />
                <span className="cyrillic-tight max-w-full truncate">Илгээгээгүй</span>
              </button>
            )}
          </StatusGroup>
        )}
        {open && (
          <div ref={detailRef} id={detailId}>
            <NoteDetail
              student={student}
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
        aria-label={`${open ? "Тэмдэглэл хаах" : "Тэмдэглэл нээх"}, ${student.name}`}
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

/* ───────── Тайлбар: хоцролтын хугацаа, шалтгааны чип, чөлөөт бичвэр ───────── */

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

function NoteInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (t: string) => void }) {
  return (
    <div>
      {/* Хүрээ, фокусын цагираг нь зөвхөн талбар дээр — хоёр давхар цагираггүй */}
      <textarea
        rows={1}
        value={value}
        maxLength={NOTE_MAX}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="done"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="field-sizing-content block min-h-11 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-5 text-ink placeholder:text-ink-dim/70 sm:min-h-9 sm:py-1.5"
      />
      {value.length > NOTE_MAX - 40 && (
        <p className="mt-0.5 text-right text-[11px] tabular-nums text-ink-dim">
          {value.length}/{NOTE_MAX}
        </p>
      )}
    </div>
  );
}

/**
 * Шалтгаан: богино, дээш доош гүйдэг жагсаалтаас сонгоод ард нь үргэлжлүүлэн бичиж
 * болно (эзэн 2026-10-18). Сонгосны дараа жагсаалт алга болж зай эзлэхгүй.
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
        className="field-sizing-content block min-h-11 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-5 text-ink placeholder:text-ink-dim/70 sm:min-h-9 sm:py-1.5"
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
      {value.length > NOTE_MAX - 40 && (
        <p className="mt-0.5 text-right text-[11px] tabular-nums text-ink-dim">
          {value.length}/{NOTE_MAX}
        </p>
      )}
    </div>
  );
}

function NoteDetail({
  student,
  rec,
  homework,
  onRange,
  onAttNote,
  onHwNote,
}: {
  student: DemoStudent;
  rec: DayRecord;
  homework: boolean;
  onRange: (r: LateRange | null) => void;
  onAttNote: (t: string, typed: boolean) => void;
  onHwNote: (t: string, typed: boolean) => void;
}) {
  const late = rec.att === "late";
  const away = rec.att === "absent" || rec.att === "excused";
  const hwNeeds = homework && (rec.hw === "partial" || rec.hw === "missing");
  const showHw = hwNeeds || (homework && rec.hwNote.trim() !== "");
  const showAtt = late || away || !showHw || rec.attNote.trim() !== "";

  const attTitle = late ? "Хэр хоцорсон бэ" : rec.att === "absent" ? "Тасалсан шалтгаан" : rec.att === "excused" ? "Чөлөөний шалтгаан" : "Тэмдэглэл";
  const hwTitle = rec.hw === "partial" ? "Дутуу хийсэн шалтгаан" : rec.hw === "missing" ? "Хийгээгүй шалтгаан" : "Даалгаврын тэмдэглэл";

  return (
    <div className="space-y-2.5 rounded-lg border border-line bg-bg p-2">
      {showAtt && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-dim">{attTitle}</p>
          {late && (
            <Chips
              label={`Хоцорсон хугацаа, ${student.name}`}
              options={LATE_RANGES}
              labelOf={(r) => LATE_RANGE_LABEL[r]}
              className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap"
              value={rec.lateRange}
              onPick={(r) => onRange(rec.lateRange === r ? null : r)}
            />
          )}
          {away ? (
            <ReasonCombo
              label={`Шалтгаан, ${student.name}`}
              value={rec.attNote}
              options={ABSENCE_REASONS}
              placeholder="Шалтгаан сонгох эсвэл бичих"
              onChange={onAttNote}
            />
          ) : (
            <NoteInput
              label={`${late ? "Хоцролтын тэмдэглэл" : "Тэмдэглэл"}, ${student.name}`}
              value={rec.attNote}
              placeholder={late ? "Тэмдэглэл (заавал биш)" : "Тэмдэглэл бичих"}
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
              label={`Даалгаврын шалтгаан, ${student.name}`}
              value={rec.hwNote}
              options={HOMEWORK_REASONS}
              placeholder="Шалтгаан сонгох эсвэл бичих"
              onChange={onHwNote}
            />
          ) : (
            <NoteInput
              label={`Даалгаврын тайлбар, ${student.name}`}
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

/* Засварласан сурагчийн карт л дахин зурагдана (бүртгэл, тэмдэг талбараар нь харьцуулна) */
const sameFlags = (a: RiskFlag[], b: RiskFlag[]) => a.length === b.length && a.every((f, i) => f.label === b[i].label);

export default memo(StudentCardImpl, (p, n) => {
  for (const k of Object.keys(n) as Array<keyof CardProps>) {
    if (k === "flags") {
      if (!sameFlags(p.flags, n.flags)) return false;
    } else if (k === "rec") {
      const a = p.rec;
      const b = n.rec;
      if (
        a.att !== b.att ||
        a.lateRange !== b.lateRange ||
        a.attNote !== b.attNote ||
        a.hw !== b.hw ||
        a.hwNote !== b.hwNote ||
        a.submission?.submittedAt !== b.submission?.submittedAt
      )
        return false;
    } else if (p[k] !== n[k]) return false;
  }
  return true;
});
