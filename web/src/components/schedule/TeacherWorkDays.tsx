"use client";

import { LoadingState } from "@/components/ui/StateBlock";

import { useCallback, useMemo, useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, CircleAlert, TriangleAlert, UserCheck } from "lucide-react";
import { useAsyncSection } from "@/components/students/progress/useSection";
import { api } from "@/lib/api";
import InfoHint from "@/components/ui/InfoHint";
import RosterGrid from "./roster/RosterGrid";
import RosterSettings from "./roster/RosterSettings";
import { PARITY_LABEL, weekParityOf } from "./roster/parity";
import {
  addDaysToKey,
  todayUBKey,
  type TeacherLite,
  type TeacherRosterConfig,
  type TeacherWorkDaysResponse,
  type TeacherWorkExceptionRow,
} from "./types";
import { staffName, withPlus } from "@/lib/personName";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const outlineBtn =
  "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50";

// Seed-ээр сондгойгоос хуулсан, эзэн шалгаагүй тэгш 7 хоногийн мөр
const UNCHECKED_NOTE = "тэгш долоо хоног — эзэн шалгах";

function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = d.getUTCDay();
  return addDaysToKey(dateKey, weekday === 0 ? -6 : 1 - weekday);
}

function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}.${day}`;
}

type Parity = 0 | 1 | 2;
const DEFAULT_CONFIG: TeacherRosterConfig = { mode: "ALTERNATING", validFrom: null, validTo: null };

/**
 * Багшийн ажлын өдрийн хүснэгт — эзний Excel «багш × гараг» тор.
 *
 *  1. Горим: «Тогтмол» (7 хоног бүр ижил, parity 0) эсвэл «Сондгой / Тэгш»
 *     (ээлжит, parity 1/2; 1-р сондгой 7 хоног = 2026-08-31). Хүчинтэй хугацаа
 *     (жишээ нь оны эцэс хүртэл) — түүнээс гадуур хүснэгт хэрэгжихгүй.
 *  2. Нүд товшиход тухайн багшийн тэр ээлжийн БҮХ гарагийг PUT-оор солино.
 *  3. ОНЦГОЙ өдөр (TeacherWorkException) — ганц огноонд хүснэгтийг дарна.
 * Багш+ өдөр бүр хуваарь зохиодог тул schedule.manage-гүйгээр засна (эзэн 2026-10-11).
 * readOnly (энгийн Багш, эзэн 2026-10-22): ижил хүснэгтийг харна, засах товч/маягт гарахгүй.
 */
export default function TeacherWorkDays({ readOnly = false }: { readOnly?: boolean }) {
  const today = todayUBKey();
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [tabParity, setTabParity] = useState<1 | 2>(() => weekParityOf(today));

  const [exTeacherId, setExTeacherId] = useState("");
  const [exDate, setExDate] = useState(today);
  const [exWorking, setExWorking] = useState(false);
  const [exNote, setExNote] = useState("");
  const [exSaving, setExSaving] = useState(false);
  const [exError, setExError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDaysToKey(weekStart, 6), [weekStart]);

  const fetchWorkDays = useCallback(async () => {
    const [options, data] = await Promise.all([
      api<(TeacherLite & { displayName?: string })[]>("/schedule/teachers"),
      api<TeacherWorkDaysResponse>(`/schedule/teacher-workdays?from=${weekStart}&to=${weekEnd}`),
    ]);
    // key = `${teacherId}|${parity}` → гарагууд
    const cells = new Map<string, Set<number>>();
    const order = new Map<string, number>();
    const unchecked = new Set<string>();
    const names = new Map<string, string>();
    for (const row of data.workDays) {
      const key = `${row.teacherId}|${row.parity ?? 0}`;
      const days = cells.get(key) ?? new Set<number>();
      days.add(row.weekday);
      cells.set(key, days);
      const o = row.sortOrder ?? 0;
      if (!order.has(row.teacherId) || o < order.get(row.teacherId)!) order.set(row.teacherId, o);
      if (row.note === UNCHECKED_NOTE) unchecked.add(key);
      names.set(row.teacherId, withPlus(row.teacher.firstName, row.teacher.role));
    }
    for (const t of options) names.set(t.id, withPlus(t.displayName ?? t.firstName, t.role));
    // Хүснэгтийн мөрийн дараалал, дараа нь хүснэгтэд ороогүй багш нэрээр
    const ids = [...new Set([...options.map((t) => t.id), ...order.keys()])];
    const teachers = ids
      .map((id) => ({ id, name: names.get(id) ?? "—" }))
      .sort(
        (a, b) =>
          (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
          a.name.localeCompare(b.name, "mn"),
      );
    return {
      teachers,
      options,
      cells,
      unchecked,
      order,
      config: data.config ?? DEFAULT_CONFIG,
      exceptions: data.exceptions,
    };
  }, [weekStart, weekEnd]);
  const query = useAsyncSection(`${weekStart}:${weekEnd}`, fetchWorkDays, {
    teachers: [] as { id: string; name: string }[],
    options: [] as TeacherLite[],
    cells: new Map<string, Set<number>>(),
    unchecked: new Set<string>(),
    order: new Map<string, number>(),
    config: DEFAULT_CONFIG,
    exceptions: [] as TeacherWorkExceptionRow[],
  });
  const { teachers, cells, unchecked, order, config, exceptions } = query.data;
  const loading = query.status === "loading";
  const error = actionError || query.error;
  function load() {
    setActionError(null);
    query.reload();
  }

  const parity: Parity = config.mode === "FIXED" ? 0 : tabParity;
  const isOn = (teacherId: string, weekday: number) => cells.get(`${teacherId}|${parity}`)?.has(weekday) ?? false;
  const uncheckedCount = teachers.filter((t) => unchecked.has(`${t.id}|${parity}`)).length;

  async function toggle(teacherId: string, weekday: number) {
    if (readOnly) return;
    const key = `${teacherId}|${parity}`;
    const current = cells.get(key) ?? new Set<number>();
    const next = new Set(current);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);
    const wasUnchecked = unchecked.has(key);

    // Оптимист шинэчлэл — сүлжээ удаан байхад ч нүд шууд хариу өгнө.
    query.setData((prev) => {
      const u = new Set(prev.unchecked);
      u.delete(key);
      return { ...prev, cells: new Map(prev.cells).set(key, next), unchecked: u };
    });
    setPending(teacherId);
    setActionError(null);
    try {
      await api("/schedule/teacher-workdays", {
        method: "PUT",
        body: {
          teacherId,
          weekdays: [...next],
          parity,
          ...(order.has(teacherId) ? { sortOrder: order.get(teacherId) } : {}),
        },
      });
    } catch (e) {
      query.setData((prev) => {
        const u = new Set(prev.unchecked);
        if (wasUnchecked) u.add(key);
        return { ...prev, cells: new Map(prev.cells).set(key, current), unchecked: u };
      });
      setActionError(errMsg(e));
    } finally {
      setPending(null);
    }
  }

  async function addException() {
    if (readOnly) return;
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

  const todayMonday = mondayOf(today);
  const currentParity = weekParityOf(today);
  const outOfRange = (config.validFrom && today < config.validFrom) || (config.validTo && today > config.validTo);

  return (
    <section className="chunky p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-brand-soft" aria-hidden />
          <h2 className="font-bold text-brand-soft">Багшийн ажлын өдөр</h2>
          <InfoHint label="Ажлын өдрийн тухай">
            {readOnly
              ? "Багш бүрийн ажиллах гарагууд. «Сондгой / Тэгш» горимд 1-р (сондгой) долоо хоног 2026-08-31-нд эхэлж, ээлжилнэ. Нэг өдрийн өөрчлөлт доорх «Онцгой өдөр» хэсэгт харагдана."
              : "Нүд дээр товшиж багшийн ажлын өдрийг тогтооно. «Сондгой / Тэгш» горимд 1-р (сондгой) долоо хоног 2026-08-31-нд эхэлж, ээлжилнэ. Зөвхөн нэг өдрийн өөрчлөлтийг доорх «Онцгой өдөр» хэсгээр бүртгэнэ."}
          </InfoHint>
        </div>
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink">
          Энэ долоо хоног: {PARITY_LABEL[currentParity]}
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      {loading && <LoadingState rows={3} />}

      {!loading && (
        <div className="space-y-3">
          {!readOnly && (
            <RosterSettings
              key={`${config.mode}|${config.validFrom}|${config.validTo}`}
              config={config}
              onSaved={(c) => query.setData((prev) => ({ ...prev, config: c }))}
            />
          )}
          {outOfRange && !readOnly && (
            <p className="flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
              Хүснэгтийн хүчинтэй хугацаа өнөөдрийг хамрахгүй байна — хугацааг шинэчилнэ үү.
            </p>
          )}

          {config.mode === "ALTERNATING" && (
            <div role="tablist" aria-label="Долоо хоногийн ээлж" className="flex gap-1.5">
              {([1, 2] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={tabParity === p}
                  onClick={() => setTabParity(p)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
                    tabParity === p
                      ? "border-brand-bright bg-brand-bright text-on-brand"
                      : "border-line bg-panel text-ink hover:border-brand"
                  }`}
                >
                  {PARITY_LABEL[p]} долоо хоног
                  {p === currentParity && <span className="ml-1.5 font-normal opacity-80">(энэ долоо хоног)</span>}
                </button>
              ))}
            </div>
          )}

          {uncheckedCount > 0 && !readOnly && (
            <p className="flex items-start gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <b>Тэгш долоо хоногийг сондгойгоос түр хуулсан</b> ({uncheckedCount} багш) — эзний хүснэгтээр шалгаж
                засна уу. Багшийн мөрийг засахад тэмдэглэл арилна.
              </span>
            </p>
          )}

          {teachers.length > 0 ? (
            <RosterGrid
              teachers={teachers}
              isOn={isOn}
              isPending={(id) => pending === id}
              onToggle={toggle}
              readOnly={readOnly}
              caption={`Багшийн ажлын өдөр — ${PARITY_LABEL[parity]}`}
            />
          ) : (
            !error && <p className="text-sm text-ink-dim">Багшийн бүртгэл алга байна</p>
          )}
        </div>
      )}

      {/* ---- Онцгой өдөр ---- */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-brand-soft" aria-hidden />
            <h3 className="text-sm font-bold">Онцгой өдөр</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDaysToKey(w, -7))}
              aria-label="Өмнөх долоо хоног"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:border-brand"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(todayMonday)}
              disabled={weekStart === todayMonday}
              className={`${outlineBtn} min-h-11`}
            >
              {shortDate(weekStart)} — {shortDate(weekEnd)}
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDaysToKey(w, 7))}
              aria-label="Дараагийн долоо хоног"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:border-brand"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {!readOnly && (
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
                    {t.name}
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
        )}

        {exError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
            {exError}
          </div>
        )}

        {readOnly && exceptions.length === 0 && (
          <p className="text-sm text-ink-dim">Энэ долоо хоногт онцгой өдөр алга</p>
        )}

        {exceptions.length > 0 && (
          <ul className={readOnly ? "space-y-1.5" : "mt-4 space-y-1.5"}>
            {exceptions.map((x) => (
              <li
                key={x.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs"
              >
                <span className="font-mono">{x.date.slice(0, 10)}</span>
                <span className="font-semibold">
                  {staffName(x.teacher)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    x.working ? "bg-info/15 text-info" : "bg-warning/15 text-warning"
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
