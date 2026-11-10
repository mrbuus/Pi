"use client";

import { ArrowRightLeft, Trash2, UserPlus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import StudentCard from "@/components/TeacherDashboard/board/StudentCard";
import StudentDrawer from "@/components/TeacherDashboard/board/StudentDrawer";
import {
  ABSENCE_REASONS,
  EXCUSED_REASONS,
  HOMEWORK_REASONS,
  isReason,
  type AttendanceStatus,
  type DayRec,
  type HomeworkStatus,
  type LateRangeValue,
} from "@/components/TeacherDashboard/board/lib";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { api } from "@/lib/api";
import { rosterNames } from "@/lib/personName";
import StudentSearch from "./StudentSearch";
import { SKIP_TEXT, fullName, shortClass, type CreateResult, type SearchHit, type VisitView } from "./types";
import { useVisits } from "./useVisits";

const NO_FLAGS: string[] = [];

function recOf(v: VisitView): DayRec {
  return {
    att: v.attendance.status,
    lateRange: v.attendance.lateRange,
    attNote: v.attendance.note ?? "",
    hw: v.homework.status,
    hwNote: v.homework.note ?? "",
    attBy: null,
    hwBy: null,
  };
}

/**
 * Өөр ангиас нөхөж суусан сурагчид (эзэн 2026-11-08): зочилсон ангийн самбарын
 * ХАМГИЙН ДООР, энгийн сурагчийнхтай ИЖИЛ ирц/даалгаврын блоктой, «12-4 ангиас»
 * гэж тодорхой. Нэмэх товч «Үлдсэнийг нэг дор»-ын доор.
 */
export default function GuestSection({
  hostId,
  hostName,
  date,
  today,
  homework,
}: {
  hostId: string;
  hostName: string;
  date: string;
  today: string;
  homework: boolean;
}) {
  const g = useVisits(hostId, date);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const visits = useMemo(() => g.visits ?? [], [g.visits]);
  const byStudent = useMemo(() => new Map(visits.map((v) => [v.student.id, v])), [visits]);
  const names = useMemo(() => rosterNames(visits.map((v) => v.student)), [visits]);
  const future = date > today;

  const { patchLocal, save, saveTyped } = g;
  const onAtt = useCallback(
    (sid: string, v: AttendanceStatus | null) => {
      const visit = byStudent.get(sid);
      if (!visit) return;
      const note = visit.attendance.note ?? "";
      // Самбарын дүрэм: ирцийг арилгавал тэмдэглэл хамт; тасалсан/чөлөөтэй биш болбол шалтгааны чип арилна
      const clearNote =
        v === null ||
        (v !== "ABSENT" && v !== "EXCUSED" && (isReason(note, ABSENCE_REASONS) || isReason(note, EXCUSED_REASONS)));
      patchLocal(visit.id, (x) => ({
        ...x,
        attendance: {
          status: v,
          lateRange: v === "LATE" ? x.attendance.lateRange : null,
          note: clearNote ? null : x.attendance.note,
        },
      }));
      if (v === "LATE" || v === "ABSENT" || v === "EXCUSED") setOpen((o) => ({ ...o, [sid]: true }));
      void save(visit.id, { attStatus: v, ...(clearNote && v !== null && note ? { attNote: null } : {}) });
    },
    [byStudent, patchLocal, save],
  );
  const onRange = useCallback(
    (sid: string, r: LateRangeValue | null) => {
      const visit = byStudent.get(sid);
      if (!visit) return;
      patchLocal(visit.id, (x) => ({ ...x, attendance: { ...x.attendance, status: "LATE", lateRange: r } }));
      void save(visit.id, { attStatus: "LATE", lateRange: r });
    },
    [byStudent, patchLocal, save],
  );
  const onAttNote = useCallback(
    (sid: string, text: string, typed: boolean) => {
      const visit = byStudent.get(sid);
      if (!visit || visit.attendance.status === null) return;
      patchLocal(visit.id, (x) => ({ ...x, attendance: { ...x.attendance, note: text } }));
      const value = text.trim() === "" ? null : text;
      if (typed) saveTyped(visit.id, "attNote", value);
      else void save(visit.id, { attNote: value });
    },
    [byStudent, patchLocal, save, saveTyped],
  );
  const onHw = useCallback(
    (sid: string, v: HomeworkStatus | null) => {
      const visit = byStudent.get(sid);
      if (!visit) return;
      const clear = v !== "PARTIAL" && v !== "NOT_DONE" && isReason(visit.homework.note ?? "", HOMEWORK_REASONS);
      patchLocal(visit.id, (x) => ({ ...x, homework: { status: v, note: clear ? null : x.homework.note } }));
      if (v === "PARTIAL" || v === "NOT_DONE") setOpen((o) => ({ ...o, [sid]: true }));
      void save(visit.id, { hwStatus: v, ...(clear ? { hwNote: null } : {}) });
    },
    [byStudent, patchLocal, save],
  );
  const onHwNote = useCallback(
    (sid: string, text: string, typed: boolean) => {
      const visit = byStudent.get(sid);
      if (!visit) return;
      patchLocal(visit.id, (x) => ({ ...x, homework: { ...x.homework, note: text } }));
      const value = text.trim() === "" ? null : text;
      if (typed) saveTyped(visit.id, "hwNote", value);
      else void save(visit.id, { hwNote: value });
    },
    [byStudent, patchLocal, save, saveTyped],
  );
  const onToggle = useCallback((sid: string) => setOpen((o) => ({ ...o, [sid]: !o[sid] })), []);
  const noop = useCallback(() => {}, []);

  const remove = async (v: VisitView) => {
    setConfirmId(null);
    g.removeLocal(v.id);
    try {
      await api(`/makeup-visits/${encodeURIComponent(v.id)}`, { method: "DELETE" });
      toast.success(`${fullName(v.student)} хасагдлаа`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Хасаж чадсангүй");
      g.reload();
    }
  };

  const drawerVisit = drawerId ? byStudent.get(drawerId) : undefined;

  return (
    <section aria-label="Нөхөж суусан сурагчид" className="space-y-2">
      {visits.length > 0 && (
        <>
          <h2 className="flex items-center gap-1.5 px-1 pt-1 text-sm font-bold text-ink">
            <ArrowRightLeft className="size-4 text-brand" aria-hidden />
            Өөр ангиас нөхөж суусан
            <span className="font-normal tabular-nums text-ink-dim">({visits.length})</span>
          </h2>
          <ul className="space-y-2">
            {visits.map((v, i) => (
              <li key={v.id} className="rounded-xl border border-dashed border-brand-bright/60 bg-brand-bright/[0.04] p-1.5">
                <div className="flex min-h-10 items-center gap-2 px-1.5 pb-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-bright/50 bg-brand-bright/10 px-2 py-0.5 text-xs font-bold text-brand-soft">
                    <ArrowRightLeft className="size-3.5" aria-hidden />
                    {v.homeClassroom ? `${shortClass(v.homeClassroom.name)} ангиас` : "Ангигүй сурагч"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-dim">{fullName(v.student)}</span>
                  {confirmId === v.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void remove(v)}
                        className="inline-flex min-h-10 items-center rounded-lg bg-error/10 px-3 text-sm font-bold text-error hover:bg-error/15"
                      >
                        Хасах
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-ink hover:bg-ink/5"
                      >
                        Болих
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(v.id)}
                      aria-label={`${fullName(v.student)}-г жагсаалтаас хасах`}
                      title="Жагсаалтаас хасах"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <ul>
                  <StudentCard
                    id={v.student.id}
                    index={i + 1}
                    name={names.get(v.student.id) ?? v.student.firstName}
                    rec={recOf(v)}
                    flags={NO_FLAGS}
                    homework={homework}
                    onlineTests={false}
                    online={null}
                    makeup={null}
                    sent={false}
                    open={!!open[v.student.id]}
                    onToggle={onToggle}
                    onAtt={onAtt}
                    onRange={onRange}
                    onAttNote={onAttNote}
                    onHw={onHw}
                    onHwNote={onHwNote}
                    onDrawer={setDrawerId}
                    onOnline={noop}
                  />
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}

      {g.error && !g.visits && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          Нөхөж суусан сурагчдыг ачаалж чадсангүй.{" "}
          <button type="button" onClick={g.reload} className="font-bold underline">
            Дахин оролдох
          </button>
        </p>
      )}

      {future ? (
        <p className="px-1 text-xs text-ink-dim">Өөр ангиас нөхөж суусан сурагчийг хичээлийн өдөр нэмнэ</p>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand bg-surface px-4 text-sm font-bold text-brand-soft hover:bg-brand-bright/10 sm:min-h-11"
        >
          <UserPlus className="size-4" aria-hidden />
          Өөр ангиас нөхөж суусан сурагч нэмэх
        </button>
      )}

      <AddGuestSheet
        open={adding}
        onClose={() => setAdding(false)}
        hostId={hostId}
        hostName={hostName}
        date={date}
        added={new Set(visits.map((v) => v.student.id))}
        onAdded={g.add}
      />

      {drawerVisit && drawerVisit.homeClassroom && (
        <StudentDrawer
          classId={drawerVisit.homeClassroom.id}
          className={drawerVisit.homeClassroom.name}
          studentId={drawerVisit.student.id}
          name={names.get(drawerVisit.student.id) ?? drawerVisit.student.firstName}
          date={date}
          today={today}
          homework={homework}
          flags={NO_FLAGS}
          onClose={() => setDrawerId(null)}
        />
      )}
    </section>
  );
}

function AddGuestSheet({
  open,
  onClose,
  hostId,
  hostName,
  date,
  added,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  hostId: string;
  hostName: string;
  date: string;
  added: Set<string>;
  onAdded: (rows: VisitView[]) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const host = shortClass(hostName);

  const add = async (hit: SearchHit) => {
    setBusyId(hit.id);
    try {
      const r = await api<CreateResult>("/makeup-visits", {
        method: "POST",
        body: { date, hostClassroomId: hostId, studentIds: [hit.id] },
      });
      if (r.created.length) {
        onAdded(r.created);
        toast.success(`${fullName(hit)} нэмэгдлээ`);
      } else if (r.skipped[0]) toast.message(`${fullName(hit)}: ${SKIP_TEXT[r.skipped[0].reason]}`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Нэмж чадсангүй");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto h-[88dvh] w-full max-w-xl">
        <header className="border-b border-line px-4 pb-3 pt-2">
          <DrawerTitle className="cyrillic-heading text-lg font-bold text-ink">Нөхөж суусан сурагч нэмэх</DrawerTitle>
          <DrawerDescription className="mt-0.5 text-sm text-ink-dim">
            Өөр ангийн сурагч {host} ангийн хичээлд сууж нөхөж байна. Ижил нэртэй бол ангийг нь асууж сонгоно уу
          </DrawerDescription>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-vaul-no-drag>
          <StudentSearch
            added={added}
            busyId={busyId}
            onAdd={(h) => void add(h)}
            blocked={(h) => (h.classes.some((c) => c.id === hostId) ? `${host} ангийн сурагч` : null)}
          />
        </div>
        <footer className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-surface text-sm font-bold text-ink hover:bg-ink/5"
          >
            Болсон
          </button>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
