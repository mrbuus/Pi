"use client";

import { Clock, Repeat } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import type { Slot } from "../world";
import Popover from "./Popover";
import { DEFAULT_DEADLINE, deadlineText, type DeadlineRule } from "./store";

export const AUTO_TIP = "Хичээл эхлэхэд автоматаар хаагдана";

/**
 * Даалгаврын хугацаа: жижиг цагийн товч. Тохируулаагүй бол тухайн өдрийн
 * хичээл эхлэх цагт автоматаар хаагдана (бүдэг харагдана). Өөрөө тавибал
 * өмнөх өдөр эсвэл тэр өдрийн цаг, «Байнга энэ цагт» бол хичээлтэй өдөр бүр.
 */
export default function DeadlineButton({
  rule,
  recurring,
  slot,
  onSave,
}: {
  rule: DeadlineRule;
  recurring: boolean;
  slot: Slot;
  onSave: (rule: DeadlineRule, recurring: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = deadlineText(rule, slot);
  // Утсан дээр зөвхөн цаг (бүтэн бичиг aria-label, title-д)
  const short = rule.mode === "auto" ? slot.start : rule.time;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Даалгаврын хугацаа"
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Даалгаврын хугацаа: ${text}${rule.mode === "auto" ? ", хичээл эхлэхэд автоматаар хаагдана" : recurring ? ", байнга" : ""}`}
          title={rule.mode === "auto" ? AUTO_TIP : `Даалгаврын хугацаа: ${text}`}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm tabular-nums transition-colors sm:min-h-9 sm:gap-1.5 sm:px-2.5",
            rule.mode === "auto"
              ? "border-line bg-surface font-medium text-ink-dim hover:bg-ink/5 hover:text-ink"
              : "border-brand-bright/40 bg-brand-bright/10 font-semibold text-brand-soft hover:bg-brand-bright/20",
          )}
        >
          <Clock className="size-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap sm:hidden">{short}</span>
          <span className="hidden whitespace-nowrap sm:inline">{text}</span>
          {rule.mode === "custom" && recurring && <Repeat className="size-3 shrink-0" aria-hidden />}
        </button>
      }
    >
      <DeadlinePanel
        rule={rule}
        recurring={recurring}
        slot={slot}
        onSave={(r, rec) => {
          onSave(r, rec);
          setOpen(false);
        }}
      />
    </Popover>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-ink/[0.06] p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "cyrillic-tight min-h-11 rounded-md px-2 text-[13px] font-medium leading-tight transition-colors sm:min-h-8",
            value === o.value ? "bg-surface font-bold text-ink shadow-sm ring-1 ring-line" : "text-ink-dim hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RadioList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 text-left text-sm transition-colors sm:min-h-9",
              on ? "border-brand-bright bg-brand-bright/10 font-semibold text-ink" : "border-line text-ink-dim hover:bg-ink/5 hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", on ? "border-brand-bright" : "border-ink-dim/60")}
            >
              {on && <span className="size-2 rounded-full bg-brand-bright" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DeadlinePanel({
  rule,
  recurring: initialRecurring,
  slot,
  onSave,
}: {
  rule: DeadlineRule;
  recurring: boolean;
  slot: Slot;
  onSave: (rule: DeadlineRule, recurring: boolean) => void;
}) {
  const [mode, setMode] = useState<"auto" | "custom">(rule.mode);
  const [offset, setOffset] = useState<-1 | 0>(rule.mode === "custom" ? rule.offset : -1);
  const [time, setTime] = useState(rule.mode === "custom" ? rule.time : DEFAULT_DEADLINE);
  const [recurring, setRecurring] = useState(initialRecurring);

  return (
    <div>
      <RadioList
        label="Хугацааны төрөл"
        value={mode}
        onChange={setMode}
        options={[
          { value: "auto", label: "Автомат (хичээл эхлэхэд)" },
          { value: "custom", label: "Өөрөө тавих" },
        ]}
      />

      {mode === "auto" ? (
        <p className="mt-2.5 flex items-start gap-1.5 px-1 text-sm text-ink-dim">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <b className="font-bold tabular-nums text-ink">{slot.start}</b> хүртэл, {AUTO_TIP.toLowerCase()}
          </span>
        </p>
      ) : (
        <div className="mt-2.5 space-y-2">
          <Segmented
            label="Өдөр"
            value={offset}
            onChange={setOffset}
            options={[
              { value: -1, label: "Өмнөх өдөр" },
              { value: 0, label: "Тэр өдөр" },
            ]}
          />
          <label className="sr-only" htmlFor="deadline-time">
            Цаг
          </label>
          <input
            id="deadline-time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm tabular-nums text-ink sm:min-h-9"
          />
          <button
            type="button"
            role="switch"
            aria-checked={recurring}
            onClick={() => setRecurring((r) => !r)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left text-sm text-ink sm:min-h-9"
          >
            <span className="flex flex-col leading-tight">
              <span className="flex items-center gap-1.5 font-medium">
                <Repeat className="size-4 text-ink-dim" aria-hidden />
                Байнга энэ цагт
              </span>
              <span className="pl-[22px] text-xs text-ink-dim">Хичээлтэй өдөр бүр</span>
            </span>
            <span
              aria-hidden
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
                recurring ? "border-brand-bright bg-brand-bright" : "border-line bg-ink/10",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 size-3.5 rounded-full transition-transform",
                  recurring ? "translate-x-4 bg-on-brand" : "bg-ink-dim",
                )}
              />
            </span>
          </button>
        </div>
      )}

      <div className="mt-2.5 flex justify-end">
        <Button
          size="sm"
          disabled={mode === "custom" && !time}
          onClick={() => onSave(mode === "auto" ? { mode: "auto" } : { mode: "custom", offset, time }, mode === "custom" && recurring)}
          className="min-h-11 rounded-lg sm:min-h-9"
        >
          Хадгалах
        </Button>
      </div>
    </div>
  );
}
