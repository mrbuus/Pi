"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Palmtree } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useSection } from "@/components/students/progress/useSection";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import InfoHint from "@/components/ui/InfoHint";
import ClassroomLessonHistory from "@/components/lesson-records/ClassroomLessonHistory";
import PublishDayButton from "./PublishDayButton";
import EntryActionPanel from "./EntryActionPanel";
import RoomBadge from "./RoomBadge";
import { addDaysToKey, formatMinutes, roomOrderOf, todayUBKey, WEEKDAY_LABELS, WEEKDAY_SHORT, type WeekEntry } from "./types";
import LessonRow, { type TeacherOption } from "./day/LessonRow";
import PlanDialog from "./day/PlanDialog";
import ConfirmDialog from "./day/ConfirmDialog";
import DayTeachers, { type TeacherLoad } from "./day/DayTeachers";
import ExportImage from "./day/ExportImage";
import { Excluded } from "./day/RoadMap";
import { branchOf, type DayEntry, type DayPlanResponse } from "./day/types";

/**
 * ӨДРИЙН ХУВААРЬ (эзэн 2026-10-08, дахин бүтээсэн 2026-10-18).
 *
 * Эзний өдрийн Excel: мөр бүр = цаг, танхим, анги, тест (өмнөх → өнөөдөр),
 * ахлах, туслах. Багш+ маргаашийн төлөвлөгөөг өмнөх орой тавьдаг тул анхдагч
 * нь үдээс хойш маргааш. Мөр дээр дарахад төлөвлөгөөний цонх (Багш — зөвхөн
 * харна). Танхим/цаг/зөөх/цуцлах нь «⋯» дотор (EntryActionPanel).
 *
 * Өгөгдөл: GET /schedule/day-plan?date= — нэг дуудлага.
 */

function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

/** Үдээс хойш маргаашийн хуваарь хамгийн их хэрэгтэй — тиймээс анхдагч нь маргааш. */
function defaultDay(): string {
  const today = todayUBKey();
  const hourUB = (new Date().getUTCHours() + 8) % 24;
  return hourUB >= 12 ? addDaysToKey(today, 1) : today;
}

const BRANCHES = ["Баруун 4", "Зүүн 4", "Бусад"] as const;

export default function WeekBuilder() {
  const [today] = useState(todayUBKey);
  const [day, setDay] = useState(defaultDay);
  const [planOf, setPlanOf] = useState<string | null>(null);
  const [confirmOf, setConfirmOf] = useState<string | null>(null);
  const [moreOf, setMoreOf] = useState<string | null>(null);
  const [historyOf, setHistoryOf] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);

  useEffect(() => {
    if (!armedId) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setArmedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armedId]);

  const { data, status, error, reload, setData } = useSection<DayPlanResponse | null>(
    `/schedule/day-plan?date=${day}`,
    null,
  );
  const canPlan = !!data?.viewer.canPlan;
  const canConfirm = !!data?.viewer.canConfirm;
  const { data: teacherRows } = useSection<{ id: string; displayName?: string; firstName: string; role?: string }[]>(
    canPlan ? "/schedule/teachers" : null,
    [],
  );
  const rosterTeachers = useMemo(() => data?.roster?.teachers ?? [], [data]);
  const working = useMemo(() => new Set(rosterTeachers.map((t) => t.id)), [rosterTeachers]);
  const isPlus = (role?: string | null) => role === "TEACHER_PLUS" || role === "ADMIN";
  // Сонголт: хуваарьт ордог багш + ажлын хүснэгтэд байгаа бүх багш
  const teachers: TeacherOption[] = useMemo(() => {
    const map = new Map<string, TeacherOption>();
    for (const t of teacherRows) map.set(t.id, { id: t.id, name: t.displayName ?? t.firstName, plus: isPlus(t.role) });
    for (const t of rosterTeachers) if (!map.has(t.id)) map.set(t.id, { id: t.id, name: t.name, plus: isPlus(t.role) });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "mn"));
  }, [teacherRows, rosterTeachers]);
  const rosterOrder = useMemo(() => new Map(rosterTeachers.map((t, i) => [t.id, i])), [rosterTeachers]);
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const tests = data?.tests ?? {};

  // Нэг багш ДАВХАР цагт хоёр ангид — анхааруулга
  const clashes = useMemo(() => {
    const list = entries.flatMap((e) =>
      [e.leadTeacher?.id, e.assistantTeacher?.id]
        .filter((id): id is string => !!id)
        .map((id) => ({ id, start: e.startMinute, end: e.endMinute, sid: e.scheduleId })),
    );
    const out = new Set<string>();
    for (const a of list)
      for (const b of list)
        if (a !== b && a.id === b.id && a.sid !== b.sid && a.start < b.end && b.start < a.end) out.add(`${a.sid}|${a.id}`);
    return out;
  }, [entries]);

  // «Ажиллах багш нар» = ЗӨВХӨН «Багшийн ажлын өдөр» хүснэгт (тухайн огноо); хүснэгтэд
  // ороогүй ч оноогдсон багш тусдаа
  const { loads, extraLoads } = useMemo(() => {
    const count = new Map<string, { lead: number; assistant: number; clash: boolean; name: string; role: string | null }>();
    for (const e of entries)
      for (const [who, slot] of [
        [e.leadTeacher, "lead"],
        [e.assistantTeacher, "assistant"],
      ] as const) {
        if (!who) continue;
        const c = count.get(who.id) ?? { lead: 0, assistant: 0, clash: false, name: who.name, role: who.role };
        c[slot] += 1;
        if (clashes.has(`${e.scheduleId}|${who.id}`)) c.clash = true;
        count.set(who.id, c);
      }
    const load = (id: string, name: string, role: string | null | undefined): TeacherLoad => {
      const c = count.get(id);
      return { id, name, plus: isPlus(role), lead: c?.lead ?? 0, assistant: c?.assistant ?? 0, clash: c?.clash ?? false };
    };
    return {
      loads: rosterTeachers.map((t) => load(t.id, t.name, t.role)),
      extraLoads: [...count.entries()].filter(([id]) => !working.has(id)).map(([id, c]) => load(id, c.name, c.role)),
    };
  }, [entries, clashes, rosterTeachers, working]);
  const armedName = armedId
    ? ([...loads, ...extraLoads].find((l) => l.id === armedId)?.name ?? teachers.find((t) => t.id === armedId)?.name ?? null)
    : null;

  const sections = useMemo(
    () =>
      BRANCHES.map((branch) => ({
        branch,
        rows: entries
          .filter((e) => branchOf(e.classroomName) === branch)
          .sort((a, b) => a.startMinute - b.startMinute || roomOrderOf(a.room) - roomOrderOf(b.room)),
      }))
        .filter((s) => s.rows.length)
        .map((s) => {
          // Яг ижил цагт эхлэх хичээлүүд НЭГ блок (эзэн 2026-10-18); блокийн
          // дуусах цаг = хамгийн олон давтагдсан нь, ялгаатай мөр жижгээр харуулна
          const blocks: { start: number; end: number; rows: DayEntry[] }[] = [];
          for (const e of s.rows) {
            const last = blocks.at(-1);
            if (last?.start === e.startMinute) last.rows.push(e);
            else blocks.push({ start: e.startMinute, end: e.endMinute, rows: [e] });
          }
          for (const b of blocks) {
            const count = new Map<number, number>();
            for (const e of b.rows) count.set(e.endMinute, (count.get(e.endMinute) ?? 0) + 1);
            b.end = [...count.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0];
          }
          return { ...s, blocks };
        }),
    [entries],
  );

  async function saveStaff(e: DayEntry, lead: string, assistant: string) {
    setSaving(e.scheduleId);
    setSaveError(null);
    try {
      // Зөөгдсөн хичээлийн оноолт АНХНЫ огноогоор (week-resolver-тэй нэг түлхүүр)
      await api(`/schedule/${e.scheduleId}/staffing`, {
        method: "PUT",
        body: { date: e.occurrenceDate, leadTeacherId: lead || null, assistantTeacherId: assistant || null },
      });
      const who = (id: string) => {
        if (!id) return null;
        const t = teachers.find((x) => x.id === id);
        return { id, name: t?.name ?? "—", role: t ? (t.plus ? "TEACHER_PLUS" : "TEACHER") : null };
      };
      setData(
        (prev) =>
          prev && {
            ...prev,
            entries: prev.entries.map((x) =>
              x.scheduleId === e.scheduleId ? { ...x, leadTeacher: who(lead), assistantTeacher: who(assistant) } : x,
            ),
          },
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(null);
    }
  }

  const planned = entries.filter((e) => e.plan?.testIds.length || e.done.length || e.topic).length;
  const confirmed = entries.filter((e) => e.record).length;
  const total = entries.length;
  const find = (id: string | null) => entries.find((e) => e.scheduleId === id) ?? null;
  const moreEntry = find(moreOf);

  const strip = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, i - 1));
  const rel = (k: string) => (k === today ? "Өнөөдөр" : k === addDaysToKey(today, 1) ? "Маргааш" : k === addDaysToKey(today, -1) ? "Өчигдөр" : null);

  return (
    <section className="chunky space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CalendarDays className="size-5 text-brand-soft" aria-hidden />
        <h2 className="cyrillic-heading text-lg font-bold text-ink">
          {WEEKDAY_LABELS[weekdayOf(day)]}, {day.slice(5).replace("-", ".")}
        </h2>
        {rel(day) && <span className="rounded-full bg-brand-bright/15 px-2.5 py-0.5 text-xs font-semibold text-brand-soft">{rel(day)}</span>}
        {total > 0 && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", planned === total ? "bg-success/15 text-success" : "bg-ink/8 text-ink-dim")}>
            Төлөвлөсөн {planned}/{total}
          </span>
        )}
        {total > 0 && day <= today && (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", confirmed === total ? "bg-success/15 text-success" : "bg-ink/8 text-ink-dim")}>
            Батлагдсан {confirmed}/{total}
          </span>
        )}
      </div>

      <nav aria-label="Өдөр сонгох" className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => setDay((d) => addDaysToKey(d, -1))}
          aria-label="Өмнөх өдөр"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {strip.map((k) => {
            const on = k === day;
            const isToday = k === today;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${WEEKDAY_LABELS[weekdayOf(k)]}, ${k.slice(5).replace("-", ".")}${rel(k) ? `, ${rel(k)}` : ""}`}
                onClick={() => setDay(k)}
                className={cn(
                  "flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center rounded-lg px-1.5 text-xs transition",
                  on ? "bg-brand-bright text-on-brand" : "text-ink hover:bg-ink/5",
                  isToday && "min-w-14",
                  isToday && !on && "ring-2 ring-inset ring-brand-bright/60",
                )}
              >
                <span className={cn("font-semibold", !on && "text-ink-dim")}>{WEEKDAY_SHORT[weekdayOf(k)]}</span>
                <span className="text-sm font-bold tabular-nums">{Number(k.slice(8))}</span>
                {isToday && (
                  <span className={cn("text-[10px] font-semibold leading-none", on ? "text-on-brand" : "text-brand-soft")}>Өнөөдөр</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setDay((d) => addDaysToKey(d, 1))}
          aria-label="Дараагийн өдөр"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
        <label className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5">
          <CalendarDays className="size-5" aria-hidden />
          <span className="sr-only">Өдөр сонгох</span>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </nav>

      {data && total > 0 && (
        <div className="flex flex-wrap items-center gap-2 [&>div]:mb-0">
          {canPlan && day >= today && !data.isHoliday && <PublishDayButton key={day} date={day} />}
          <ExportImage date={day} entries={entries} tests={tests} />
        </div>
      )}

      {status === "loading" && !data && <DaySkeleton />}
      {status === "error" && !data && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          {data.isHoliday && (
            <p className="flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">
              <Palmtree className="size-4 shrink-0" aria-hidden />
              {data.holiday?.title || "Амралтын өдөр"}
            </p>
          )}
          {data.restingClasses.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
              <Palmtree className="size-3.5 shrink-0" aria-hidden />
              Амарна: {[...new Set(data.restingClasses.map((r) => r.classroomName.replace(/\s*\([^)]*\)$/, "")))].join(", ")}
            </p>
          )}
          {saveError && (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {saveError}
            </p>
          )}

          {total === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="Энэ өдөр хичээл алга"
              hint="Өөр өдөр сонгоно уу"
              action={
                <button
                  type="button"
                  onClick={() => setDay(addDaysToKey(today, 1))}
                  className="inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm font-semibold"
                >
                  Маргааш руу очих
                </button>
              }
            />
          ) : (
            <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start", status === "loading" && "opacity-60")}>
              <div className="min-w-0 space-y-7">
                {sections.map((s, si) => (
                  <section key={s.branch} aria-labelledby={`day-branch-${si}`} className="@container">
                    <h3 id={`day-branch-${si}`} className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                      <Building2 className="size-4 text-ink-dim" aria-hidden />
                      {s.branch}
                      <span className="text-xs font-medium tabular-nums text-ink-dim">{s.rows.length} хичээл</span>
                    </h3>
                    <div className="space-y-4">
                      {s.blocks.map((blk) => (
                        <div key={blk.start} role="group" aria-label={`${formatMinutes(blk.start)}–${formatMinutes(blk.end)}`}>
                          <p className="mb-1.5 flex items-center gap-2 px-1">
                            <span className="text-base font-bold tabular-nums text-ink">
                              {formatMinutes(blk.start)}–{formatMinutes(blk.end)}
                            </span>
                            <span className="text-xs tabular-nums text-ink-dim">{blk.rows.length} анги</span>
                          </p>
                          <p aria-hidden className="hidden grid-cols-[12rem_minmax(0,1fr)_9rem_9rem_7rem] gap-x-3 px-3 pb-1 text-[11px] font-semibold text-ink-dim @4xl:grid">
                            <span>Анги</span>
                            <span>Тест</span>
                            <span>Ахлах багш</span>
                            <span>Туслах багш</span>
                            <span className="text-right">Батлах</span>
                          </p>
                          <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70 bg-surface">
                            {blk.rows.map((e) => (
                              <LessonRow
                                key={`${e.scheduleId}-${e.startMinute}`}
                                entry={e}
                                date={day}
                                blockEnd={blk.end}
                                tests={tests}
                                canPlan={canPlan}
                                canConfirm={canConfirm}
                                past={day <= today}
                                teachers={teachers}
                                working={working}
                                rosterOrder={rosterOrder}
                                workingLabel={day === today ? "Өнөөдөр ажиллах" : "Энэ өдөр ажиллах"}
                                saving={saving === e.scheduleId}
                                clash={(id) => clashes.has(`${e.scheduleId}|${id}`)}
                                armedId={armedId}
                                armedName={armedName}
                                onQuickAssign={(slot) => {
                                  if (!armedId) return;
                                  const lead = slot === "lead" ? armedId : (e.leadTeacher?.id ?? "");
                                  const assistant = slot === "assistant" ? armedId : (e.assistantTeacher?.id ?? "");
                                  setArmedId(null);
                                  void saveStaff(e, lead, assistant);
                                }}
                                onStaff={(lead, assistant) => saveStaff(e, lead, assistant)}
                                onOpen={() => setPlanOf(e.scheduleId)}
                                onConfirm={() => setConfirmOf(e.scheduleId)}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <DayTeachers
                loads={loads}
                extra={extraLoads}
                inRange={data.roster?.inRange ?? true}
                armedId={armedId}
                onArm={canPlan ? setArmedId : null}
                className="lg:sticky lg:top-4"
              />
            </div>
          )}
          <Legend canPlan={canPlan} />
        </>
      )}

      <PlanDialog
        entry={find(planOf)}
        date={day}
        today={today}
        tests={tests}
        canPlan={canPlan}
        canConfirm={canConfirm}
        onClose={() => setPlanOf(null)}
        onSaved={reload}
        onMore={() => {
          setMoreOf(planOf);
          setPlanOf(null);
        }}
        onHistory={() => {
          const e = find(planOf);
          if (e) setHistoryOf({ id: e.classroomId, name: e.classroomName });
          setPlanOf(null);
        }}
        onConfirm={() => {
          setConfirmOf(planOf);
          setPlanOf(null);
        }}
      />
      <ConfirmDialog entry={find(confirmOf)} date={day} tests={tests} onClose={() => setConfirmOf(null)} onDone={reload} />
      <EntryActionPanel
        open={moreEntry !== null}
        entry={moreEntry as unknown as WeekEntry | null}
        date={day}
        dayEntries={entries as unknown as WeekEntry[]}
        onClose={() => setMoreOf(null)}
        onChanged={reload}
      />
      <ClassroomLessonHistory classroom={historyOf} onClose={() => setHistoryOf(null)} />
    </section>
  );
}

function DaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton h-20 rounded-xl" />
      ))}
    </div>
  );
}

/** Тэмдэглэгээ — хамгийн доор */
function Legend({ canPlan }: { canPlan: boolean }) {
  return (
    <section aria-labelledby="day-legend" className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <h3 id="day-legend" className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink-dim">
        Тэмдэглэгээ
        <InfoHint label="Тэмдэглэгээний тайлбар">
          <span className="block space-y-1.5">
            <span className="block">Тест: өмнөх хичээл, сум, өнөөдрийнх</span>
            <span className="block">Тестийн нэр дээр удаан дарвал бүтэн нэр гарна</span>
            {canPlan && <span className="block">Мөр дээр дарж тест, тарах эсэх, тэмдэглэл, онолын зураг тавина</span>}
          </span>
        </InfoHint>
      </h3>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-dim">
        <li className="inline-flex items-center gap-1.5">
          <RoomBadge room="501" />
          Танхим
        </li>
        <li>
          Тоолол 3
          <Excluded numbers={[2, 5]} /> — улаан тоо: хассан бодлого
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-info/20" aria-hidden />
          Тарах хичээл
        </li>
      </ul>
    </section>
  );
}
