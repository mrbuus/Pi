"use client";

import { Clock, Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { HwSentIcon, AttPresentIcon, HwDoneIcon } from "../shell/status";
import type { AttStatus, DayRecord, DemoLesson, DemoStudent, HwStatus, LateRange, RiskFlag } from "../world";
import { Legend, LegendItem } from "./parts";
import StudentCard from "./StudentCard";

/** «Бүгд …» товчоор өөрчилсөн нүднүүд (буцаахад яг эдгээрийг л) */
export interface BulkState {
  att: string[];
  hw: string[];
}

interface Props {
  lesson: DemoLesson;
  students: DemoStudent[];
  records: Map<string, DayRecord>;
  flags: Map<string, RiskFlag[]>;
  lateIds: Set<string>;
  open: Record<string, "auto" | "manual">;
  bulk: BulkState;
  presentCount: number;
  doneCount: number;
  /** Ирээгүй / ирц тэмдэглээгүй тул даалгаврыг нь алгасах сурагч */
  hwSkipped: number;
  onBulkPresent: () => void;
  onUndoPresent: () => void;
  onBulkDone: () => void;
  onUndoDone: () => void;
  onToggle: (id: string) => void;
  onAtt: (id: string, v: AttStatus | null) => void;
  onRange: (id: string, r: LateRange | null) => void;
  onAttNote: (id: string, text: string, typed: boolean) => void;
  onHw: (id: string, v: HwStatus | null) => void;
  onHwNote: (id: string, text: string, typed: boolean) => void;
  onViewer: (id: string) => void;
  onDrawer: (id: string) => void;
}

/**
 * Тэмдэглэх: товшилт бүр шууд хадгалагдана. Санал болгох дараалал — эхлээд
 * онцгой хэдэн сурагчийг тэмдэглээд, үлдсэнийг ДООРХ «Бүгд …» товчоор.
 */
export default function MarkView(p: Props) {
  const hw = !!p.lesson.homework;
  return (
    <div className="space-y-3">
      {(p.lesson.status === "upcoming" || !hw) && (
        <p className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <span>
            {p.lesson.status === "upcoming" && "Хичээл хараахан эхлээгүй, чөлөө авсныг урьдчилж тэмдэглэж болно"}
            {p.lesson.status === "upcoming" && !hw && <br />}
            {!hw && "Энэ хичээлд шалгах гэрийн даалгавар байхгүй"}
          </span>
        </p>
      )}

      <ul className="space-y-2" aria-label="Сурагчдын жагсаалт">
        {p.students.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            rec={p.records.get(s.id)!}
            flags={p.flags.get(s.id) ?? []}
            late={p.lateIds.has(s.id)}
            homework={hw}
            open={!!p.open[s.id]}
            onToggle={p.onToggle}
            onAtt={p.onAtt}
            onRange={p.onRange}
            onAttNote={p.onAttNote}
            onHw={p.onHw}
            onHwNote={p.onHwNote}
            onViewer={p.onViewer}
            onDrawer={p.onDrawer}
          />
        ))}
      </ul>

      <BulkActions {...p} homework={hw} />

      <Legend label="Тэмдгийн тайлбар" className="px-1">
        <LegendItem icon={<span aria-hidden className="inline-flex size-2.5 rounded-full bg-error ring-2 ring-error/20" />}>
          Шалгуур хангаагүй
        </LegendItem>
        {hw && <LegendItem icon={<HwSentIcon className="size-3.5 text-brand" aria-hidden />}>Илгээсэн хуудас, дарж үзнэ</LegendItem>}
        {hw && <LegendItem icon={<Clock className="size-3.5 text-warning" aria-hidden />}>Хугацаа хэтэрсэн илгээлт</LegendItem>}
      </Legend>
    </div>
  );
}

/* ───────── Бөөнөөр тэмдэглэх: жагсаалтын ХАМГИЙН ДООР ───────── */

function BulkButton({
  icon,
  label,
  count,
  undo,
  onApply,
  onUndo,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  /** Буцааж болох нүдний тоо (0 бол «Бүгд …» товч харагдана) */
  undo: number;
  onApply: () => void;
  onUndo: () => void;
}) {
  if (undo > 0) {
    return (
      <button
        type="button"
        onClick={onUndo}
        aria-label={`${label} товчоор тэмдэглэсэн ${undo} сурагчийг буцаах`}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-ink/5 sm:min-h-11"
      >
        <RotateCcw className="size-4" aria-hidden />
        Буцаах
        <span className="tabular-nums text-ink-dim">({undo})</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onApply}
      disabled={count === 0}
      className={cn(
        "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors sm:min-h-11",
        "border-brand-bright/40 bg-brand-bright/10 text-brand-soft hover:bg-brand-bright/20 disabled:border-line disabled:bg-transparent disabled:text-ink-dim disabled:opacity-60",
      )}
    >
      {icon}
      {label}
      <span className="tabular-nums">({count})</span>
    </button>
  );
}

function BulkActions(p: Props & { homework: boolean }) {
  return (
    <section aria-label="Үлдсэнийг нэг дор тэмдэглэх" className="rounded-xl border border-line bg-surface p-3">
      <h2 className="text-sm font-bold text-ink">Үлдсэнийг нэг дор</h2>
      <p className="mt-0.5 text-xs text-ink-dim">Онцгой сурагчдаа эхэлж тэмдэглээд үлдсэнийг энд, гараар тэмдэглэснийг хөндөхгүй</p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <BulkButton
          icon={<AttPresentIcon className="size-4" />}
          label="Бүгд ирсэн"
          count={p.presentCount}
          undo={p.bulk.att.length}
          onApply={p.onBulkPresent}
          onUndo={p.onUndoPresent}
        />
        {p.homework && (
          <BulkButton
            icon={<HwDoneIcon className="size-4" />}
            label="Бүгд хийсэн"
            count={p.doneCount}
            undo={p.bulk.hw.length}
            onApply={p.onBulkDone}
            onUndo={p.onUndoDone}
          />
        )}
      </div>
      {p.homework && p.hwSkipped > 0 && (
        <p className="mt-2 text-xs text-ink-dim">
          Ирээгүй, ирц тэмдэглээгүй {p.hwSkipped} сурагчийн даалгаврыг алгасна
        </p>
      )}
    </section>
  );
}
