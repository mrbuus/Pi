"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { getClassroomColor } from "@/lib/classroomColor";
import EntryActionPanel from "./EntryActionPanel";
import RoomShape from "./RoomShape";
import {
  addDaysToKey,
  formatMinutes,
  roomOrderOf,
  todayUBKey,
  WEEKDAY_SHORT,
  type ScheduleEntry,
  type WeekEntry,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * БҮТЭН ЖИЛИЙН давтагдах хуваарийн "зурагт хуудас" — эзний загвар:
 *
 *   Мөр (босоо 2 бүс):  Баруун 4 · Зүүн 4
 *   Багана (давтамж):   Да·Лх·Ба (1,3,5) · Мя·Пү (2,4) · Бямба · Ням
 *   Багана доторх бүлэг: цагийн бүс (ажлын өдөр 2, Бямба 3 бүс аяндаа гарна)
 *   Бүлэг доторх эрэмбэ: танхим ТОГТМОЛ дараалалтай (501,502,503,504,403,404,405)
 *
 * Долоо хоногийн 7 багана биш ийм бүтэц сонгосон шалтгаан: хуваарь нь өдөр
 * бүр өөр биш, ДАВТАМЖААР ижил (1,3,5-д яг ижил, 2,4-т яг ижил). Ижил
 * зүйлийг гурав давтахын оронд нэг удаа харуулбал бүтэн жилийн дүр зураг
 * нэг дэлгэцэд багтана.
 *
 * Хэн харах: бүх багш, админ. Хэн засах: Багш+/Админ (мөр товшиход самбар).
 */

const COLUMNS: readonly { key: string; title: string; days: readonly number[] }[] = [
  { key: "odd", title: "Даваа — Лхагва — Баасан", days: [1, 3, 5] },
  { key: "even", title: "Мягмар — Пүрэв", days: [2, 4] },
  { key: "sat", title: "Бямба", days: [6] },
  { key: "sun", title: "Ням", days: [0] },
];

const BRANCHES = ["Баруун 4", "Зүүн 4"] as const;

/** "12-1 (Баруун 4)" → { label: "12-1", branch: "Баруун 4" } */
function splitName(full: string): { label: string; branch: string | null } {
  const m = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { label: m[1], branch: m[2] } : { label: full, branch: null };
}

/** Давтамжийн бүлэг: нэг анги, нэг цаг, нэг танхим — хэд хэдэн гарагт */
interface PatternGroup {
  key: string;
  classroomId: string;
  classLabel: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  days: number[];
  /** Гараг бүрийн эх мөр — самбар нээхэд аль нэгийг нь ашиглана */
  members: Map<number, ScheduleEntry>;
}

function synthWeekEntry(row: ScheduleEntry): WeekEntry {
  return {
    scheduleId: row.id,
    classroomId: row.classroomId,
    classroomName: row.classroom.name,
    teacherId: row.teacherId,
    teacherName: row.teacher
      ? `${row.teacher.lastName} ${row.teacher.firstName}`
      : null,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    room: row.room,
    subject: row.subject,
    topic: null,
    exception: null,
  };
}

/** Өнөөдрөөс хойших хамгийн ойрын тухайн гарагийн огноо */
function nextDateFor(weekday: number): string {
  const today = todayUBKey();
  for (let i = 0; i < 7; i += 1) {
    const d = addDaysToKey(today, i);
    if (new Date(`${d}T00:00:00.000Z`).getUTCDay() === weekday) return d;
  }
  return today;
}

export default function PatternOverview({ readOnly = false }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    entry: WeekEntry;
    date: string;
    dayEntries: WeekEntry[];
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<ScheduleEntry[]>("/schedule")
      .then(setRows)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  // Хугацаа нь дууссан (effectiveTo өнгөрсөн) мөрийг зурагт хуудаснаас нуана —
  // энэ бол "одоо мөрдөгдөж буй" хуваарийн харагдац.
  const active = useMemo(() => {
    const today = todayUBKey();
    return rows.filter((r) => !r.effectiveTo || r.effectiveTo.slice(0, 10) >= today);
  }, [rows]);

  /** branch → column.key → PatternGroup[] (аль хэдийн эрэмбэлэгдсэн) */
  const grid = useMemo(() => {
    const out = new Map<string, Map<string, PatternGroup[]>>();
    for (const branch of BRANCHES) {
      const cols = new Map<string, PatternGroup[]>();
      for (const col of COLUMNS) {
        const groups = new Map<string, PatternGroup>();
        for (const row of active) {
          if (!col.days.includes(row.weekday)) continue;
          const { label, branch: rowBranch } = splitName(row.classroom.name);
          if (rowBranch !== branch) continue;
          const key = `${row.classroomId}|${row.startMinute}|${row.endMinute}|${row.room ?? ""}|${row.teacherId ?? ""}`;
          const g = groups.get(key);
          if (g) {
            g.days.push(row.weekday);
            g.members.set(row.weekday, row);
          } else {
            groups.set(key, {
              key,
              classroomId: row.classroomId,
              classLabel: label,
              startMinute: row.startMinute,
              endMinute: row.endMinute,
              room: row.room,
              days: [row.weekday],
              members: new Map([[row.weekday, row]]),
            });
          }
        }
        const sorted = [...groups.values()].sort(
          (a, b) =>
            a.startMinute - b.startMinute ||
            roomOrderOf(a.room) - roomOrderOf(b.room) ||
            a.classLabel.localeCompare(b.classLabel),
        );
        cols.set(col.key, sorted);
      }
      out.set(branch, cols);
    }
    return out;
  }, [active]);

  function openGroup(group: PatternGroup, columnDays: readonly number[]) {
    if (readOnly) return;
    // Бүлгийн гаргуудаас хамгийн ойрын ирэх өдрийг сонгоно
    const soonest = [...group.members.keys()]
      .map((wd) => ({ wd, date: nextDateFor(wd) }))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const row = group.members.get(soonest.wd);
    if (!row) return;
    const dayEntries = active
      .filter((r) => r.weekday === soonest.wd)
      .map(synthWeekEntry);
    setSelected({ entry: synthWeekEntry(row), date: soonest.date, dayEntries });
    void columnDays;
  }

  if (loading) {
    return <LoadingState rows={6} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-5">
      {BRANCHES.map((branch) => {
        const cols = grid.get(branch);
        const empty = COLUMNS.every((c) => (cols?.get(c.key) ?? []).length === 0);
        if (empty) return null;
        return (
          <section key={branch}>
            {/* Бүсийн толгой — хоёр бүсийг нэг харцаар ялгах босоо бүтэц */}
            <div className="mb-2 flex items-center gap-2.5">
              <h3 className="text-sm font-extrabold tracking-wide">{branch}</h3>
              <div className="h-px flex-1 bg-line" aria-hidden />
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {COLUMNS.map((col) => {
                const groups = cols?.get(col.key) ?? [];
                return (
                  <div
                    key={col.key}
                    className="rounded-2xl border border-line bg-panel p-3"
                  >
                    <p className="px-1 pb-1 text-xs font-bold text-ink-dim">
                      {col.title}
                    </p>
                    {groups.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-ink-dim">—</p>
                    ) : (
                      groups.map((g, i) => {
                        const prev = groups[i - 1];
                        const newBand = !prev || prev.startMinute !== g.startMinute;
                        const color = getClassroomColor(g.classroomId);
                        const partial = g.days.length < col.days.length;
                        const RowTag = readOnly ? "div" : "button";
                        return (
                          <div key={g.key}>
                            {/* Цагийн бүсийн толгой — ажлын багана 2, Бямба 3
                                бүсэд аяндаа хуваагдана (эзний загвар) */}
                            {newBand && (
                              <p
                                className={`flex items-center gap-2 px-1 pb-1 ${i === 0 ? "pt-1" : "pt-3"}`}
                              >
                                <span className="font-mono text-[11px] font-bold text-brand-soft">
                                  {formatMinutes(g.startMinute)}–{formatMinutes(g.endMinute)}
                                </span>
                                <span className="h-px flex-1 bg-line/70" aria-hidden />
                              </p>
                            )}
                            {/* Ангийн өнгө = ЗҮҮН ЗУРВАС + (hover үед) зөөлөн
                                дэвсгэр. Текст болон дүрс дээр өнгө ОРОХГҮЙ —
                                эзний дүрэм, мөн ангийн палитр текстэд
                                хангалтгүй контрасттай (globals.css .class-row
                                тайлбар харна уу).
                                rounded-r-lg: зүүн талыг мурийлгавал зурвас
                                тасарч харагдана. */}
                            <RowTag
                              {...(readOnly
                                ? {}
                                : { type: "button" as const, onClick: () => openGroup(g, col.days) })}
                              style={{ "--cls": color } as React.CSSProperties}
                              className={`class-row flex w-full items-center gap-2 rounded-r-lg py-1 pr-1.5 pl-2 text-left ${
                                readOnly ? "" : "class-row-interactive"
                              }`}
                            >
                              <span className="flex w-13 shrink-0 items-center gap-1.5 text-ink">
                                <RoomShape room={g.room} size={16} />
                                <span className="font-mono text-xs text-ink-dim">
                                  {g.room ?? "—"}
                                </span>
                              </span>
                              <span className="truncate text-sm font-semibold text-ink">
                                {g.classLabel}
                              </span>
                              {partial && (
                                <span className="ml-auto flex gap-0.5">
                                  {g.days.map((d) => (
                                    <span
                                      key={d}
                                      className="rounded bg-bg px-1 text-[10px] font-semibold text-ink-dim"
                                    >
                                      {WEEKDAY_SHORT[d]}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </RowTag>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {!readOnly && (
        <EntryActionPanel
          open={selected !== null}
          entry={selected?.entry ?? null}
          date={selected?.date ?? ""}
          dayEntries={selected?.dayEntries ?? []}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
