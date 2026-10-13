"use client";

import { useState } from "react";
import { ChevronDown, TriangleAlert, Users, X } from "lucide-react";
import type { TeacherRosterDay } from "../types";
import { PARITY_LABEL } from "./parity";

export interface RosterChip {
  id: string;
  name: string;
  /** Багш+ (эсвэл админ) эсэх — өнгөөр БА «+» тэмдгээр ялгана; null = тодорхойгүй */
  plus: boolean | null;
  lead: number;
  assistant: number;
}

/** Багш+ = ягаан-нил, Багш = ногоон-цэнхэр зөөлөн дэвсгэр (зөвхөн дэвсгэр, текст ink). */
const tint = (plus: boolean | null) =>
  plus === null
    ? "bg-bg border-line"
    : plus
      ? "bg-accent-violet/15 border-accent-violet/40"
      : "bg-accent-teal/15 border-accent-teal/40";

/**
 * «Энэ өдөр ажиллах багш» — өдрийн хуваарийн баруун багана (гар утсанд
 * жагсаалтын дээр эвхэгддэг тууз). Хүснэгтийн дарааллаар; багш бүр тухайн
 * өдөр хэдэн хичээлд оноогдсоныг харуулж, хэн оноогдоогүйг шууд харагдуулна.
 * Чип дээр дарж «сонгосон» болгоод хоосон Ахлах/Туслах нүдэнд нэг товшилтоор оноож болно.
 */
export default function DayRosterPanel({
  rosterDay,
  chips,
  extra,
  armedId,
  onArm,
}: {
  rosterDay: TeacherRosterDay | null;
  chips: RosterChip[];
  /** Хүснэгтэд ороогүй ч энэ өдөр оноогдсон багш */
  extra: RosterChip[];
  armedId: string | null;
  /** null бол чип сонгох боломжгүй (энгийн багш — зөвхөн харна) */
  onArm: ((id: string | null) => void) | null;
}) {
  const [open, setOpen] = useState(false);
  const unplaced = chips.filter((c) => c.lead + c.assistant === 0).length;
  const weekLabel =
    rosterDay?.mode === "FIXED"
      ? "Тогтмол хүснэгт"
      : rosterDay?.parity
        ? `${PARITY_LABEL[rosterDay.parity]} долоо хоног`
        : null;
  const armed = chips.find((c) => c.id === armedId) ?? extra.find((c) => c.id === armedId) ?? null;

  return (
    <aside aria-labelledby="day-roster-title" className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="day-roster-body"
        className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left xl:pointer-events-none xl:cursor-default"
      >
        <Users className="h-4 w-4 shrink-0 text-brand-soft" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span id="day-roster-title" className="whitespace-nowrap text-sm font-bold text-ink">
            Энэ өдөр ажиллах багш
          </span>
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink">
            {chips.length}
          </span>
          {unplaced > 0 && (
            <span className="whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
              Оноогоогүй {unplaced}
            </span>
          )}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 transition xl:hidden ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div id="day-roster-body" className={`${open ? "" : "hidden"} space-y-2.5 px-3 pb-3 xl:block`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-dim">
          {weekLabel && <span className="font-semibold text-ink">{weekLabel}</span>}
          <span className="inline-flex items-center gap-1">
            <span className={`h-3 w-3 rounded-sm border ${tint(true)}`} aria-hidden />
            Багш+
          </span>
          <span className="inline-flex items-center gap-1">
            <span className={`h-3 w-3 rounded-sm border ${tint(false)}`} aria-hidden />
            Багш
          </span>
        </div>

        {rosterDay && rosterDay.inRange === false && (
          <p className="flex items-start gap-1.5 rounded-lg bg-warning/15 px-2 py-1.5 text-xs font-semibold text-warning">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Ажлын хүснэгтийн хугацаа энэ өдрийг хамрахгүй
          </p>
        )}

        {armed && onArm && (
          <p className="flex items-center gap-1.5 rounded-lg bg-info/10 px-2 py-1 text-xs text-info">
            <span className="min-w-0 flex-1">
              <b>{armed.name}</b> — хоосон нүдэнд дарж оноо
            </span>
            <button
              type="button"
              onClick={() => onArm(null)}
              aria-label="Сонголт цуцлах"
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md hover:bg-info/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </p>
        )}

        {chips.length === 0 ? (
          <p className="text-xs text-ink-dim">Энэ өдөр ажлын хүснэгтэд багш алга.</p>
        ) : (
          <ChipList chips={chips} armedId={armedId} onArm={onArm} />
        )}

        {extra.length > 0 && (
          <div className="space-y-1.5 border-t border-line pt-2">
            <p className="text-xs font-semibold text-ink-dim">Хүснэгтэд ороогүй ч оноогдсон</p>
            <ChipList chips={extra} armedId={armedId} onArm={onArm} />
          </div>
        )}
      </div>
    </aside>
  );
}

function ChipList({
  chips,
  armedId,
  onArm,
}: {
  chips: RosterChip[];
  armedId: string | null;
  onArm: ((id: string | null) => void) | null;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5 xl:flex-col xl:flex-nowrap">
      {chips.map((c) => {
        const total = c.lead + c.assistant;
        const role = c.plus === null ? "" : c.plus ? " (Багш+)" : " (Багш)";
        const label = `${c.name}${role} — ахлах ${c.lead}, туслах ${c.assistant}`;
        const body = (
          <>
            <span className="min-w-0 truncate font-semibold text-ink">{c.name}</span>
            {c.plus && (
              <span className="text-xs font-bold text-ink" aria-hidden>
                +
              </span>
            )}
            <span
              className={`ml-auto rounded-full px-1.5 text-xs font-bold tabular-nums ${
                total === 0 ? "bg-warning/20 text-warning" : "bg-bg text-ink"
              }`}
              aria-hidden
            >
              {total}
            </span>
          </>
        );
        const cls = `flex min-h-9 w-full items-center gap-1.5 rounded-lg border px-2 text-sm ${tint(c.plus)} ${
          total === 0 ? "border-dashed" : ""
        }`;
        return (
          <li key={c.id} className="xl:w-full">
            {onArm ? (
              <button
                type="button"
                aria-pressed={armedId === c.id}
                aria-label={label}
                title={label}
                onClick={() => onArm(armedId === c.id ? null : c.id)}
                className={`${cls} min-h-11 transition hover:border-brand ${
                  armedId === c.id ? "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface" : ""
                }`}
              >
                {body}
              </button>
            ) : (
              <span className={cls} title={label}>
                <span className="sr-only">{label}</span>
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
