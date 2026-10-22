"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { WEEKDAY_LABELS, WEEKDAY_SHORT, WORKWEEK_ORDER } from "../types";

export interface RosterGridTeacher {
  id: string;
  name: string;
}

/**
 * Багш × 7 гарагийн нягт тор (эзний Excel хүснэгт шиг). Нүд дарахад тухайн
 * багшийн тэр гарагийг асаана/унтраана.
 * Гар утсанд (375px) 7 багана багтахгүй тул НЭГ ӨДРИЙГ сонгож, багш бүрийн
 * ганц товчийг харуулна.
 * readOnly (энгийн Багш): нүд товч биш, зөвхөн харуулна.
 */
export default function RosterGrid({
  teachers,
  isOn,
  isPending,
  onToggle,
  caption,
  readOnly = false,
}: {
  teachers: RosterGridTeacher[];
  isOn: (teacherId: string, weekday: number) => boolean;
  isPending: (teacherId: string) => boolean;
  onToggle: (teacherId: string, weekday: number) => void;
  caption: string;
  readOnly?: boolean;
}) {
  const [mobileDay, setMobileDay] = useState<number>(1);
  const totals = WORKWEEK_ORDER.map((w) => teachers.filter((t) => isOn(t.id, w)).length);

  return (
    <>
      {/* Том дэлгэц — бүтэн тор */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-line px-2 py-2 text-left text-xs font-semibold text-ink-dim">
                Багш
              </th>
              {WORKWEEK_ORDER.map((w) => (
                <th
                  key={w}
                  scope="col"
                  className="w-12 border-b border-line px-0.5 py-2 text-center text-xs font-semibold text-ink-dim"
                >
                  <abbr title={WEEKDAY_LABELS[w]} className="no-underline">
                    {WEEKDAY_SHORT[w]}
                  </abbr>
                </th>
              ))}
              <th
                scope="col"
                className="w-10 border-b border-line px-1 py-2 text-center text-xs font-semibold text-ink-dim"
              >
                Нийт
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => {
              const busy = isPending(t.id);
              const count = WORKWEEK_ORDER.filter((w) => isOn(t.id, w)).length;
              return (
                <tr key={t.id} className="border-b border-line/60">
                  <th scope="row" className="truncate px-2 py-0.5 text-left font-semibold text-ink">
                    {t.name}
                  </th>
                  {WORKWEEK_ORDER.map((w) => {
                    const on = isOn(t.id, w);
                    return (
                      <td key={w} className="px-0.5 py-0.5 text-center">
                        {readOnly ? (
                          <span
                            role="img"
                            aria-label={`${t.name} — ${WEEKDAY_LABELS[w]}: ${on ? "ажиллана" : "ажиллахгүй"}`}
                            className={`inline-flex h-11 w-full min-w-11 items-center justify-center rounded-md border ${
                              on ? "border-success/40 bg-success/15 text-success" : "border-line/70 bg-surface text-ink-dim"
                            }`}
                          >
                            {on && <Check className="h-4 w-4" aria-hidden />}
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`${t.name} — ${WEEKDAY_LABELS[w]}`}
                            disabled={busy}
                            onClick={() => onToggle(t.id, w)}
                            className={`inline-flex h-11 w-full min-w-11 items-center justify-center rounded-md border transition disabled:opacity-50 ${
                              on
                                ? "border-success/40 bg-success/15 text-success"
                                : "border-line/70 bg-surface text-ink-dim hover:border-brand"
                            }`}
                          >
                            {on && <Check className="h-4 w-4" aria-hidden />}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 text-center text-xs tabular-nums text-ink-dim">{count}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="px-2 py-2 text-left text-xs font-semibold text-ink-dim">
                Өдрийн нийт
              </th>
              {totals.map((n, i) => (
                <td key={WORKWEEK_ORDER[i]} className="py-2 text-center text-xs font-bold tabular-nums text-ink">
                  {n}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Гар утас — нэг өдөр */}
      <div className="sm:hidden">
        <div role="tablist" aria-label="Гараг" className="mb-2 grid grid-cols-7 gap-1">
          {WORKWEEK_ORDER.map((w, i) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={mobileDay === w}
              aria-label={WEEKDAY_LABELS[w]}
              onClick={() => setMobileDay(w)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition ${
                mobileDay === w ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-panel text-ink"
              }`}
            >
              {WEEKDAY_SHORT[w]}
              <span className="text-[10px] font-normal tabular-nums opacity-80">{totals[i]}</span>
            </button>
          ))}
        </div>
        <ul className="divide-y divide-line/60 rounded-xl border border-line">
          {teachers.map((t) => {
            const on = isOn(t.id, mobileDay);
            const row = (
              <>
                <span className="font-semibold text-ink">{t.name}</span>
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${
                    on ? "border-success/40 bg-success/15 text-success" : "border-line bg-surface"
                  }`}
                >
                  {on && <Check className="h-4 w-4" aria-hidden />}
                  <span className="sr-only">{on ? "Ажиллана" : "Ажиллахгүй"}</span>
                </span>
              </>
            );
            return (
              <li key={t.id}>
                {readOnly ? (
                  <div className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm">{row}</div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={isPending(t.id)}
                    onClick={() => onToggle(t.id, mobileDay)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm disabled:opacity-50"
                  >
                    {row}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
