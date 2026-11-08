"use client";

import { Info, Laptop, RotateCcw } from "lucide-react";
import { AttPresentIcon, HwDoneIcon } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import type { AttendanceStatus, BoardStudent, DayRec, HomeworkStatus, LateRangeValue, MakeupStatus } from "./lib";
import MakeupChip from "./MakeupChip";
import { Legend, LegendItem, RiskDot } from "./parts";
import StudentCard, { type OnlineCell } from "./StudentCard";
import type { QuizCellState } from "./useHomeworkQuiz";

/** «Бүгд …» товчоор өөрчилсөн нүднүүд (буцаахад яг эдгээрийг л) */
export interface BulkState {
  att: string[];
  hw: string[];
}

interface Props {
  students: BoardStudent[];
  /** Жагсаалтын нэр: «Б. Нэр», давхцвал овог бүтнээр (lib/personName.rosterNames) */
  names: Map<string, string>;
  recs: Map<string, DayRec>;
  flags: Map<string, string[]>;
  homework: boolean;
  upcoming: boolean;
  onlineTests: boolean;
  online: Record<string, OnlineCell>;
  makeup: Map<string, MakeupStatus>;
  sent: Set<string>;
  open: Record<string, "auto" | "manual">;
  bulk: BulkState;
  bulkBusy: boolean;
  presentCount: number;
  doneCount: number;
  /** Ирээгүй / ирц тэмдэглээгүй тул даалгаврыг нь алгасах сурагч */
  hwSkipped: number;
  onBulkPresent: () => void;
  onUndoPresent: () => void;
  onBulkDone: () => void;
  onUndoDone: () => void;
  onToggle: (id: string) => void;
  onAtt: (id: string, v: AttendanceStatus | null) => void;
  onRange: (id: string, r: LateRangeValue | null) => void;
  onAttNote: (id: string, text: string, typed: boolean) => void;
  onHw: (id: string, v: HomeworkStatus | null) => void;
  onHwNote: (id: string, text: string, typed: boolean) => void;
  onDrawer: (id: string) => void;
  onOnline: (id: string) => void;
  /** Шалгалтаар даалгавар шалгах (QuizBar, эзэн 2026-11-08) */
  quiz?: QuizCardProps;
}

/** Шалгалтын онооны талбарт хэрэгтэй бүх зүйл (useHomeworkQuiz-ээс) */
export interface QuizCardProps {
  /** Харагдаж буй үед бодлогын тоо; нуусан/шалгалтгүй бол null */
  max: number | null;
  scores: Map<string, number>;
  cells: Map<string, QuizCellState>;
  onScore: (id: string, value: number | null, now?: boolean) => void;
  onFlush: (id: string) => void;
  onInvalid: (id: string, invalid: boolean) => void;
}

const NO_FLAGS: string[] = [];

/**
 * Тэмдэглэх: товшилт бүр шууд хадгалагдана. Эхлээд онцгой хэдэн сурагчийг
 * тэмдэглээд, үлдсэнийг ДООРХ «Бүгд …» товчоор (эзэн 2026-10-17).
 */
export default function MarkView(p: Props) {
  return (
    <div className="space-y-3">
      {p.upcoming && (
        <p className="flex items-start gap-2 rounded-lg bg-info/10 px-3 py-2 text-sm text-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <span>Хичээл хараахан эхлээгүй, чөлөө авсныг урьдчилж тэмдэглэж болно</span>
        </p>
      )}

      <ul className="space-y-2" aria-label="Сурагчдын жагсаалт">
        {p.students.map((s, i) => (
          <StudentCard
            key={s.id}
            id={s.id}
            index={i + 1}
            name={p.names.get(s.id) ?? s.firstName}
            rec={p.recs.get(s.id)!}
            flags={p.flags.get(s.id) ?? NO_FLAGS}
            homework={p.homework}
            onlineTests={p.onlineTests}
            online={p.online[s.id] ?? null}
            makeup={p.makeup.get(s.id) ?? null}
            sent={p.sent.has(s.id)}
            open={!!p.open[s.id]}
            onToggle={p.onToggle}
            onAtt={p.onAtt}
            onRange={p.onRange}
            onAttNote={p.onAttNote}
            onHw={p.onHw}
            onHwNote={p.onHwNote}
            onDrawer={p.onDrawer}
            onOnline={p.onOnline}
            {...(p.quiz && {
              quizMax: p.quiz.max,
              quizScore: p.quiz.scores.get(s.id) ?? null,
              quizState: p.quiz.cells.get(s.id) ?? null,
              onQuizScore: p.quiz.onScore,
              onQuizFlush: p.quiz.onFlush,
              onQuizInvalid: p.quiz.onInvalid,
            })}
          />
        ))}
      </ul>

      <BulkActions {...p} />

      <Legend label="Тэмдгийн тайлбар" className="px-1">
        <LegendItem icon={<RiskDot />}>Шалгуур хангаагүй</LegendItem>
        {p.homework && p.sent.size > 0 && (
          <LegendItem icon={<span aria-hidden className="size-3.5 rounded border border-brand-bright/60 bg-brand-bright/10" />}>
            Даалгавраа илгээсэн ч шалгаагүй, тэмдэглэмэгц энгийн болно
          </LegendItem>
        )}
        {p.homework && p.onlineTests && (
          <LegendItem icon={<Laptop className="size-3.5 text-brand" aria-hidden />}>
            Өмнөх хичээлийн онлайн гэрийн даалгаврын оноо, дарж дүнг үзнэ
          </LegendItem>
        )}
        {p.makeup.size > 0 && <LegendItem icon={<MakeupChip status="PENDING" />}>Нөхөх хичээлийн төлөв</LegendItem>}
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
  busy,
  onApply,
  onUndo,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  /** Буцааж болох нүдний тоо (0 бол «Бүгд …» товч харагдана) */
  undo: number;
  busy: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  if (undo > 0) {
    return (
      <button
        type="button"
        onClick={onUndo}
        disabled={busy}
        aria-label={`${label} товчоор тэмдэглэсэн ${undo} сурагчийг буцаах`}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60 sm:min-h-11"
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
      disabled={count === 0 || busy}
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

function BulkActions(p: Props) {
  return (
    <section aria-label="Үлдсэнийг нэг дор тэмдэглэх" className="rounded-xl border border-line bg-surface p-3">
      <h2 className="text-sm font-bold text-ink">Үлдсэнийг нэг дор</h2>
      <p className="mt-0.5 text-xs text-ink-dim">Гараар тэмдэглэснийг хөндөхгүй</p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <BulkButton
          icon={<AttPresentIcon className="size-4" aria-hidden />}
          label="Бүгд ирсэн"
          count={p.presentCount}
          undo={p.bulk.att.length}
          busy={p.bulkBusy}
          onApply={p.onBulkPresent}
          onUndo={p.onUndoPresent}
        />
        {p.homework && (
          <BulkButton
            icon={<HwDoneIcon className="size-4" aria-hidden />}
            label="Бүгд хийсэн"
            count={p.doneCount}
            undo={p.bulk.hw.length}
            busy={p.bulkBusy}
            onApply={p.onBulkDone}
            onUndo={p.onUndoDone}
          />
        )}
      </div>
      {p.homework && p.hwSkipped > 0 && (
        <p className="mt-2 text-xs text-ink-dim">Ирээгүй, ирц тэмдэглээгүй {p.hwSkipped} сурагчийн даалгаврыг алгасна</p>
      )}
    </section>
  );
}
