"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CalendarX2, ChevronLeft, ChevronRight, Eye, Info, PencilLine } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "../shell/status";
import DateStrip, { type YearMonth } from "../shell/DateStrip";
import {
  CLASSES,
  DEFAULT_CRITERIA,
  ME,
  addDays,
  classById,
  dayRecord,
  fromKey,
  latestLessonDayKey,
  lessonDays,
  lessonOn,
  todayKey,
  type AttStatus,
  type Criteria,
  type DayRecord,
  type DemoClass,
  type HwStatus,
  type LateRange,
  type RiskFlag,
} from "../world";
import ClassPicker from "./ClassPicker";
import CriteriaButton from "./CriteriaButton";
import DayNotes from "./DayNotes";
import DeadlineButton from "./DeadlineButton";
import MarkView, { type BulkState } from "./MarkView";
import { nowTime, seedComments, seedNotes, type Comment, type Note } from "./mock";
import MonitorView, { type FilterKey } from "./MonitorView";
import {
  EMPTY_DEADLINES,
  attPatch,
  dayLabel,
  deadlineStamp,
  editKey,
  hasNote,
  hwPatch,
  initialTab,
  isLateSubmission,
  needsDetail,
  editSignatures,
  rememberTab,
  riskCached,
  ruleFor,
  shortDay,
  useAutosave,
  type DeadlineRule,
  type DeadlineState,
  type Edits,
  type Patch,
  type SaveApi,
  type Tab,
} from "./store";
import StudentDrawer from "./StudentDrawer";
import SubmissionViewer from "./SubmissionViewer";
import SummaryBar from "./SummaryBar";

const DEFAULT_CLASS = "c121";
/** Засваргүй ангид тогтвортой хоосон объект (memo-г дэмий шинэчлэхгүй) */
const NO_EDITS: Edits = {};

/**
 * Багшийн самбар (демо): Ирц ба даалгавар. Өгөгдөл бүгд world.ts-ээс, цаг
 * хамааралтай тул зөвхөн хөтөчид зурна (сервер дээр бүтцийн араг яс).
 */
export interface BoardLink {
  classId: string | null;
  date: string | null;
}

/**
 * `link` = хуудасны `?class=&date=` (page.tsx серверээс уншина). Link-ээр зөөлөн
 * шилжихэд ч зөв анги/өдөр нээгдэхийн тулд page.tsx `key`-ээр шинээр mount хийнэ.
 */
export default function TeacherBoard({ link }: { link: BoardLink }) {
  return (
    <ClientOnly fallback={<BoardSkeleton />}>
      <BoardRoot link={link} />
    </ClientOnly>
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3">
      <div className="skeleton h-11 w-64 rounded-xl" />
      <div className="skeleton h-[118px] rounded-xl sm:h-[86px]" />
      <div className="skeleton h-12 rounded-xl" />
      <div className="skeleton h-11 w-56 rounded-lg" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
  );
}

/* ───────── Анги солигдоход ч хадгалагдах өгөгдөл ───────── */

function BoardRoot({ link }: { link: BoardLink }) {
  const [classId, setClassId] = useState(() => (link.classId && classById(link.classId) ? link.classId : DEFAULT_CLASS));
  const cls = classById(classId) ?? CLASSES[0];

  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [criteria, setCriteria] = useState<Record<string, Criteria>>({});
  const [deadlines, setDeadlines] = useState<Record<string, DeadlineState>>({});
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [tab, setTab] = useState<Tab>(() => initialTab(lessonOn(cls, todayKey())?.status === "now"));
  const save = useAutosave();

  const changeTab = useCallback(
    (t: Tab) => {
      setTab(t);
      rememberTab(lessonOn(cls, todayKey())?.status === "now", t);
    },
    [cls],
  );

  const setClassEdits = useCallback(
    (fn: (prev: Edits) => Edits) => setEdits((all) => ({ ...all, [cls.id]: fn(all[cls.id] ?? {}) })),
    [cls.id],
  );

  return (
    <ClassBoard
      key={cls.id}
      cls={cls}
      initialDate={cls.id === link.classId ? link.date : null}
      onClass={setClassId}
      edits={edits[cls.id] ?? NO_EDITS}
      setEdits={setClassEdits}
      criteria={criteria[cls.id] ?? DEFAULT_CRITERIA}
      setCriteria={(c) => {
        setCriteria((all) => ({ ...all, [cls.id]: c }));
        save.sendLater(`criteria|${cls.id}`);
      }}
      deadlines={deadlines[cls.id] ?? EMPTY_DEADLINES}
      setDeadlines={(d) => {
        setDeadlines((all) => ({ ...all, [cls.id]: d }));
        save.send(1);
      }}
      notesFor={(dateKey) => notes[`${cls.id}|${dateKey}`] ?? seedNotes(cls, lessonOn(cls, dateKey))}
      addNote={(dateKey, text) => {
        const k = `${cls.id}|${dateKey}`;
        setNotes((all) => ({
          ...all,
          [k]: [...(all[k] ?? seedNotes(cls, lessonOn(cls, dateKey))), { id: `n${Date.now()}`, text, author: ME.name, time: nowTime() }],
        }));
        save.send(1);
      }}
      commentsFor={(dateKey, sid) => {
        const s = cls.students.find((x) => x.id === sid);
        return comments[`${dateKey}|${sid}`] ?? (s ? seedComments(dateKey, s) : []);
      }}
      addComment={(dateKey, sid, text) => {
        const k = `${dateKey}|${sid}`;
        const s = cls.students.find((x) => x.id === sid);
        setComments((all) => ({
          ...all,
          [k]: [...(all[k] ?? (s ? seedComments(dateKey, s) : [])), { id: `c${Date.now()}`, from: "teacher", author: ME.name, text, time: nowTime() }],
        }));
        save.send(1);
      }}
      tab={tab}
      onTab={changeTab}
      save={save}
    />
  );
}

/* ───────── Нэг ангийн самбар ───────── */

interface Ui {
  /** Энэ өдрийн нээлттэй тайлбарууд: «auto» = төлөв сонгоход өөрөө нээгдсэн */
  open: Record<string, "auto" | "manual">;
  bulk: BulkState;
}
const EMPTY_UI: Ui = { open: {}, bulk: { att: [], hw: [] } };

const without = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids);

function nextOpen(open: Ui["open"], id: string, rec: DayRecord, wantsOpen: boolean): Ui["open"] {
  if (wantsOpen) return open[id] ? open : { ...open, [id]: "auto" };
  if (open[id] === "auto" && !needsDetail(rec) && !hasNote(rec)) {
    const rest = { ...open };
    delete rest[id];
    return rest;
  }
  return open;
}

function nearestLesson(cls: DemoClass, from: string, dir: 1 | -1): string | null {
  for (let i = 1, k = addDays(from, dir); i <= 21; i++, k = addDays(k, dir)) if (lessonOn(cls, k)) return k;
  return null;
}

interface ClassBoardProps {
  cls: DemoClass;
  initialDate: string | null;
  onClass: (id: string) => void;
  edits: Edits;
  setEdits: (fn: (prev: Edits) => Edits) => void;
  criteria: Criteria;
  setCriteria: (c: Criteria) => void;
  deadlines: DeadlineState;
  setDeadlines: (d: DeadlineState) => void;
  notesFor: (dateKey: string) => Note[];
  addNote: (dateKey: string, text: string) => void;
  commentsFor: (dateKey: string, studentId: string) => Comment[];
  addComment: (dateKey: string, studentId: string, text: string) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
  save: SaveApi;
}

function ClassBoard({
  cls,
  initialDate,
  onClass,
  edits,
  setEdits,
  criteria,
  setCriteria,
  deadlines,
  setDeadlines,
  notesFor,
  addNote,
  commentsFor,
  addComment,
  tab,
  onTab,
  save,
}: ClassBoardProps) {
  const students = cls.students;
  const total = students.length;
  const { send, sendLater } = save;
  const [today] = useState(todayKey);
  const [date, setDate] = useState(() => initialDate ?? latestLessonDayKey(cls, today));
  const [view, setView] = useState<YearMonth>(() => {
    const d = fromKey(initialDate ?? latestLessonDayKey(cls, today));
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [ui, setUi] = useState<Ui>(EMPTY_UI);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const lesson = useMemo(() => lessonOn(cls, date), [cls, date]);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  /* Бүртгэл = world.dayRecord + багшийн засвар */
  const recordOf = useCallback(
    (dateKey: string, s: (typeof students)[number]): DayRecord => {
      const base = dayRecord(cls, dateKey, s);
      const p = edits[editKey(dateKey, s.id)];
      return p ? { ...base, ...p } : base;
    },
    [cls, edits],
  );
  const records = useMemo(() => new Map(students.map((s) => [s.id, recordOf(date, s)])), [students, recordOf, date]);
  const flags = useMemo(() => {
    const sigs = editSignatures(edits);
    return new Map<string, RiskFlag[]>(students.map((s) => [s.id, riskCached(cls, s, criteria, recordOf, sigs.get(s.id) ?? "")]));
  }, [cls, students, criteria, recordOf, edits]);
  const flaggedCount = useMemo(() => [...flags.values()].filter((f) => f.length > 0).length, [flags]);

  /* Хугацаа ба хоцорсон илгээлт */
  const { rule, recurring } = ruleFor(deadlines, date);
  const stamp = lesson ? deadlineStamp(rule, date, lesson.slot) : null;
  const lateIds = useMemo(
    () => new Set(students.filter((s) => isLateSubmission(records.get(s.id)?.submission ?? null, stamp)).map((s) => s.id)),
    [students, records, stamp],
  );
  const submitters = useMemo(() => students.filter((s) => records.get(s.id)?.submission), [students, records]);

  /* Товшилт бүр — хамгийн сүүлийн засварыг event дотор уншина (callback тогтвортой, карт дахин зурагдахгүй) */
  const latest = useRef({ edits, date });
  useLayoutEffect(() => {
    latest.current = { edits, date };
  });

  const current = useCallback(
    (id: string): DayRecord | null => {
      const s = byId.get(id);
      if (!s) return null;
      const { edits: e, date: d } = latest.current;
      const base = dayRecord(cls, d, s);
      const p = e[editKey(d, id)];
      return p ? { ...base, ...p } : base;
    },
    [cls, byId],
  );

  const apply = useCallback(
    (changes: Array<[string, Patch]>) => {
      const d = latest.current.date;
      const next = { ...latest.current.edits };
      for (const [id, patch] of changes) next[editKey(d, id)] = { ...next[editKey(d, id)], ...patch };
      latest.current = { ...latest.current, edits: next };
      setEdits((prev) => {
        const out = { ...prev };
        for (const [id, patch] of changes) out[editKey(d, id)] = { ...out[editKey(d, id)], ...patch };
        return out;
      });
    },
    [setEdits],
  );

  const onAtt = useCallback(
    (id: string, v: AttStatus | null) => {
      const cur = current(id);
      if (!cur) return;
      const patch = attPatch(cur, v);
      apply([[id, patch]]);
      send(1);
      const rec = { ...cur, ...patch };
      const wants = v === "late" || v === "absent" || v === "excused";
      setUi((u) => ({ open: nextOpen(u.open, id, rec, wants), bulk: { ...u.bulk, att: without(u.bulk.att, id) } }));
    },
    [current, apply, send],
  );

  const onHw = useCallback(
    (id: string, v: HwStatus | null) => {
      const cur = current(id);
      if (!cur) return;
      const patch = hwPatch(cur, v);
      apply([[id, patch]]);
      send(1);
      const rec = { ...cur, ...patch };
      const wants = v === "partial" || v === "missing";
      setUi((u) => ({ open: nextOpen(u.open, id, rec, wants), bulk: { ...u.bulk, hw: without(u.bulk.hw, id) } }));
    },
    [current, apply, send],
  );

  const onRange = useCallback(
    (id: string, r: LateRange | null) => {
      apply([[id, { lateRange: r }]]);
      send(1);
    },
    [apply, send],
  );

  /** typed = гараар бичиж байна (зогссоны дараа хадгална); эс бөгөөс чип (шууд) */
  const onAttNote = useCallback(
    (id: string, text: string, typed: boolean) => {
      apply([[id, { attNote: text }]]);
      if (typed) sendLater(`att|${latest.current.date}|${id}`);
      else send(1);
    },
    [apply, send, sendLater],
  );
  const onHwNote = useCallback(
    (id: string, text: string, typed: boolean) => {
      apply([[id, { hwNote: text }]]);
      if (typed) sendLater(`hw|${latest.current.date}|${id}`);
      else send(1);
    },
    [apply, send, sendLater],
  );

  const onToggle = useCallback((id: string) => {
    setUi((u) => {
      const open = { ...u.open };
      if (open[id]) delete open[id];
      else open[id] = "manual";
      return { ...u, open };
    });
  }, []);

  /* Бөөнөөр: зөвхөн тэмдэглээгүй нүд; дараа нь гараар өөрчилсөн нүдийг буцаахгүй */
  const presentIds = students.filter((s) => records.get(s.id)?.att === null).map((s) => s.id);
  const doneIds = students
    .filter((s) => {
      const r = records.get(s.id);
      return r && r.hw === null && (r.att === "present" || r.att === "late");
    })
    .map((s) => s.id);
  const hwSkipped = students.filter((s) => {
    const r = records.get(s.id);
    return r && r.hw === null && r.att !== "present" && r.att !== "late";
  }).length;

  const bulkPresent = () => {
    if (!presentIds.length) return;
    apply(presentIds.map((id) => [id, { att: "present" }]));
    send(presentIds.length);
    setUi((u) => ({ ...u, bulk: { ...u.bulk, att: presentIds } }));
  };
  const undoPresent = () => {
    const ids = ui.bulk.att;
    apply(ids.map((id) => [id, { att: null }]));
    send(ids.length);
    setUi((u) => ({ ...u, bulk: { ...u.bulk, att: [] } }));
  };
  const bulkDone = () => {
    if (!doneIds.length) return;
    apply(doneIds.map((id) => [id, { hw: "done" }]));
    send(doneIds.length);
    setUi((u) => ({ ...u, bulk: { ...u.bulk, hw: doneIds } }));
  };
  const undoDone = () => {
    const ids = ui.bulk.hw;
    apply(ids.map((id) => [id, { hw: null }]));
    send(ids.length);
    setUi((u) => ({ ...u, bulk: { ...u.bulk, hw: [] } }));
  };

  /* Огноо: солигдоход нээлттэй тайлбар, бөөнөөр буцаах хоёр шинэчлэгдэнэ */
  const pickDate = useCallback((key: string) => {
    const d = fromKey(key);
    setDate(key);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setUi(EMPTY_UI);
    setViewerId(null);
  }, []);

  const saveDeadline = (next: DeadlineRule, rec: boolean) => {
    const byDay = { ...deadlines.byDay };
    delete byDay[date];
    if (next.mode === "custom" && rec) setDeadlines({ byDay, recurring: next });
    else if (next.mode === "custom") setDeadlines({ byDay: { ...byDay, [date]: next }, recurring: recurring ? null : deadlines.recurring });
    else setDeadlines({ byDay, recurring: recurring ? null : deadlines.recurring });
  };

  const present = students.filter((s) => records.get(s.id)?.att === "present").length;
  const done = students.filter((s) => records.get(s.id)?.hw === "done").length;

  const openViewer = useCallback((id: string) => setViewerId(id), []);
  const openDrawer = useCallback((id: string) => setDrawerId(id), []);

  const viewer = viewerId ? byId.get(viewerId) : undefined;
  const viewerPos = viewer ? submitters.findIndex((s) => s.id === viewer.id) : -1;
  const drawer = drawerId ? byId.get(drawerId) : undefined;

  const slot = lesson?.slot ?? null;
  const prevLesson = lesson ? null : nearestLesson(cls, date, -1);
  const nextLesson = lesson ? null : nearestLesson(cls, date, 1);
  const hasHomework = !!lesson?.homework;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">Ирц ба даалгавар</h1>
      <div className="flex items-center gap-2">
        <ClassPicker classes={CLASSES} value={cls.id} onChange={onClass} />
        <span
          title="Зохиомол өгөгдөл: хадгалалт дуурайлга, хуудсыг дахин ачаалахад анхны төлөвтөө буцна"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-bright/30 bg-brand-bright/10 px-2.5 py-1 text-xs font-semibold text-brand-soft"
        >
          <Info className="size-3.5" aria-hidden />
          Демо
        </span>
      </div>

      {/* shell/DateStrip-ийн footer мөр order-гүй тул эхэнд гарч байна — энд доод мөр болгоно */}
      <div className="[&>nav>div:last-child]:order-last [&>nav>div:last-child]:basis-full">
        <DateStrip
          todayKey={today}
          lessonDays={lessonDays(cls)}
          selectedKey={date}
          view={view}
          onView={setView}
          onSelect={pickDate}
          footer={
            slot ? (
              <span className="font-semibold tabular-nums text-ink">
                {slot.start}–{slot.end}, {slot.room}
              </span>
            ) : (
              <span>Хичээлгүй өдөр</span>
            )
          }
        />
      </div>

      <DayNotes notes={notesFor(date)} onAdd={(text) => addNote(date, text)} />

      <Tabs.Root value={tab} onValueChange={(v) => onTab(v as Tab)}>
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

        {lesson ? (
          <div className="mt-3 space-y-3">
            <SummaryBar
              present={present}
              done={hasHomework ? done : null}
              submitted={hasHomework ? submitters.length : null}
              total={total}
              pending={save.pending}
              savedAt={save.savedAt}
              idleHint={tab === "mark"}
              deadline={hasHomework ? <DeadlineButton rule={rule} recurring={recurring} slot={lesson.slot} onSave={saveDeadline} /> : null}
              criteria={<CriteriaButton value={criteria} flagged={flaggedCount} total={total} onChange={setCriteria} />}
            />
            <Tabs.Content value="monitor" className="space-y-3">
              <MonitorView
                cls={cls}
                lesson={lesson}
                students={students}
                records={records}
                flags={flags}
                lateIds={lateIds}
                filter={filter}
                onFilter={setFilter}
                onDrawer={openDrawer}
                onViewer={openViewer}
              />
            </Tabs.Content>
            <Tabs.Content value="mark">
              <MarkView
                lesson={lesson}
                students={students}
                records={records}
                flags={flags}
                lateIds={lateIds}
                open={ui.open}
                bulk={ui.bulk}
                presentCount={presentIds.length}
                doneCount={doneIds.length}
                hwSkipped={hwSkipped}
                onBulkPresent={bulkPresent}
                onUndoPresent={undoPresent}
                onBulkDone={bulkDone}
                onUndoDone={undoDone}
                onToggle={onToggle}
                onAtt={onAtt}
                onRange={onRange}
                onAttNote={onAttNote}
                onHw={onHw}
                onHwNote={onHwNote}
                onViewer={openViewer}
                onDrawer={openDrawer}
              />
            </Tabs.Content>
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-8 text-center">
            <CalendarX2 className="size-8 text-ink-dim" aria-hidden />
            <div>
              <p className="font-bold text-ink">{dayLabel(date)}, хичээлгүй өдөр</p>
              <p className="mt-1 text-sm text-ink-dim">{cls.name} ангийн хичээл энэ өдөр ороогүй</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {prevLesson && (
                <button
                  type="button"
                  onClick={() => pickDate(prevLesson)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-ink/5 sm:min-h-9"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Өмнөх хичээл, {shortDay(prevLesson)}
                </button>
              )}
              {nextLesson && (
                <button
                  type="button"
                  onClick={() => pickDate(nextLesson)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-ink/5 sm:min-h-9"
                >
                  Дараагийн хичээл, {shortDay(nextLesson)}
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        )}
      </Tabs.Root>

      {viewer && lesson && viewerPos >= 0 && (
        <SubmissionViewer
          cls={cls}
          lesson={lesson}
          student={viewer}
          rec={records.get(viewer.id) ?? null}
          position={viewerPos}
          total={submitters.length}
          late={lateIds.has(viewer.id)}
          deadline={stamp}
          onHw={(v) => onHw(viewer.id, v)}
          comments={commentsFor(date, viewer.id)}
          onComment={(text) => addComment(date, viewer.id, text)}
          onPrev={viewerPos > 0 ? () => setViewerId(submitters[viewerPos - 1].id) : null}
          onNext={viewerPos < submitters.length - 1 ? () => setViewerId(submitters[viewerPos + 1].id) : null}
          onClose={() => setViewerId(null)}
        />
      )}

      {drawer && (
        <StudentDrawer
          cls={cls}
          student={drawer}
          today={today}
          selectedKey={date}
          flags={flags.get(drawer.id) ?? []}
          recordOf={recordOf}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}

