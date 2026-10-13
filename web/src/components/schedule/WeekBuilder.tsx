"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Palmtree, Plus } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useSection } from "@/components/students/progress/useSection";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { getClassroomColor } from "@/lib/classroomColor";
import RoomShape from "./RoomShape";
import PublishDayButton from "./PublishDayButton";
import EntryActionPanel from "./EntryActionPanel";
import DayRosterPanel, { type RosterChip } from "./roster/DayRosterPanel";
import LessonRowActions from "@/components/lesson-records/LessonRowActions";
import ClassroomLessonHistory from "@/components/lesson-records/ClassroomLessonHistory";
import type { LessonDay } from "@/components/lesson-records/types";
import {
  addDaysToKey,
  formatMinutes,
  roomOrderOf,
  todayUBKey,
  WEEKDAY_LABELS,
  type WeekEntry,
  type WeekResponse,
} from "./types";

/**
 * ӨДРИЙН ХУВААРЬ (эзний шийдвэр 2026-10-08).
 *
 * Төв хичээлийн төлөвлөгөөгөө өдөр өдрөөр гаргадаг: маргаашийн хуваарийг
 * өнөө орой эсвэл маргааш өглөө, хааяа 2–3 хоногийн өмнө. Тиймээс 7 баганат
 * долоо хоногийн самбарын оронд НЭГ өдрийг томоор харуулна: цаг бүрд аль анги,
 * аль танхимд, ямар онол, хэн багш орох — төвийн өдрийн Excel хүснэгтийн
 * дараалал (Цаг | Анги | Онол | Багш). Мөр дээр дарахад тухайн өдрийн сэдэв, танхим,
 * цагийг өөрчлөх самбар нээгдэнэ (өмнөх функц хэвээр).
 *
 * Өгөгдөл: GET /schedule/week?start=<Даваа> — сонгосон өдрийн 7 хоногийг авна.
 */

function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = d.getUTCDay();
  return addDaysToKey(dateKey, weekday === 0 ? -6 : 1 - weekday);
}

function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}.${day}`;
}

function weekdayOf(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
}

/** Үдээс хойш маргаашийн хуваарь хамгийн их хэрэгтэй — тиймээс анхдагч нь маргааш. */
function defaultDay(): string {
  const today = todayUBKey();
  const hourUB = (new Date().getUTCHours() + 8) % 24;
  return hourUB >= 12 ? addDaysToKey(today, 1) : today;
}

export default function WeekBuilder() {
  const today = todayUBKey();
  const [day, setDay] = useState(defaultDay);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyOf, setHistoryOf] = useState<{ id: string; name: string } | null>(null);
  // Чип дээр дарж «сонгосон» багш — хоосон Ахлах/Туслах нүдэнд нэг товшилтоор оноох
  const [armedId, setArmedId] = useState<string | null>(null);
  useEffect(() => {
    if (!armedId) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setArmedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armedId]);
  // Энгийн багш багш оноохгүй (зөвхөн нэрийг харна) — /schedule/teachers нь Багш+/Админд л.
  const role = useSyncExternalStore(
    () => () => {},
    getRole,
    () => null,
  );
  const canAssign = role === "ADMIN" || role === "TEACHER_PLUS";
  const { data: teacherRows } = useSection<
    { id: string; firstName: string; lastName: string; displayName?: string; role?: string }[]
  >(canAssign ? "/schedule/teachers" : null, []);
  const teachers = useMemo(
    () =>
      teacherRows
        .map((t) => ({ id: t.id, name: t.displayName ?? t.firstName }))
        .sort((a, b) => a.name.localeCompare(b.name, "mn")),
    [teacherRows],
  );

  const {
    data,
    status,
    error,
    reload: load,
    setData,
  } = useSection<WeekResponse | null>(`/schedule/week?start=${mondayOf(day)}`, null);
  const loading = status === "loading";

  // Батламж, багшийн тайлбар, тарсан цаг — зөвхөн ажилтанд (сурагчид хэзээ ч ирэхгүй)
  const { data: lessonDay, setData: setLessonDay } = useSection<LessonDay | null>(
    `/lesson-records/day?date=${day}`,
    null,
  );
  const recordOf = (id: string) => lessonDay?.records.find((r) => r.scheduleId === id) ?? null;
  const noteOf = (id: string) => lessonDay?.notes.find((n) => n.scheduleId === id) ?? null;
  const dismissalOf = (cid: string) => lessonDay?.dismissals.find((d) => d.classroomId === cid)?.approximateAt ?? null;
  const patchDay = (fn: (d: LessonDay) => LessonDay) =>
    setLessonDay((prev) => fn(prev ?? { date: day, records: [], notes: [], dismissals: [] }));

  const dayData = data?.days.find((d) => d.date === day) ?? null;
  // Тухайн өдөр амрах ангиуд (ангийн тусгай өдөр) — гарчгаар бүлэглэнэ
  const resting = useMemo(() => {
    const rows =
      (dayData as { restingClasses?: { classroomName: string; title: string }[] } | null)?.restingClasses ?? [];
    const byTitle = new Map<string, string[]>();
    for (const r of rows) {
      const names = byTitle.get(r.title) ?? [];
      names.push(r.classroomName.replace(/\s*\([^)]*\)$/, ""));
      byTitle.set(r.title, names);
    }
    return [...byTitle.entries()];
  }, [dayData]);
  const rosterDay = data?.teacherRoster.find((r) => r.date === day) ?? null;

  // Багш бүр энэ өдөр хэдэн хичээлд ахлах/туслахаар оноогдсон
  const { chips, extraChips, workingIds } = useMemo(() => {
    const lead = new Map<string, number>();
    const asst = new Map<string, number>();
    const assignedNames = new Map<string, string>();
    for (const e of dayData?.entries ?? []) {
      if (e.leadTeacher) {
        lead.set(e.leadTeacher.id, (lead.get(e.leadTeacher.id) ?? 0) + 1);
        assignedNames.set(e.leadTeacher.id, e.leadTeacher.name);
      }
      if (e.assistantTeacher) {
        asst.set(e.assistantTeacher.id, (asst.get(e.assistantTeacher.id) ?? 0) + 1);
        assignedNames.set(e.assistantTeacher.id, e.assistantTeacher.name);
      }
    }
    const working = rosterDay?.teachers ?? [];
    const ids = new Set(working.map((t) => t.id));
    const chip = (id: string, name: string, role?: string): RosterChip => ({
      id,
      name,
      plus: role ? role === "TEACHER_PLUS" || role === "ADMIN" : null,
      lead: lead.get(id) ?? 0,
      assistant: asst.get(id) ?? 0,
    });
    return {
      workingIds: ids,
      chips: working.map((t) => chip(t.id, t.name, t.role)),
      extraChips: [...assignedNames.entries()]
        .filter(([id]) => !ids.has(id))
        .map(([id, name]) => chip(id, name, teacherRows.find((t) => t.id === id)?.role)),
    };
  }, [dayData, rosterDay, teacherRows]);
  const armedName = armedId
    ? (chips.find((c) => c.id === armedId)?.name ?? teachers.find((t) => t.id === armedId)?.name ?? null)
    : null;

  // Цагийн бүсээр бүлэглэж, бүс дотор танхимын тогтмол дарааллаар.
  // Салбараар (Баруун 4 дээр, Зүүн 4 доор — эзэн 2026-10-08), дотор нь цагийн
  // бүсээр, бүс дотор танхимын тогтмол дарааллаар.
  // Нэг багш ДАВХАР цагт хоёр ангид оноогдсон эсэх (эзэн 2026-10-11): цаг давхцвал
  // тухайн багшийн сонголт улаанаар анхааруулна.
  const clashes = useMemo(() => {
    const list = (dayData?.entries ?? []).flatMap((e) =>
      [e.leadTeacher?.id, e.assistantTeacher?.id]
        .filter((id): id is string => !!id)
        .map((id) => ({ id, start: e.startMinute, end: e.endMinute, sid: e.scheduleId })),
    );
    const out = new Set<string>();
    for (const a of list)
      for (const b of list)
        if (a !== b && a.id === b.id && a.sid !== b.sid && a.start < b.end && b.start < a.end) out.add(`${a.sid}|${a.id}`);
    return out;
  }, [dayData]);

  const bands = useMemo(() => {
    const branchOf = (name: string) => (/Зүүн/.test(name) ? "Зүүн 4" : /Баруун/.test(name) ? "Баруун 4" : "Бусад");
    const rank: Record<string, number> = { "Баруун 4": 0, "Зүүн 4": 1, Бусад: 2 };
    const out = new Map<string, { branch: string; time: string; entries: WeekEntry[] }>();
    const entries = [...(dayData?.entries ?? [])].sort(
      (a, b) =>
        rank[branchOf(a.classroomName)] - rank[branchOf(b.classroomName)] ||
        a.startMinute - b.startMinute ||
        roomOrderOf(a.room) - roomOrderOf(b.room),
    );
    for (const e of entries) {
      const branch = branchOf(e.classroomName);
      const time = `${formatMinutes(e.startMinute)}–${formatMinutes(e.endMinute)}`;
      const key = `${branch}|${time}`;
      const band = out.get(key) ?? { branch, time, entries: [] };
      band.entries.push(e);
      out.set(key, band);
    }
    return [...out.values()];
  }, [dayData]);

  async function saveStaff(e: WeekEntry, leadTeacherId: string, assistantTeacherId: string) {
    setSaving(e.scheduleId);
    setSaveError(null);
    try {
      await api(`/schedule/${e.scheduleId}/staffing`, {
        method: "PUT",
        body: { date: day, leadTeacherId: leadTeacherId || null, assistantTeacherId: assistantTeacherId || null },
      });
      // Бүтэн жагсаалтыг дахин ачаалбал анивчина — зөвхөн энэ мөрийг шинэчилнэ.
      const who = (id: string) => (id ? { id, name: teachers.find((t) => t.id === id)?.name ?? "—" } : null);
      setData(
        (prev) =>
          prev && {
            ...prev,
            days: prev.days.map((d) =>
              d.date !== day
                ? d
                : {
                    ...d,
                    entries: d.entries.map((x) =>
                      x.scheduleId === e.scheduleId
                        ? { ...x, leadTeacher: who(leadTeacherId), assistantTeacher: who(assistantTeacherId) }
                        : x,
                    ),
                  },
            ),
          },
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(null);
    }
  }

  const withTopic = dayData?.entries.filter((e) => e.topic).length ?? 0;
  const confirmed = dayData?.entries.filter((e) => recordOf(e.scheduleId)).length ?? 0;
  const total = dayData?.entries.length ?? 0;
  const selectedEntry = dayData?.entries.find((e) => e.scheduleId === selectedId) ?? null;

  function quickAssign(e: WeekEntry, slot: "lead" | "assistant") {
    if (!armedId) return;
    const lead = slot === "lead" ? armedId : (e.leadTeacher?.id ?? "");
    const assistant = slot === "assistant" ? armedId : (e.assistantTeacher?.id ?? "");
    setArmedId(null);
    void saveStaff(e, lead, assistant);
  }

  const quick = [
    { key: addDaysToKey(today, -1), label: "Өчигдөр" },
    { key: today, label: "Өнөөдөр" },
    { key: addDaysToKey(today, 1), label: "Маргааш" },
    { key: addDaysToKey(today, 2), label: WEEKDAY_LABELS[weekdayOf(addDaysToKey(today, 2))] },
    { key: addDaysToKey(today, 3), label: WEEKDAY_LABELS[weekdayOf(addDaysToKey(today, 3))] },
  ];

  return (
    <section className="chunky p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-soft" aria-hidden />
          <h2 className="font-bold text-brand-soft">
            {WEEKDAY_LABELS[weekdayOf(day)]}, {shortDate(day)}
          </h2>
          {total > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                withTopic === total ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              Сэдэвтэй {withTopic}/{total}
            </span>
          )}
          {total > 0 && day <= today && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                confirmed === total ? "bg-success/15 text-success" : "bg-ink/5 text-ink-dim"
              }`}
            >
              Батлагдсан {confirmed}/{total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDay((d) => addDaysToKey(d, -1))}
            aria-label="Өмнөх өдөр"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:border-brand"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            aria-label="Өдөр сонгох"
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setDay((d) => addDaysToKey(d, 1))}
            aria-label="Дараагийн өдөр"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:border-brand"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Өдөр" className="mb-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q.key}
            role="tab"
            type="button"
            aria-selected={q.key === day}
            onClick={() => setDay(q.key)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
              q.key === day
                ? "border-brand-bright bg-brand-bright text-on-brand"
                : "border-line bg-panel text-ink hover:border-brand"
            }`}
          >
            {q.label}
            <span className="ml-1.5 font-normal opacity-75">{shortDate(q.key)}</span>
          </button>
        ))}
      </div>

      {canAssign && total > 0 && day >= today && !dayData?.isHoliday && <PublishDayButton key={day} date={day} />}

      {loading && <LoadingState rows={6} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && dayData && (
        <>
          {dayData.isHoliday && (
            <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">
              <Palmtree className="h-4 w-4 shrink-0" aria-hidden /> Амралтын өдөр
            </p>
          )}

          {resting.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {resting.map(([title, names]) => (
                <p
                  key={title}
                  className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning"
                >
                  <Palmtree className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Амарна: {names.join(", ")}
                  {title && <span className="font-normal">— {title}</span>}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-start xl:gap-5">
            <div className="xl:sticky xl:top-4 xl:order-2">
              <DayRosterPanel
                rosterDay={rosterDay}
                chips={chips}
                extra={extraChips}
                armedId={armedId}
                onArm={canAssign ? setArmedId : null}
              />
            </div>
            <div className="min-w-0 xl:order-1">
              {bands.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-dim">Энэ өдөр хичээл товлоогдоогүй.</p>
              ) : (
                <div className="space-y-5">
                  {saveError && (
                    <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                      {saveError}
                    </p>
                  )}
                  <p className="hidden grid-cols-[minmax(0,1fr)_8.75rem_8.75rem_auto] gap-x-3 px-3 text-xs font-semibold text-ink-dim sm:grid">
                    <span>Танхим, анги, онол</span>
                    <span>Ахлах багш</span>
                    <span>Туслах багш</span>
                    <span className="text-right">Батлах</span>
                  </p>
                  {bands.map(({ branch, time, entries }, bi) => (
                    <div key={`${branch}|${time}`}>
                      {(bi === 0 || bands[bi - 1].branch !== branch) && (
                        <h3
                          className={`mb-2 text-sm font-bold text-ink ${bi === 0 ? "" : "mt-7 border-t border-line pt-5"}`}
                        >
                          {branch}
                        </h3>
                      )}
                      <p className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-soft">{time}</span>
                        <span className="h-px flex-1 bg-line/70" aria-hidden />
                      </p>
                      <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
                        {entries.map((e) => (
                          <div
                            key={`${e.scheduleId}-${e.startMinute}`}
                            style={{ "--cls": getClassroomColor(e.classroomId) } as React.CSSProperties}
                            className={`class-row grid w-full grid-cols-2 items-center gap-x-3 gap-y-1.5 py-2 pr-3 pl-3 sm:grid-cols-[minmax(0,1fr)_8.75rem_8.75rem_auto] ${
                              dayData.isHoliday ? "opacity-60" : ""
                            }`}
                          >
                            {/* Анги + онол — дарахад сэдэв/танхим/цаг солих самбар */}
                            <button
                              type="button"
                              onClick={() => setSelectedId(e.scheduleId)}
                              className="col-span-2 grid min-h-11 min-w-0 grid-cols-[4.5rem_3.5rem_1fr] items-center gap-x-3 rounded-lg text-left hover:bg-ink/[0.03] sm:col-span-1"
                            >
                              <span className="flex items-center gap-1.5 text-ink">
                                <RoomShape room={e.room} size={16} />
                                <span className="font-mono text-xs text-ink-dim">{e.room ?? "—"}</span>
                              </span>
                              <span className="font-semibold text-ink">
                                {e.classroomName.replace(/\s*\([^)]*\)$/, "")}
                              </span>
                              <span className="line-clamp-2 min-w-0 text-sm">
                                {e.exception?.kind === "MOVED" && (
                                  <span className="mr-1.5 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                                    {e.exception.originalDate !== day ? "Зөөгдсөн" : "Өөрчилсөн"}
                                  </span>
                                )}
                                {e.topic ? (
                                  <span className="font-medium">{e.topic}</span>
                                ) : (
                                  <span className="italic text-ink-dim">Сэдэв зоогоогүй</span>
                                )}
                              </span>
                            </button>
                            {canAssign ? (
                              <>
                                <TeacherPick
                                  label="Ахлах багш"
                                  clash={!!e.leadTeacher && clashes.has(`${e.scheduleId}|${e.leadTeacher.id}`)}
                                  value={e.leadTeacher?.id ?? ""}
                                  other={e.assistantTeacher?.id ?? ""}
                                  teachers={teachers}
                                  working={workingIds}
                                  disabled={saving === e.scheduleId}
                                  armedName={armedId && armedId !== e.assistantTeacher?.id ? armedName : null}
                                  onQuickAssign={() => quickAssign(e, "lead")}
                                  onChange={(id) => saveStaff(e, id, e.assistantTeacher?.id ?? "")}
                                />
                                <TeacherPick
                                  label="Туслах багш"
                                  clash={!!e.assistantTeacher && clashes.has(`${e.scheduleId}|${e.assistantTeacher.id}`)}
                                  value={e.assistantTeacher?.id ?? ""}
                                  other={e.leadTeacher?.id ?? ""}
                                  teachers={teachers}
                                  working={workingIds}
                                  disabled={saving === e.scheduleId}
                                  armedName={armedId && armedId !== e.leadTeacher?.id ? armedName : null}
                                  onQuickAssign={() => quickAssign(e, "assistant")}
                                  onChange={(id) => saveStaff(e, e.leadTeacher?.id ?? "", id)}
                                />
                              </>
                            ) : (
                              <>
                                <TeacherName label="Ахлах багш" name={e.leadTeacher?.name} />
                                <TeacherName label="Туслах багш" name={e.assistantTeacher?.name} />
                              </>
                            )}
                            <LessonRowActions
                              entry={e}
                              date={day}
                              today={today}
                              record={recordOf(e.scheduleId)}
                              note={noteOf(e.scheduleId)}
                              dismissalAt={dismissalOf(e.classroomId)}
                              onRecord={(r) =>
                                patchDay((d) => ({
                                  ...d,
                                  records: [
                                    ...d.records.filter((x) => x.scheduleId !== e.scheduleId),
                                    ...(r ? [r] : []),
                                  ],
                                }))
                              }
                              onNote={(n) =>
                                patchDay((d) => ({
                                  ...d,
                                  notes: [...d.notes.filter((x) => x.scheduleId !== e.scheduleId), ...(n ? [n] : [])],
                                }))
                              }
                              onDismissal={(cid, iso) =>
                                patchDay((d) => ({
                                  ...d,
                                  dismissals: [
                                    ...d.dismissals.filter((x) => x.classroomId !== cid),
                                    { classroomId: cid, approximateAt: iso },
                                  ],
                                }))
                              }
                              onHistory={() => setHistoryOf({ id: e.classroomId, name: e.classroomName })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <EntryActionPanel
        open={selectedEntry !== null}
        entry={selectedEntry}
        date={day}
        dayEntries={dayData?.entries ?? []}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
      <ClassroomLessonHistory classroom={historyOf} onClose={() => setHistoryOf(null)} />
    </section>
  );
}

/** Энгийн багшид — оноосон багшийн нэрийг зөвхөн харуулна. */
function TeacherName({ label, name }: { label: string; name?: string | null }) {
  return (
    <p className="flex min-h-10 min-w-0 flex-col justify-center gap-0.5">
      <span className="text-[11px] font-semibold text-ink-dim sm:sr-only">{label}</span>
      <span className={`truncate text-sm ${name ? "text-ink" : "text-ink-dim"}`}>{name ?? "—"}</span>
    </p>
  );
}

/**
 * Багш сонгох — хоосон байж болно; нөгөө баганад сонгосон багш энд идэвхгүй.
 * Тухайн өдөр ажиллах багш эхэнд («Энэ өдөр ажиллана»), бусад нь доор.
 * Чип «сонгосон» үед хоосон нүд нь нэг товшилтоор оноох товч болно.
 */
function TeacherPick({
  label,
  value,
  other,
  teachers,
  working,
  disabled,
  armedName,
  onQuickAssign,
  onChange,
  clash,
}: {
  clash?: boolean;
  label: string;
  value: string;
  other: string;
  teachers: { id: string; name: string }[];
  working: Set<string>;
  disabled?: boolean;
  armedName?: string | null;
  onQuickAssign?: () => void;
  onChange: (id: string) => void;
}) {
  const today = teachers.filter((t) => working.has(t.id));
  const rest = teachers.filter((t) => !working.has(t.id));
  const option = (t: { id: string; name: string }) => (
    <option key={t.id} value={t.id} disabled={t.id === other}>
      {t.name}
    </option>
  );
  if (!value && armedName && onQuickAssign) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold text-ink-dim sm:sr-only">{label}</span>
        <button
          type="button"
          onClick={onQuickAssign}
          disabled={disabled}
          aria-label={`${label}: ${armedName} оноох`}
          className="inline-flex min-h-11 w-full min-w-0 items-center gap-1 rounded-lg border border-dashed border-brand bg-brand-bright/10 px-2 text-sm font-semibold text-brand-soft disabled:opacity-50"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{armedName}</span>
        </button>
      </div>
    );
  }
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-ink-dim sm:sr-only">{label}</span>
      <select
        aria-label={label}
        aria-invalid={clash || undefined}
        title={clash ? "Энэ багш энэ цагт өөр ангид давхар оноогдсон" : undefined}
        value={value}
        disabled={disabled}
        onChange={(ev) => onChange(ev.target.value)}
        className={`min-h-11 w-full min-w-0 rounded-lg border bg-bg px-2 text-sm ${
          clash ? "border-error bg-error/8 text-error" : `border-line ${value ? "text-ink" : "text-ink-dim"}`
        }`}
      >
        <option value="">—</option>
        {today.length > 0 ? (
          <>
            <optgroup label="Энэ өдөр ажиллана">{today.map(option)}</optgroup>
            {rest.length > 0 && <optgroup label="Бусад">{rest.map(option)}</optgroup>}
          </>
        ) : (
          teachers.map(option)
        )}
      </select>
      {clash && <span className="text-[11px] font-semibold text-error">Энэ цагт давхар</span>}
    </label>
  );
}
