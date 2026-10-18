"use client";

import { CalendarClock, CalendarPlus, CalendarX2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useSection } from "@/components/students/progress/useSection";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import AddSlotDialog from "./pattern/AddSlotDialog";
import {
  canManageAny,
  canManageClass,
  chainOf,
  isEffectiveOn,
  personName,
  plannedChanges,
  toSlot,
  weekdayOf,
  type ClassInfo,
  type Planned,
  type ScheduleAccess,
  type Slot,
  type TeacherOption,
} from "./pattern/model";
import PatternGrid from "./pattern/PatternGrid";
import PlannedChanges from "./pattern/PlannedChanges";
import SlotDialog from "./pattern/SlotDialog";
import { todayUBKey, type ScheduleEntry } from "./types";

interface ClassroomRow {
  id: string;
  name: string;
  teacher: { id: string; firstName: string; lastName: string } | null;
  _count?: { enrollments: number };
}

type Open = { kind: "slot"; slot: Slot; planned: Planned | null } | { kind: "add" } | null;

/**
 * 7 хоногийн ТОГТМОЛ хуваарь (эзэн 2026-10-18): аль анги аль гарагт хэдэн цагаас
 * аль танхимд орох нь 7 хоног бүр ижил тул ОГНООГҮЙ, нэг л тор — мөр = танхим
 * (Баруун 4 дээр, Зүүн 4 доор), багана = Да…Ня. Нүд = анги, цаг, сурагч/суудал.
 *
 * Зөвхөн өнөөдөр мөрдөгдөж буй мөрүүд торонд; ирээдүйн өөрчлөлт доорх
 * «Төлөвлөсөн өөрчлөлт»-д. `schedule.manage` эрхтэй (access) бол хичээл дээр
 * дарж засна, «Шинэ цаг нэмэх»; эрхгүй бол зөвхөн харна.
 *
 * access өгөөгүй (жишээ нь энгийн багшийн хуудас) эсвэл readOnly бол засах
 * боломж огт гарахгүй.
 */
export default function PatternOverview({
  readOnly = false,
  access,
}: {
  readOnly?: boolean;
  access?: ScheduleAccess | null;
}) {
  const manage = readOnly ? null : (access ?? null);
  const staffView = access !== undefined;
  const manager = canManageAny(manage);
  const [open, setOpen] = useState<Open>(null);

  const rowsQ = useSection<ScheduleEntry[]>("/schedule");
  const classesQ = useSection<ClassroomRow[]>("/classrooms");
  const teachersQ = useSection<TeacherOption[]>(manager ? "/schedule/teachers" : null, []);
  const today = todayUBKey();

  const classes = useMemo(() => {
    const m = new Map<string, ClassInfo>();
    for (const c of classesQ.data ?? []) {
      m.set(c.id, {
        id: c.id,
        name: c.name,
        students: c._count?.enrollments ?? null,
        teacherId: c.teacher?.id ?? null,
        teacherName: personName(c.teacher),
      });
    }
    return m;
  }, [classesQ.data]);

  const all = useMemo(() => {
    const rows = rowsQ.data ?? [];
    // Ажилтны харагдацад /classrooms нь архивлаагүй БҮХ ангийг өгдөг — архивын
    // ангийн мөрийг нууна. Энгийн багшид зөвхөн өөрийн анги ирдэг тул шүүхгүй.
    const filter = staffView && classesQ.status === "ready" && classes.size > 0;
    return rows.filter((r) => !filter || classes.has(r.classroomId)).map((r) => toSlot(r, classes));
  }, [rowsQ.data, staffView, classesQ.status, classes]);

  // seriesTo: «Өөрчлөлтийг цуцлах»-ын дараа цуврал ижил хоёр мөр болдог — дуусах огноог цувралаар
  const current = useMemo(
    () =>
      all
        .filter((s) => isEffectiveOn(s, today))
        .map((s) => (s.to ? { ...s, seriesTo: chainOf(s, all).at(-1)!.to } : s)),
    [all, today],
  );
  const planned = useMemo(() => plannedChanges(all, today), [all, today]);

  const canSelect = (s: Slot) => canManageClass(manage, s.classroomId);
  const classOptions = useMemo(
    () =>
      [...classes.values()]
        .filter((c) => canManageClass(manage, c.id))
        .sort((a, b) => a.name.localeCompare(b.name, "mn", { numeric: true })),
    [classes, manage],
  );

  function saved() {
    setOpen(null);
    rowsQ.reload();
  }

  if (rowsQ.data === undefined) {
    if (rowsQ.status === "error") return <ErrorState message={rowsQ.error} onRetry={rowsQ.reload} />;
    return <GridSkeleton />;
  }

  const classCount = new Set(current.map((s) => s.classroomId)).size;
  const hasEnding = current.some((s) => s.to);

  return (
    <div className="space-y-4">
      <section aria-labelledby="pattern-title" className="rounded-xl border border-line bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 id="pattern-title" className="cyrillic-heading text-sm font-bold text-ink">
              Танхимын 7 хоног
            </h2>
            <InfoHint label="Тогтмол хуваарийн тухай">
              7 хоног бүр ижил давтагддаг хуваарь. Тухайн өдрийн өөрчлөлт, сэдэв, багшийн оноолтыг «Өдрийн хуваарь»-аас харна
            </InfoHint>
            <span className="text-xs text-ink-dim">
              <Meta items={[`${current.length} хичээл`, `${classCount} анги`]} />
            </span>
          </div>
          {manager && (
            <Button size="sm" type="button" onClick={() => setOpen({ kind: "add" })}>
              <CalendarPlus aria-hidden />
              Шинэ цаг нэмэх
            </Button>
          )}
        </header>

        {rowsQ.status === "error" && (
          <div className="p-2">
            <ErrorState message={rowsQ.error} onRetry={rowsQ.reload} />
          </div>
        )}

        {current.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={CalendarX2}
              title="Мөрдөгдөж буй хуваарь алга"
              hint={manager ? "Анги бүрийн 7 хоногийн цагийг нэмбэл энд танхим, гарагаар харагдана" : "Хуваарь оруулсны дараа энд харагдана"}
            />
          </div>
        ) : (
          <PatternGrid
            slots={current}
            caption="Танхим бүрийн 7 хоногийн тогтмол хуваарь: анги, цаг, сурагч ба суудлын харьцаа"
            todayWeekday={weekdayOf(today)}
            showDayCounts
            today={today}
            onSelect={manager ? (slot) => setOpen({ kind: "slot", slot, planned: null }) : undefined}
            canSelect={canSelect}
          />
        )}

        {/* Тайлбар — хамгийн доор (эзний дүрэм) */}
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-3 py-2 text-xs text-ink-dim">
          <span>Нүд: цаг, анги, сурагч/суудал</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning">
            <TriangleAlert className="size-3.5" aria-hidden />
            Суудал дутсан
          </span>
          {hasEnding && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden />
              Дуусах огноотой
            </span>
          )}
          {manager && <span>Хичээл дээр дарж засна</span>}
        </footer>
      </section>

      <PlannedChanges
        items={planned}
        today={today}
        canSelect={(s) => manager && canSelect(s)}
        onSelect={(p) => setOpen({ kind: "slot", slot: p.slot, planned: p })}
      />

      {open?.kind === "slot" && (
        <SlotDialog
          key={open.slot.id}
          slot={open.slot}
          planned={open.planned}
          slots={all}
          classes={classes}
          teachers={teachersQ.data}
          today={today}
          onClose={() => setOpen(null)}
          onSaved={saved}
        />
      )}
      {open?.kind === "add" && (
        <AddSlotDialog
          classOptions={classOptions}
          slots={all}
          classes={classes}
          teachers={teachersQ.data}
          today={today}
          onClose={() => setOpen(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}

/** Ачаалж байх үеийн бодит бүтэц: толгой + танхим × 7 гараг */
function GridSkeleton() {
  return (
    <div role="status" aria-label="Хуваарь ачаалж байна" className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-8 w-32 rounded-xl" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }, (_, r) => (
          <div key={r} className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] gap-2">
            <div className="skeleton h-12" />
            {Array.from({ length: 7 }, (_, c) => (
              <div key={c} className="skeleton h-12" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Ачаалж байна</span>
    </div>
  );
}
