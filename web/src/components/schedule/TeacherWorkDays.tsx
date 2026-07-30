"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import InfoHint from "@/components/ui/InfoHint";
import {
  addDaysToKey,
  todayUBKey,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  WORKWEEK_ORDER,
  type TeacherLite,
  type TeacherWorkDaysResponse,
  type TeacherWorkExceptionRow,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const outlineBtn =
  "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50";

function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = d.getUTCDay();
  return addDaysToKey(dateKey, weekday === 0 ? -6 : 1 - weekday);
}

function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}.${day}`;
}

/**
 * Багшийн ажлын өдрийн хуваарь — Excel дээрх "багш × гараг" тортой ижил.
 *
 * Хоёр давхарга:
 *  1. ТОГТМОЛ хэв маяг (TeacherWorkDay) — 7 хоног бүр давтагдана. Нүд дээр
 *     товшиход тухайн багшийн БҮХ гарагийн жагсаалтыг дахин илгээнэ
 *     (PUT нь бүхэлд нь солино), тул хэсэгчилсэн зөрүү үүсэхгүй.
 *  2. ОНЦГОЙ өдөр (TeacherWorkException) — зөвхөн тухайн НЭГ огноонд
 *     "ажиллана / ажиллахгүй" гэж тогтмол хэв маягийг дарж бичнэ.
 */
export default function TeacherWorkDays() {
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [workDays, setWorkDays] = useState<Map<string, Set<number>>>(new Map());
  const [exceptions, setExceptions] = useState<TeacherWorkExceptionRow[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayUBKey()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const [exTeacherId, setExTeacherId] = useState("");
  const [exDate, setExDate] = useState(todayUBKey());
  const [exWorking, setExWorking] = useState(false);
  const [exNote, setExNote] = useState("");
  const [exSaving, setExSaving] = useState(false);
  const [exError, setExError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDaysToKey(weekStart, 6), [weekStart]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api<TeacherLite[]>("/schedule/teachers"),
      api<TeacherWorkDaysResponse>(
        `/schedule/teacher-workdays?from=${weekStart}&to=${weekEnd}`,
      ),
    ])
      .then(([teacherRows, data]) => {
        setTeachers(teacherRows);
        const map = new Map<string, Set<number>>();
        for (const row of data.workDays) {
          const set = map.get(row.teacherId) ?? new Set<number>();
          set.add(row.weekday);
          map.set(row.teacherId, set);
        }
        setWorkDays(map);
        setExceptions(data.exceptions);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [weekStart, weekEnd]);
  useEffect(load, [load]);

  async function toggle(teacherId: string, weekday: number) {
    const current = workDays.get(teacherId) ?? new Set<number>();
    const next = new Set(current);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);

    // Оптимист шинэчлэл — сүлжээ удаан байхад ч нүд шууд хариу өгнө.
    setWorkDays((prev) => new Map(prev).set(teacherId, next));
    setPending(`${teacherId}:${weekday}`);
    setError(null);
    try {
      await api("/schedule/teacher-workdays", {
        method: "PUT",
        body: { teacherId, weekdays: [...next] },
      });
    } catch (e) {
      setWorkDays((prev) => new Map(prev).set(teacherId, current));
      setError(errMsg(e));
    } finally {
      setPending(null);
    }
  }

  async function addException() {
    if (!exTeacherId) {
      setExError("Багш сонгоно уу");
      return;
    }
    setExSaving(true);
    setExError(null);
    try {
      await api("/schedule/teacher-workdays/exception", {
        method: "POST",
        body: {
          teacherId: exTeacherId,
          date: exDate,
          working: exWorking,
          ...(exNote.trim() ? { note: exNote.trim() } : {}),
        },
      });
      setExNote("");
      load();
    } catch (e) {
      setExError(errMsg(e));
    } finally {
      setExSaving(false);
    }
  }

  const todayMonday = mondayOf(todayUBKey());
  const weekDates = WORKWEEK_ORDER.map((weekday, i) => ({
    weekday,
    date: addDaysToKey(weekStart, i),
  }));

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-brand-soft" aria-hidden />
          <h2 className="font-bold text-brand-soft">Багшийн ажлын өдөр</h2>
          <InfoHint label="Ажлын өдрийн тухай">
            Нүд дээр товшиж багшийн 7 хоног бүр давтагддаг ажлын өдрийг
            тогтооно. Зөвхөн нэг өдрийн өөрчлөлтийг доорх &laquo;Онцгой
            өдөр&raquo; хэсгээр бүртгэнэ.
          </InfoHint>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDaysToKey(w, -7))}
            aria-label="Өмнөх долоо хоног"
            className="rounded-lg border border-line p-1.5 transition hover:border-brand"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(todayMonday)}
            disabled={weekStart === todayMonday}
            className={outlineBtn}
          >
            Энэ долоо хоног
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDaysToKey(w, 7))}
            aria-label="Дараагийн долоо хоног"
            className="rounded-lg border border-line p-1.5 transition hover:border-brand"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}

      {!loading && teachers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-line px-2 py-2 text-left text-xs font-semibold text-ink-dim">
                  Багш
                </th>
                {weekDates.map(({ weekday, date }) => (
                  <th
                    key={weekday}
                    className="border-b border-line px-1 py-2 text-center text-xs font-semibold text-ink-dim"
                  >
                    <span className="block">{WEEKDAY_SHORT[weekday]}</span>
                    <span className="block font-normal">{shortDate(date)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => {
                const set = workDays.get(teacher.id) ?? new Set<number>();
                return (
                  <tr key={teacher.id} className="border-b border-line/60">
                    <td className="px-2 py-1.5 font-semibold">
                      {teacher.lastName} {teacher.firstName}
                    </td>
                    {weekDates.map(({ weekday, date }) => {
                      const on = set.has(weekday);
                      const exception = exceptions.find(
                        (x) =>
                          x.teacherId === teacher.id && x.date.slice(0, 10) === date,
                      );
                      const busy = pending === `${teacher.id}:${weekday}`;
                      return (
                        <td key={weekday} className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`${teacher.lastName} ${teacher.firstName} — ${WEEKDAY_LABELS[weekday]}`}
                            disabled={busy}
                            onClick={() => toggle(teacher.id, weekday)}
                            className={`relative inline-flex h-8 w-full min-w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
                              on
                                ? "border-success/40 bg-success/15 text-success"
                                : "border-line bg-surface text-ink-dim hover:border-brand"
                            }`}
                          >
                            {on && <Check className="h-4 w-4" aria-hidden />}
                            {exception && (
                              <span
                                className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${
                                  exception.working ? "bg-info" : "bg-warning"
                                }`}
                                aria-hidden
                              />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && teachers.length === 0 && !error && (
        <p className="text-sm text-ink-dim">Багшийн бүртгэл алга байна</p>
      )}

      {/* ---- Онцгой өдөр ---- */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-brand-soft" aria-hidden />
          <h3 className="text-sm font-bold">Онцгой өдөр</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="twd-teacher" className="text-xs text-ink-dim">
              Багш
            </label>
            <select
              id="twd-teacher"
              value={exTeacherId}
              onChange={(e) => setExTeacherId(e.target.value)}
              className={inputCls}
            >
              <option value="">— сонгох —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="twd-date" className="text-xs text-ink-dim">
              Огноо
            </label>
            <input
              id="twd-date"
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-dim">Тухайн өдөр</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-pressed={exWorking}
                onClick={() => setExWorking(true)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  exWorking
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-line text-ink-dim hover:border-brand"
                }`}
              >
                Ажиллана
              </button>
              <button
                type="button"
                aria-pressed={!exWorking}
                onClick={() => setExWorking(false)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  !exWorking
                    ? "border-warning/40 bg-warning/15 text-warning"
                    : "border-line text-ink-dim hover:border-brand"
                }`}
              >
                Ажиллахгүй
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="twd-note" className="text-xs text-ink-dim">
              Тэмдэглэл
            </label>
            <input
              id="twd-note"
              value={exNote}
              onChange={(e) => setExNote(e.target.value)}
              placeholder="Чөлөө"
              className={inputCls}
            />
          </div>
          <div className="flex items-end">
            <button onClick={addException} disabled={exSaving} className={outlineBtn}>
              {exSaving ? "Хадгалж байна…" : "Бүртгэх"}
            </button>
          </div>
        </div>

        {exError && (
          <p className="mt-2 flex items-center gap-2 text-sm text-error">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {exError}
          </p>
        )}

        {exceptions.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {exceptions.map((x) => (
              <li
                key={x.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs"
              >
                <span className="font-mono">{x.date.slice(0, 10)}</span>
                <span className="font-semibold">
                  {x.teacher.lastName} {x.teacher.firstName}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    x.working
                      ? "bg-info/15 text-info"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {x.working ? "Ажиллана" : "Ажиллахгүй"}
                </span>
                {x.note && <span className="text-ink-dim">{x.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
