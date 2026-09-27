"use client";

import { BarChart3, CalendarRange, ClipboardList, type LucideIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/StateBlock";
import { useEffect, useState } from "react";
import { useSection } from "@/components/students/progress/useSection";
import { api, getRole } from "@/lib/api";
import BoardView from "./BoardView";
import TaskFormModal from "./TaskFormModal";
import TimelineView from "./TimelineView";
import WorkloadView from "./WorkloadView";
import type {
  ClassroomRef,
  StaffUser,
  SubTask,
  Task,
  TaskFilters,
  TaskStatus,
  WorkloadRow,
} from "./types";

type View = "board" | "timeline" | "workload";

const VIEW_TABS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: "board", label: "Багана", icon: ClipboardList },
  { value: "timeline", label: "Хугацаа", icon: CalendarRange },
  { value: "workload", label: "Ачаалал", icon: BarChart3 },
];

interface Me {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

function buildTaskQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.classroomId) params.set("classroomId", filters.classroomId);
  if (filters.subject) params.set("subject", filters.subject);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function PlannerClient() {
  const role = getRole();
  const canEditAll = role === "ADMIN" || role === "TEACHER_PLUS";

  const [me, setMe] = useState<Me | null>(null);
  const [view, setView] = useState<View>("board");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [filters, setFilters] = useState<TaskFilters>({});

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomRef[]>([]);

  const [actionError, setActionError] = useState<{ key: string; text: string } | null>(null);

  const [modal, setModal] = useState<{
    open: boolean;
    task?: Task | SubTask | null;
    parentTaskId?: string | null;
    parentTitle?: string;
  }>({ open: false });

  const [deleteTarget, setDeleteTarget] = useState<Task | SubTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const taskPath = `/tasks${buildTaskQuery(filters)}`;
  const tasksQuery = useSection<Task[]>(taskPath, []);
  const { data: tasks, setData: setTasks } = tasksQuery;
  const workloadQuery = useSection<WorkloadRow[]>(view === "workload" ? `/tasks/workload?from=${year}-01-01&to=${year}-12-31` : null, []);
  const workloadRows = workloadQuery.data;
  const loading = tasksQuery.status === "loading";
  const workloadLoading = workloadQuery.status === "loading";
  const error = (actionError?.key === taskPath ? actionError.text : null) || tasksQuery.error;
  const workloadError = workloadQuery.error;
  function setError(value: string | null) { setActionError(value ? { key: taskPath, text: value } : null); }
  function loadTasks() { setActionError(null); tasksQuery.reload(); }
  const loadWorkload = workloadQuery.reload;

  useEffect(() => {
    let alive = true;
    api<Me>("/auth/me").then(value => { if (alive) setMe(value); }).catch(() => {});
    api<StaffUser[]>("/tasks/staff-directory").then(value => { if (alive) setStaff(value); }).catch(() => {});
    api<ClassroomRef[]>("/classrooms").then(value => { if (alive) setClassrooms(value); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function handleStatusChange(task: Task | SubTask, status: TaskStatus) {
    // Өөдрөг шинэчлэл: дэлгэц дээр шууд харуулаад, амжилтгүй бол буцаана.
    const prevTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === task.id) return { ...t, status };
        if (t.subtasks.some((s) => s.id === task.id)) {
          return {
            ...t,
            subtasks: t.subtasks.map((s) => (s.id === task.id ? { ...s, status } : s)),
          };
        }
        return t;
      }),
    );
    try {
      await api(`/tasks/${task.id}`, { method: "PATCH", body: { status } });
    } catch (e) {
      setTasks(prevTasks);
      setError(errMsg(e));
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/tasks/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadTasks();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDeleting(false);
    }
  }

  const myUserId = me?.id ?? null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Ажилтны жилийн төлөвлөгч</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Жилийн ажлаа жижиг даалгавар болгон хуваан, хариуцагчаа оноож,
          ачааллыг тэнцвэржүүлээрэй.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-line bg-panel p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setView(tab.value)}
              aria-pressed={view === tab.value}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                view === tab.value
                  ? "bg-brand text-on-brand"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" aria-hidden /> {tab.label}
            </button>
          ))}
        </div>

        {canEditAll && (
          <button
            type="button"
            onClick={() => setModal({ open: true, task: null, parentTaskId: null })}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-on-brand"
          >
            + Шинэ даалгавар
          </button>
        )}
      </div>

      {view !== "workload" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-ink-dim">
            Ажилтнаар шүүх
            <select
              value={filters.assigneeId ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, assigneeId: e.target.value || undefined }))
              }
              className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Бүгд</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName} {s.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink-dim">
            Ангиар шүүх
            <select
              value={filters.classroomId ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, classroomId: e.target.value || undefined }))
              }
              className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Бүгд</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink-dim">
            Хичээлээр шүүх
            <select
              value={filters.subject ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  subject: (e.target.value || undefined) as TaskFilters["subject"],
                }))
              }
              className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Бүгд</option>
              <option value="MATH">Математик</option>
              <option value="SOCIAL_STUDIES">Нийгмийн ухаан</option>
            </select>
          </label>
        </div>
      )}

      {view === "board" && (
        <>
          {loading && (
            <LoadingState rows={3} label="Ачаалж байна" />
          )}
          {error && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              <span>{error}</span>
              <button
                onClick={loadTasks}
                className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
              >
                Дахин ачаалах
              </button>
            </div>
          )}
          {!loading && !error && (
            <BoardView
              tasks={tasks}
              myUserId={myUserId}
              canEditAll={canEditAll}
              onStatusChange={handleStatusChange}
              onEdit={(task) => setModal({ open: true, task, parentTaskId: task.parentTaskId })}
              onDelete={(task) => setDeleteTarget(task)}
              onAddSubtask={(parent) =>
                setModal({
                  open: true,
                  task: null,
                  parentTaskId: parent.id,
                  parentTitle: parent.title,
                })
              }
            />
          )}
        </>
      )}

      {view === "timeline" && (
        <>
          {loading && (
            <LoadingState rows={3} label="Ачаалж байна" />
          )}
          {!loading && <TimelineView tasks={tasks} year={year} onYearChange={setYear} />}
        </>
      )}

      {view === "workload" && (
        <>
          {workloadLoading && (
            <LoadingState rows={3} label="Ачаалж байна" />
          )}
          {workloadError && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              <span>workloadError</span>
              <button
                onClick={loadWorkload}
                className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
              >
                Дахин ачаалах
              </button>
            </div>
          )}
          {!workloadLoading && !workloadError && (
            <WorkloadView rows={workloadRows} year={year} onYearChange={setYear} />
          )}
        </>
      )}

      <TaskFormModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        onSaved={loadTasks}
        staff={staff}
        classrooms={classrooms}
        initial={modal.task}
        parentTaskId={modal.parentTaskId}
        parentTitle={modal.parentTitle}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center"
          >
            <p id="delete-task-title" className="text-lg font-bold text-ink">
              Даалгавар устгах уу?
            </p>
            <p className="mt-2 text-sm text-ink-dim">
              «{deleteTarget.title}» бүрмөсөн устана. Дэд даалгаврууд нь бие даасан
              даалгавар болж үлдэнэ.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-brand bg-brand/10 px-5 py-2.5 text-sm font-bold text-ink"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="rounded-lg bg-error px-6 py-2.5 text-sm font-bold text-on-error disabled:opacity-60"
              >
                {deleting ? "Устгаж байна…" : "Устгах"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
