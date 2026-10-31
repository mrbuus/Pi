"use client";

import {
  BadgeCheck,
  Camera,
  ClipboardCheck,
  Clock,
  DoorOpen,
  History,
  Hourglass,
  Minus,
  MoreHorizontal,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useSection } from "@/components/students/progress/useSection";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { clockUB, dismissalOpen, NOTE_MAX, shiftClock, stampUB } from "@/components/lesson-records/types";
import RoomBadge from "../RoomBadge";
import { formatMinutes, WEEKDAY_LABELS } from "../types";
import { Excluded, roadOf } from "./RoadMap";
import TestPicker from "./TestPicker";
import TestProblems from "./TestProblems";
import { TeacherTag } from "./LessonRow";
import {
  DISMISS_LABEL,
  shortClass,
  type DayEntry,
  type DismissMode,
  type PlanContext,
  type TestInfo,
} from "./types";

interface Props {
  entry: DayEntry | null;
  date: string;
  today: string;
  tests: Record<string, TestInfo>;
  canPlan: boolean;
  canConfirm: boolean;
  onClose: () => void;
  /** Хадгалсны дараа өдрийг дахин ачаална */
  onSaved: () => void;
  /** «⋯» — танхим, цаг, зөөх, цуцлах (EntryActionPanel) */
  onMore: () => void;
  onHistory: () => void;
  onConfirm: () => void;
}

const chip =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50";

/**
 * Хичээлийн цонх: Багш+/Админ — төлөвлөгөө засна (тест, тарах/үлдэх,
 * тэмдэглэл, онолын зураг); Багш — зөвхөн харна (засах товч огт гарахгүй).
 */
export default function PlanDialog(props: Props) {
  const { entry } = props;
  return (
    <Drawer open={entry !== null} onOpenChange={(o) => !o && props.onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl" aria-describedby={undefined}>
        {entry && <Body key={`${entry.scheduleId}|${props.date}`} {...props} entry={entry} />}
      </DrawerContent>
    </Drawer>
  );
}

function Body(p: Props & { entry: DayEntry }) {
  const e = p.entry;
  const [menu, setMenu] = useState(false);
  const [dismissalOpenPanel, setDismissalOpenPanel] = useState(false);
  const weekday = WEEKDAY_LABELS[new Date(`${p.date}T00:00:00.000Z`).getUTCDay()];
  const canDismissal = (p.canPlan || e.mine) && dismissalOpen(p.date, p.today);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-2">
        <RoomBadge room={e.room} size="md" />
        <div className="min-w-0 flex-1">
          <DrawerTitle className="text-lg font-bold text-ink">{shortClass(e.classroomName)}</DrawerTitle>
          <p className="text-xs text-ink-dim">
            <Meta
              items={[
                `${weekday}, ${p.date.slice(5).replace("-", ".")}`,
                formatMinutes(e.startMinute),
                `${e.students} сурагч`,
              ]}
            />
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {e.leadTeacher && <TeacherTag who={e.leadTeacher} />}
            {e.assistantTeacher && <TeacherTag who={e.assistantTeacher} />}
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-label="Бусад үйлдэл"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
          >
            <MoreHorizontal className="size-5" aria-hidden />
          </button>
          {menu && (
            <div className="elev-2 absolute right-0 top-12 z-10 w-60 rounded-xl border border-line bg-surface p-1">
              <MenuItem icon={History} label="Ангийн хийсэн хичээлүүд" onClick={() => { setMenu(false); p.onHistory(); }} />
              {canDismissal && (
                <MenuItem icon={Clock} label="Тарсан цаг" onClick={() => { setMenu(false); setDismissalOpenPanel(true); }} />
              )}
              {p.canPlan && (
                <MenuItem
                  icon={Settings2}
                  label="Танхим, цаг, зөөх, цуцлах"
                  onClick={() => {
                    setMenu(false);
                    p.onMore();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </header>

      {dismissalOpenPanel && (
        <DismissalEditor entry={e} date={p.date} onDone={() => { setDismissalOpenPanel(false); p.onSaved(); }} onCancel={() => setDismissalOpenPanel(false)} />
      )}

      {p.canPlan ? <Editor {...p} /> : <ReadOnly {...p} />}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Clock; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ink hover:bg-ink/5"
    >
      <Icon className="size-4 text-ink-dim" aria-hidden />
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold text-ink-dim">{title}</h3>
      {children}
    </section>
  );
}

/** Багшид — төлөвлөгөө, өмнөх/хийсэн тест, тэмдэглэл, батламжийг ХАРНА */
function ReadOnly(p: Props & { entry: DayEntry }) {
  const e = p.entry;
  const { previous, today, doneToday, topics } = roadOf(e, p.tests);
  const testIds = [
    ...new Set(doneToday ? e.done.flatMap((d) => (d.testId ? [d.testId] : [])) : (e.plan?.testIds ?? [])),
  ];
  const line = (x: { key: string; full: string; excluded: number[] }) => (
    <li key={x.key} className="text-sm text-ink">
      {x.full}
      <Excluded numbers={x.excluded} />
    </li>
  );
  return (
    <div className="space-y-4 overflow-y-auto px-4 py-4 pb-8">
      {previous.length > 0 && (
        <Section title={`Өмнөх хичээл ${e.previous?.date.slice(5).replace("-", ".") ?? ""}`}>
          <ul className="space-y-0.5">{previous.map(line)}</ul>
        </Section>
      )}
      <Section title={doneToday ? "Хийсэн тест" : "Өнөөдрийн тест"}>
        {today.length || topics.length ? (
          <ul className="space-y-0.5">
            {today.map(line)}
            {topics.map((t) => (
              <li key={`topic-${t}`} className="text-sm text-ink">
                {t}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">{e.topic ?? "Төлөвлөөгүй"}</p>
        )}
      </Section>
      {testIds.length > 0 && (
        <Section title="Тестийн бодлогууд">
          <div className="space-y-2">
            {testIds.map((id) => (
              <TestProblems key={id} testId={id} label={p.tests[id]?.short ?? "Тест"} />
            ))}
          </div>
        </Section>
      )}
      {(e.plan?.dismissMode || e.plan?.photoStudent) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {e.plan?.dismissMode && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-info">
              {e.plan.dismissMode === "DISMISS" ? <DoorOpen className="size-4" aria-hidden /> : <Hourglass className="size-4" aria-hidden />}
              {DISMISS_LABEL[e.plan.dismissMode]}
            </span>
          )}
          {e.plan?.photoStudent && (
            <span className="inline-flex items-center gap-1.5 text-ink">
              <Camera className="size-4 text-ink-dim" aria-hidden />
              Онолын зураг: {e.plan.photoStudent.name}
            </span>
          )}
        </div>
      )}
      {e.note && (
        <Section title="Тэмдэглэл">
          <p className="whitespace-pre-wrap rounded-lg bg-bg px-3 py-2 text-sm text-ink">{e.note.body}</p>
          <p className="text-xs text-ink-dim">
            <Meta items={[e.note.updatedByName, stampUB(e.note.updatedAt)]} />
          </p>
        </Section>
      )}
      {e.record && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <BadgeCheck className="size-4" aria-hidden />
          <Meta items={[`${e.record.confirmedByName} баталсан`, stampUB(e.record.confirmedAt)]} />
        </p>
      )}
    </div>
  );
}

/** Багш+, Админ — төлөвлөгөө засах */
function Editor(p: Props & { entry: DayEntry }) {
  const e = p.entry;
  const ctx = useSection<PlanContext | null>(`/schedule/${e.scheduleId}/plan?date=${p.date}`, null);
  if (ctx.status === "error" && !ctx.data)
    return (
      <div className="p-4">
        <ErrorState message={ctx.error} onRetry={ctx.reload} />
      </div>
    );
  if (!ctx.data)
    return (
      <div className="p-4" aria-busy>
        <SkeletonRows rows={5} />
      </div>
    );
  return <EditorForm {...p} ctx={ctx.data} />;
}

function EditorForm(p: Props & { entry: DayEntry; ctx: PlanContext }) {
  const e = p.entry;
  const initial = {
    testIds: p.ctx.plan?.testIds ?? [],
    customTopics: p.ctx.plan?.customTopics ?? [],
    dismissMode: p.ctx.plan?.dismissMode ?? null,
    photoStudentId: p.ctx.plan?.photoStudentId ?? null,
    note: e.note?.body ?? "",
  };
  const [testIds, setTestIds] = useState<string[]>(initial.testIds);
  const [topics, setTopics] = useState<string[]>(initial.customTopics);
  const [dismissMode, setDismissMode] = useState<DismissMode | null>(initial.dismissMode);
  const [photo, setPhoto] = useState<string | null>(initial.photoStudentId);
  const [note, setNote] = useState(initial.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestion = p.ctx.roster.find((r) => r.id === p.ctx.photoSuggestion) ?? null;
  // Шинээр сонгосон тестийн нэр өдрийн хариунд байхгүй — нэрийг тусад нь авна
  const unknown = testIds.filter((id) => !p.tests[id]);
  const { data: extraTests } = useSection<{ testId: string; short: string }[]>(
    unknown.length ? `/schedule/plan-tests?ids=${unknown.join(",")}` : null,
    [],
  );
  const testName = (id: string) => p.tests[id]?.short ?? extraTests.find((t) => t.testId === id)?.short ?? "Тест";
  const planChanged =
    testIds.join() !== initial.testIds.join() ||
    dismissMode !== initial.dismissMode ||
    photo !== initial.photoStudentId ||
    topics.join("\n") !== initial.customTopics.join("\n");
  const noteChanged = note.trim() !== initial.note.trim();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (planChanged)
        await api(`/schedule/${e.scheduleId}/plan`, {
          method: "PUT",
          body: { date: p.date, testIds, customTopics: topics, dismissMode, photoStudentId: photo },
        });
      if (noteChanged)
        await api(`/lesson-records/${e.scheduleId}/note`, {
          method: "PUT",
          body: { date: p.date, body: note },
        });
      p.onSaved();
      p.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  const past = p.date <= p.today;
  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <Section title="Орох тест">
          <TestPicker
            classroomId={e.classroomId}
            date={p.date}
            selected={testIds}
            onChange={setTestIds}
            customTopics={topics}
            onCustomTopicsChange={setTopics}
          />
        </Section>

        {testIds.length > 0 && (
          <Section title="Тестийн бодлогууд">
            <div className="space-y-2">
              {testIds.map((id) => (
                <TestProblems key={id} testId={id} label={testName(id)} />
              ))}
            </div>
          </Section>
        )}

        <Section title="Хичээлийн дараа">
          <div role="radiogroup" aria-label="Хичээлийн дараа" className="inline-flex rounded-xl border border-line bg-bg p-1">
            {([null, "DISMISS", "STAY"] as const).map((m) => (
              <button
                key={m ?? "none"}
                type="button"
                role="radio"
                aria-checked={dismissMode === m}
                onClick={() => setDismissMode(m)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition",
                  dismissMode === m ? "bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink",
                )}
              >
                {m === "DISMISS" && <DoorOpen className="size-4" aria-hidden />}
                {m === "STAY" && <Hourglass className="size-4" aria-hidden />}
                {m ? DISMISS_LABEL[m] : "Сонгоогүй"}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Онолын зураг илгээх сурагч">
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Онолын зураг илгээх сурагч</span>
              <select
                value={photo ?? ""}
                onChange={(ev) => setPhoto(ev.target.value || null)}
                className="min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-sm"
              >
                <option value="">— сонгоогүй —</option>
                {p.ctx.roster.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            {suggestion && photo !== suggestion.id && (
              <button type="button" onClick={() => setPhoto(suggestion.id)} className={cn(chip, "border-line bg-panel text-ink hover:border-brand")}>
                <Camera className="size-4 text-brand-soft" aria-hidden />
                Ээлж: {suggestion.name}
              </button>
            )}
          </div>
        </Section>

        <Section title="Тэмдэглэл">
          <label htmlFor={`plan-note-${e.scheduleId}`} className="sr-only">
            Тэмдэглэл
          </label>
          {/* Ирцийн самбарын дээд талын тэмдэглэлтэй НЭГ бичлэг (LessonNote) — тэнд шууд харагдана */}
          <textarea
            id={`plan-note-${e.scheduleId}`}
            value={note}
            maxLength={NOTE_MAX}
            rows={2}
            onChange={(ev) => setNote(ev.target.value.slice(0, NOTE_MAX))}
            placeholder="Ирцийн самбарын дээд хэсэгт багш нарт харагдана"
            className="field-sizing-content block min-h-16 w-full resize-none overflow-x-hidden rounded-lg border border-line bg-bg p-2.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
          {note.length > NOTE_MAX - 60 && (
            <p className={cn("text-right text-xs tabular-nums", note.length >= NOTE_MAX ? "text-warning" : "text-ink-dim")}>
              {note.length}/{NOTE_MAX}
            </p>
          )}
        </Section>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {error && (
          <p role="alert" className="w-full rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        {past && p.canConfirm && (
          <button
            type="button"
            onClick={p.onConfirm}
            className={cn(chip, "border-line bg-panel text-ink hover:border-success hover:text-success")}
          >
            {e.record ? <BadgeCheck className="size-4 text-success" aria-hidden /> : <ClipboardCheck className="size-4" aria-hidden />}
            {e.record ? "Батлагдсан" : "Батлах"}
          </button>
        )}
        <button type="button" onClick={p.onClose} className={cn(chip, "ml-auto border-line bg-panel text-ink")}>
          Болих
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy || (!planChanged && !noteChanged)}
          className={cn(chip, "border-brand-bright bg-brand-bright text-on-brand")}
        >
          {busy ? "Хадгалж байна" : "Хадгалах"}
        </button>
      </footer>
    </>
  );
}

/** Тарсан цаг (/app/dismissal-тай нэг бичлэг) — сүүлийн сурагчийн цаг, тайлбарыг дарахгүй */
function DismissalEditor({
  entry,
  date,
  onDone,
  onCancel,
}: {
  entry: DayEntry;
  date: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [clock, setClock] = useState(entry.dismissalAt ? clockUB(entry.dismissalAt) : formatMinutes(entry.endMinute));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      const path = `/learning-lab/classrooms/${entry.classroomId}/dismissal?date=${date}`;
      const prev = await api<{ lastLeftAt: string | null; note: string | null } | null>(path);
      await api(path, {
        method: "PUT",
        body: {
          approximateTime: clock,
          ...(prev?.lastLeftAt ? { lastLeftTime: clockUB(prev.lastLeftAt) } : {}),
          ...(prev?.note ? { note: prev.note } : {}),
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }
  const small = "inline-flex size-11 items-center justify-center rounded-lg border border-line bg-panel";
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-bg px-4 py-3">
      <Clock className="size-4 text-ink-dim" aria-hidden />
      <span className="mr-1 text-sm font-semibold">Тарсан цаг</span>
      <button type="button" onClick={() => setClock((c) => shiftClock(c, -10))} aria-label="10 минут хасах" className={small}>
        <Minus className="size-4" aria-hidden />
      </button>
      <label htmlFor={`dis-${entry.scheduleId}`} className="sr-only">
        Тарсан цаг
      </label>
      <input
        id={`dis-${entry.scheduleId}`}
        type="time"
        value={clock}
        onChange={(ev) => ev.target.value && setClock(ev.target.value)}
        className="min-h-11 rounded-lg border border-line bg-surface px-2 font-mono text-sm"
      />
      <button type="button" onClick={() => setClock((c) => shiftClock(c, 10))} aria-label="10 минут нэмэх" className={small}>
        <Plus className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onCancel} aria-label="Болих" className={cn(small, "ml-auto")}>
        <X className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={save} disabled={busy || !clock} className={cn(chip, "border-brand-bright bg-brand-bright text-on-brand")}>
        Хадгалах
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
