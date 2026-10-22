"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CalendarX2, ChevronLeft, ChevronRight, Eye, PencilLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import RoomBadge from "@/components/schedule/RoomBadge";
import { ErrorState } from "@/components/ui/StateBlock";
import { usePresence } from "@/hooks/usePresence";
import { api, ApiError, getRole } from "@/lib/api";
import { byFirstName, rosterNames } from "@/lib/personName";
import ClassPicker from "./ClassPicker";
import CriteriaButton from "./CriteriaButton";
import DateStrip, { type YearMonth } from "./DateStrip";
import LessonNoteBox from "./LessonNoteBox";
import MarkView, { type BulkState } from "./MarkView";
import MonitorView, { type FilterKey } from "./MonitorView";
import OtherInfo from "./OtherInfo";
import RecordedByLine from "./RecordedBy";
import StudentDrawer from "./StudentDrawer";
import type { OnlineCell } from "./StudentCard";
import SummaryBar from "./SummaryBar";
import {
  addDays,
  dayCounts,
  dayLabel,
  fromKey,
  hasNote,
  hm,
  initialTab,
  needsDetail,
  readStore,
  rememberTab,
  shortDay,
  toKey,
  ubNowMinute,
  ubTodayKey,
  writeStore,
  type AttendanceStatus,
  type BoardLesson,
  type DayClass,
  type DayRec,
  type HomeworkStatus,
  type MakeupRow,
  type MakeupStatus,
  type OnlinePayload,
  type Tab,
} from "./lib";
import { useBoard } from "./useBoard";

const CLASS_KEY = "teacher_selected_classroom";

interface DayPayload {
  date: string;
  classes: DayClass[];
  selected?: { id: string; name: string; type: string; studentCount: number } | null;
}

export interface BoardLink {
  classId: string | null;
  date: string | null;
}

const noop = () => () => {};
/** Цаг, localStorage хамааралтай — зөвхөн хөтөчид зурна (hydration зөрөхгүй) */
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3">
      <div className="skeleton h-11 w-64 rounded-xl" />
      <div className="skeleton h-[118px] rounded-xl sm:h-[86px]" />
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-11 w-56 rounded-lg" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Ирц ба даалгаврын самбар (/app/teacher) — эзний баталсан демогийн дагуу, ЖИНХЭНЭ өгөгдөл.
 * `?class=&date=` — өдрийн хуваариас тэр анги, тэр өдөр рүү шууд.
 */
export default function Board({ link }: { link: BoardLink }) {
  const mounted = useMounted();
  if (!mounted) return <BoardSkeleton />;
  return <BoardRoot link={link} />;
}

function BoardRoot({ link }: { link: BoardLink }) {
  const role = getRole();
  const canManage = role === "ADMIN" || role === "TEACHER_PLUS";
  const [today] = useState(ubTodayKey);
  const [date, setDate] = useState(() => link.date ?? today);
  const [view, setView] = useState<YearMonth>(() => {
    const d = fromKey(link.date ?? today);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  /** Багш өөрөө сонгосон анги — өдөр солиход хадгалагдана; эс бөгөөс тэр өдрийн эхний хичээл */
  const [picked, setPicked] = useState<string | null>(() => link.classId);
  const [day, setDay] = useState<DayPayload | null>(null);
  const [dayFail, setDayFail] = useState<{ key: string; msg: string } | null>(null);
  const [dayRetry, setDayRetry] = useState(0);
  // Сонгосон анги тэр өдөр хичээлгүй байсан ч нэр, тоог нь серверээс (эрхтэй бол)
  const wanted = picked ?? readStore(CLASS_KEY);

  useEffect(() => {
    let alive = true;
    const q = wanted ? `&classroomId=${encodeURIComponent(wanted)}` : "";
    api<DayPayload>(`/attendance/board?date=${date}${q}`)
      .then((d) => {
        if (!alive) return;
        setDay(d);
        setDayFail(null);
      })
      .catch((e) => alive && setDayFail({ key: `${date}|${dayRetry}`, msg: e instanceof Error ? e.message : "Ангиуд ачаалагдсангүй" }));
    return () => {
      alive = false;
    };
  }, [date, dayRetry, wanted]);
  const dayError = dayFail?.key === `${date}|${dayRetry}` ? dayFail.msg : "";

  const dayReady = day?.date === date;
  const classes = useMemo(() => (dayReady ? day!.classes : []), [dayReady, day]);

  // Сонгосон анги: багшийн сонголт → сүүлд сонгосон (энэ өдөр хичээлтэй бол) → явагдаж буй/эхний хичээл
  const classId = useMemo(() => {
    if (picked) return picked;
    if (!dayReady) return null;
    const saved = readStore(CLASS_KEY);
    if (saved && classes.some((c) => c.id === saved)) return saved;
    const now = date === today ? ubNowMinute() : -1;
    const live = classes.find((c) => c.lessons.some((l) => l.startMinute <= now && now < l.endMinute));
    return (live ?? classes[0])?.id ?? null;
  }, [picked, dayReady, classes, date, today]);

  const cls = classes.find((c) => c.id === classId) ?? null;

  // URL-ийг шинэчилнэ (дахин ачаалахад ижил анги, өдөр)
  useEffect(() => {
    if (!classId) return;
    writeStore(CLASS_KEY, classId);
    const url = new URL(window.location.href);
    url.searchParams.set("class", classId);
    url.searchParams.set("date", date);
    window.history.replaceState(window.history.state, "", url);
  }, [classId, date]);

  // Огнооны зурвасын цэг: сонгосон ангийн хичээлтэй өдрүүд (харж буй сар ± 1 сар)
  const [lessonDays, setLessonDays] = useState<{ key: string; days: Set<string> } | null>(null);
  const rangeKey = classId ? `${classId}|${view.y}-${view.m}` : null;
  useEffect(() => {
    if (!classId) return;
    let alive = true;
    const from = toKey(new Date(view.y, view.m - 1, 1));
    const to = toKey(new Date(view.y, view.m + 2, 0));
    api<{ date: string; classes: unknown[] }[]>(`/schedule/days?from=${from}&to=${to}&classroomId=${encodeURIComponent(classId)}`)
      .then((days) => {
        if (alive) setLessonDays({ key: `${classId}|${view.y}-${view.m}`, days: new Set(days.filter((d) => d.classes.length > 0).map((d) => d.date)) });
      })
      .catch(() => alive && setLessonDays({ key: `${classId}|${view.y}-${view.m}`, days: new Set() }));
    return () => {
      alive = false;
    };
  }, [classId, view.y, view.m]);
  const dots = useMemo(() => {
    const set = new Set(lessonDays?.key === rangeKey ? lessonDays.days : []);
    if (cls) set.add(date);
    return set;
  }, [lessonDays, rangeKey, cls, date]);

  const pickDate = useCallback((key: string) => {
    const d = fromKey(key);
    setDate(key);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }, []);

  const nearest = (dir: 1 | -1): string | null => {
    if (lessonDays?.key !== rangeKey) return null;
    for (let i = 1, k = addDays(date, dir); i <= 45; i++, k = addDays(k, dir)) if (lessonDays.days.has(k)) return k;
    return null;
  };

  const sel = dayReady && day!.selected?.id === classId ? day!.selected : null;
  const current = cls ? { name: cls.name, studentCount: cls.studentCount } : sel ? { name: sel.name, studentCount: sel.studentCount } : null;

  const footer = cls ? (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {cls.lessons.map((l) => (
        <span key={l.scheduleId} className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-ink">
          <span>
            {hm(l.startMinute)}–{hm(l.endMinute)}
            {l.room ? "," : ""}
          </span>
          {l.room && <RoomBadge room={l.room} size="sm" />}
        </span>
      ))}
    </span>
  ) : dayReady ? (
    <span>Хичээлгүй өдөр</span>
  ) : null;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">Ирц ба даалгавар</h1>
      <div className="flex min-w-0 items-center gap-2">
        <ClassPicker
          classes={classes}
          value={cls?.id ?? null}
          current={current}
          loading={!dayReady}
          onChange={(id) => {
            setPicked(id);
            writeStore(CLASS_KEY, id);
          }}
        />
      </div>

      <div className="[&>nav>div:last-child]:order-last [&>nav>div:last-child]:basis-full">
        <DateStrip
          todayKey={today}
          lessonDays={dots}
          selectedKey={date}
          view={view}
          onView={setView}
          onSelect={pickDate}
          footer={footer}
        />
      </div>

      {dayError ? (
        <ErrorState message={dayError} onRetry={() => setDayRetry((r) => r + 1)} />
      ) : !dayReady ? (
        <BoardSkeletonBody />
      ) : cls ? (
        <ClassView key={`${cls.id}|${date}`} cls={cls} date={date} today={today} canManage={canManage} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-8 text-center">
          <CalendarX2 className="size-8 text-ink-dim" aria-hidden />
          <div>
            <p className="font-bold text-ink">{dayLabel(date)}, хичээлгүй өдөр</p>
            <p className="mt-1 text-sm text-ink-dim">
              {current
                ? `${current.name} ангийн хичээл энэ өдөр ороогүй`
                : classes.length
                  ? "Хичээлтэй ангиа дээрээс сонгоно уу"
                  : "Энэ өдөр танд хичээлтэй анги алга"}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {current &&
              ([-1, 1] as const).map((dir) => {
                const k = nearest(dir);
                if (!k) return null;
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => pickDate(k)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-ink/5 sm:min-h-9"
                  >
                    {dir === -1 && <ChevronLeft className="size-4" aria-hidden />}
                    {dir === -1 ? "Өмнөх хичээл" : "Дараагийн хичээл"}, {shortDay(k)}
                    {dir === 1 && <ChevronRight className="size-4" aria-hidden />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function BoardSkeletonBody() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3">
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-11 w-56 rounded-lg" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
  );
}

/* ───────── Нэг ангийн нэг өдрийн самбар ───────── */

interface Ui {
  /** Нээлттэй тайлбар: «auto» = төлөв сонгоход өөрөө нээгдсэн */
  open: Record<string, "auto" | "manual">;
  bulk: BulkState;
}
const EMPTY_UI: Ui = { open: {}, bulk: { att: [], hw: [] } };
const without = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids);

function nextOpen(open: Ui["open"], id: string, rec: DayRec, wantsOpen: boolean, homework: boolean): Ui["open"] {
  if (wantsOpen) return open[id] ? open : { ...open, [id]: "auto" };
  if (open[id] === "auto" && !needsDetail(rec, homework) && !hasNote(rec)) {
    const rest = { ...open };
    delete rest[id];
    return rest;
  }
  return open;
}

function lessonNowOf(lessons: BoardLesson[], date: string, today: string) {
  if (date !== today) return false;
  const now = ubNowMinute();
  return lessons.some((l) => l.startMinute <= now && now < l.endMinute);
}

function ClassView({ cls, date, today, canManage }: { cls: DayClass; date: string; today: string; canManage: boolean }) {
  const board = useBoard(cls.id, date);
  const { data, recs } = board;
  const homework = cls.type !== "ONLINE";
  const [lessonNow] = useState(() => lessonNowOf(cls.lessons, date, today));
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab = picked ?? initialTab(lessonNow);
  const [ui, setUi] = useState<Ui>(EMPTY_UI);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Энэ анги, энэ өдрийг зэрэг нээсэн бусад багш (D8)
  const editors = usePresence([`attendance:${cls.id}:${date}`]);
  const others = (editors[`attendance:${cls.id}:${date}`] ?? []).map((e) => e.name);

  // Өмнөх хичээлийн онлайн гэрийн даалгавар
  const [onlineData, setOnlineData] = useState<OnlinePayload | null>(null);
  useEffect(() => {
    if (!homework) return;
    let alive = true;
    api<OnlinePayload>(`/classrooms/${encodeURIComponent(cls.id)}/homework-marks/online?date=${date}`)
      .then((d) => alive && setOnlineData(d))
      .catch(() => alive && setOnlineData(null));
    return () => {
      alive = false;
    };
  }, [cls.id, date, homework]);
  const online = useMemo(() => {
    const out: Record<string, OnlineCell> = {};
    for (const [sid, r] of Object.entries(onlineData?.students ?? {})) out[sid] = { score: r.score, max: r.max, testId: r.testId };
    return out;
  }, [onlineData]);

  // Нөхөх хичээлийн төлөв (Агент 4-ийн /makeup) — өнгөрсөн өдөр; маршрут бэлэн болоогүй бол чимээгүй
  const [makeupRows, setMakeupRows] = useState<MakeupRow[]>([]);
  useEffect(() => {
    if (date >= today) return;
    let alive = true;
    api<MakeupRow[]>(`/makeup/classrooms/${encodeURIComponent(cls.id)}?date=${date}`)
      .then((rows) => alive && setMakeupRows(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (alive && !(e instanceof ApiError && e.status === 404)) setMakeupRows([]);
      });
    return () => {
      alive = false;
    };
  }, [cls.id, date, today]);
  const makeup = useMemo(() => {
    const m = new Map<string, MakeupStatus>();
    for (const r of makeupRows) {
      const rec = recs.get(r.studentId);
      if (rec && (rec.att === "ABSENT" || rec.att === "EXCUSED" || rec.att === "LATE")) m.set(r.studentId, r.status);
    }
    return m;
  }, [makeupRows, recs]);

  // Нэрээр (овгоор биш) эрэмбэлж «Б. Нэр»; ижил нэр, ижил овгийн үсэгтэй бол овог бүтнээр (эзэн 2026-10-18)
  const students = useMemo(() => [...(data?.students ?? [])].sort(byFirstName), [data]);
  const names = useMemo(() => rosterNames(students), [students]);
  const flags = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of students) m.set(s.id, (board.risk[s.id] ?? []).map((f) => f.label));
    return m;
  }, [students, board.risk]);
  // «Илгээсэн»: тухайн хичээлийн даалгаврыг илгээсэн сурагчид (сервер одоогийн сурагчаар шүүсэн)
  const sentSet = useMemo(() => new Set(board.sent), [board.sent]);
  const flaggedCount = useMemo(() => [...flags.values()].filter((f) => f.length > 0).length, [flags]);

  const changeTab = (t: Tab) => {
    setPicked(t);
    rememberTab(lessonNow, t);
  };

  const { onAtt: saveAtt, onHw: saveHw, bulkAtt, bulkHw } = board;
  const onAtt = useCallback(
    (id: string, v: AttendanceStatus | null) => {
      const before = recs.get(id);
      saveAtt(id, v);
      const rec = { ...(before ?? ({} as DayRec)), att: v };
      const wants = v === "LATE" || v === "ABSENT" || v === "EXCUSED";
      setUi((u) => ({ open: nextOpen(u.open, id, rec, wants, homework), bulk: { ...u.bulk, att: without(u.bulk.att, id) } }));
    },
    [recs, saveAtt, homework],
  );
  const onHw = useCallback(
    (id: string, v: HomeworkStatus | null) => {
      const before = recs.get(id);
      saveHw(id, v);
      const rec = { ...(before ?? ({} as DayRec)), hw: v };
      const wants = v === "PARTIAL" || v === "NOT_DONE";
      setUi((u) => ({ open: nextOpen(u.open, id, rec, wants, homework), bulk: { ...u.bulk, hw: without(u.bulk.hw, id) } }));
    },
    [recs, saveHw, homework],
  );
  const onToggle = useCallback((id: string) => {
    setUi((u) => {
      const open = { ...u.open };
      if (open[id]) delete open[id];
      else open[id] = "manual";
      return { ...u, open };
    });
  }, []);
  const openDrawer = useCallback((id: string) => setDrawerId(id), []);

  /* Бөөнөөр: зөвхөн тэмдэглээгүй нүд; дараа нь гараар өөрчилсөнийг буцаахгүй */
  const presentIds = students.filter((s) => recs.get(s.id)?.att === null).map((s) => s.id);
  const doneIds = students
    .filter((s) => {
      const r = recs.get(s.id);
      return r && r.hw === null && (r.att === "PRESENT" || r.att === "LATE");
    })
    .map((s) => s.id);
  const hwSkipped = students.filter((s) => {
    const r = recs.get(s.id);
    return r && r.hw === null && r.att !== "PRESENT" && r.att !== "LATE";
  }).length;

  const bulk = async (fn: () => Promise<void>) => {
    setBulkBusy(true);
    try {
      await fn();
    } finally {
      setBulkBusy(false);
    }
  };
  const bulkPresent = () =>
    bulk(async () => {
      const applied = await bulkAtt(presentIds, "PRESENT", "UNMARKED");
      setUi((u) => ({ ...u, bulk: { ...u.bulk, att: applied } }));
    });
  const undoPresent = () =>
    bulk(async () => {
      await bulkAtt(ui.bulk.att, null, "PRESENT");
      setUi((u) => ({ ...u, bulk: { ...u.bulk, att: [] } }));
    });
  const bulkDone = () =>
    bulk(async () => {
      const applied = await bulkHw(doneIds, "DONE", "UNMARKED");
      setUi((u) => ({ ...u, bulk: { ...u.bulk, hw: applied } }));
    });
  const undoDone = () =>
    bulk(async () => {
      await bulkHw(ui.bulk.hw, null, "DONE");
      setUi((u) => ({ ...u, bulk: { ...u.bulk, hw: [] } }));
    });

  if (board.status === "error") return <ErrorState message={board.loadError} onRetry={board.reload} />;
  if (board.status !== "ready" || !data) return <BoardSkeletonBody />;

  const total = students.length;
  // Төлөв БҮРИЙН тоо (Ирсэн ба Хоцорсон тусдаа — эзэн 2026-10-22)
  const counts = dayCounts(
    students.map((s) => s.id),
    recs,
  );
  const hasOnline = homework && !!onlineData && onlineData.tests.length > 0;
  const firstStart = Math.min(...cls.lessons.map((l) => l.startMinute));
  const upcoming = date > today || (date === today && ubNowMinute() < firstStart);
  const drawer = drawerId ? students.find((s) => s.id === drawerId) : undefined;

  return (
    <div className="space-y-3">
      <LessonNoteBox scheduleId={cls.lessons[0].scheduleId} date={date} today={today} />

      <Tabs.Root value={tab} onValueChange={(v) => changeTab(v as Tab)}>
        <Tabs.List aria-label="Самбарын хэсэг" className="flex gap-1 border-b border-line">
          {(
            [
              ["monitor", "Хяналт", Eye],
              ["mark", "Тэмдэглэх", PencilLine],
            ] as const
          ).map(([value, label, Icon]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-bold text-ink-dim transition-colors hover:text-ink data-[state=active]:border-brand-bright data-[state=active]:text-brand-soft"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="mt-3 space-y-3">
          <SummaryBar
            counts={counts}
            homework={homework}
            sent={students.filter((s) => sentSet.has(s.id)).length}
            online={hasOnline ? Object.keys(online).length : null}
            total={total}
            save={board.save}
            idleHint={tab === "mark"}
            others={others}
            criteria={
              board.criteria && (
                <CriteriaButton
                  value={board.criteria}
                  flagged={flaggedCount}
                  total={total}
                  canEdit={data.canEditCriteria}
                  onChange={(c) => void board.saveCriteria(c)}
                />
              )
            }
          />
          <RecordedByLine data={board.recordedBy} date={date} homework={homework} />
          {total === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <p className="font-bold text-ink">Энэ ангид сурагч алга</p>
              <p className="mt-1 text-sm text-ink-dim">Сурагчдыг «Сурагчид» хэсгээс ангид нэмнэ</p>
            </div>
          ) : (
            <>
              <Tabs.Content value="monitor" className="space-y-3">
                <MonitorView
                  students={students}
                  names={names}
                  recs={recs}
                  flags={flags}
                  homework={homework}
                  topic={cls.lessons.map((l) => l.topic).find(Boolean) ?? null}
                  onlineData={onlineData}
                  online={online}
                  makeup={makeup}
                  sent={sentSet}
                  filter={filter}
                  onFilter={setFilter}
                  onDrawer={openDrawer}
                  footer={<OtherInfo classId={cls.id} classType={cls.type} date={date} canManage={canManage} />}
                />
              </Tabs.Content>
              <Tabs.Content value="mark">
                <MarkView
                  students={students}
                  names={names}
                  recs={recs}
                  flags={flags}
                  homework={homework}
                  upcoming={upcoming}
                  onlineTests={hasOnline}
                  online={online}
                  makeup={makeup}
                  sent={sentSet}
                  open={ui.open}
                  bulk={ui.bulk}
                  bulkBusy={bulkBusy}
                  presentCount={presentIds.length}
                  doneCount={doneIds.length}
                  hwSkipped={hwSkipped}
                  onBulkPresent={bulkPresent}
                  onUndoPresent={undoPresent}
                  onBulkDone={bulkDone}
                  onUndoDone={undoDone}
                  onToggle={onToggle}
                  onAtt={onAtt}
                  onRange={board.onRange}
                  onAttNote={board.onAttNote}
                  onHw={onHw}
                  onHwNote={board.onHwNote}
                  onDrawer={openDrawer}
                />
              </Tabs.Content>
            </>
          )}
        </div>
      </Tabs.Root>

      {drawer && (
        <StudentDrawer
          classId={cls.id}
          className={cls.name}
          studentId={drawer.id}
          name={names.get(drawer.id) ?? drawer.firstName}
          date={date}
          today={today}
          homework={homework}
          flags={flags.get(drawer.id) ?? []}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}
