"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { getRole } from "@/lib/api";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import ChapterPicker from "./ChapterPicker";
import Dialog from "./Dialog";
import type { SetPatch } from "./draftApi";
import { SUBJECT_LABEL, type DraftEvent, type DraftSetSummary, type Subject } from "./model";

const input =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25";

/** Хичээл, бүлгийн шошго, сэдэв — нийтлэхэд санал болгоно */
export function SettingsDialog({
  open,
  onOpenChange,
  set,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  set: DraftSetSummary;
  onChange: (patch: SetPatch, chapter?: { id: string; title: string } | null) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Тохиргоо"
      description="Бүлгийг нийтлэх үед урьдчилан сонгоно"
      footer={<Button onClick={() => onOpenChange(false)}>Болсон</Button>}
    >
      <div className="space-y-5">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
          Хичээл
          <select
            value={set.subject}
            onChange={(e) => onChange({ subject: e.target.value as Subject, chapterId: null }, null)}
            className={input}
          >
            {(Object.keys(SUBJECT_LABEL) as Subject[]).map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <ChapterPicker
          idPrefix="settings"
          subject={set.subject}
          value={set.chapterId}
          onChange={(chapterId, chapter) => onChange({ chapterId }, chapter)}
        />
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
          Сэдэв
          <input
            defaultValue={set.topic ?? ""}
            onChange={(e) => onChange({ topic: e.target.value || null })}
            placeholder="Квадрат тэгшитгэл"
            maxLength={120}
            className={input}
          />
        </label>
      </div>
    </Dialog>
  );
}

/** Хэн юуг өөрчилсөн — ноорогийн түүх */
export function HistoryDialog({
  open,
  onOpenChange,
  events,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: DraftEvent[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Түүх" description="Сүүлийн 30 өөрчлөлт">
      {events.length === 0 ? (
        <p className="flex items-center gap-2 py-6 text-sm text-ink-dim">
          <History className="size-4" aria-hidden /> Өөрчлөлт алга
        </p>
      ) : (
        <ol className="relative space-y-4 border-l border-line pl-5">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span aria-hidden className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-surface bg-brand-bright" />
              <p className="text-sm font-semibold text-ink">{e.summary}</p>
              <p className="text-xs text-ink-dim">
                {e.actorName}, {relativeTimeMn(e.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

/** Зөвхөн Багш+/Админ — бусдад эелдэг тайлбар (жинхэнэ хамгаалалт серверт) */
export function canUseInternal(): boolean {
  const role = getRole();
  return role === "ADMIN" || role === "TEACHER_PLUS";
}

export function NoAccess() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface px-6 py-10 text-center">
      <p className="text-lg font-extrabold text-ink">Дотоод хэсэг</p>
      <p className="mt-1 text-sm text-ink-dim">Багш+ болон Админ эрхтэй ажилтанд нээлттэй</p>
    </div>
  );
}
