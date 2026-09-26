"use client";

import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, uploadFile } from "@/lib/api";
import TeacherHomeworkCalendar, { ubDateKey, ubToday } from "./TeacherHomeworkCalendar";
import TeacherHomeworkFrequencyPanel from "./TeacherHomeworkFrequencyPanel";
import TeacherHomeworkTestCard from "./TeacherHomeworkTestCard";

/* ============================================================================
 * ОНЛАЙН ангийн гэрийн даалгавар (Assignment + Submission).
 *
 * Эзний шийдвэр (2026-09-26): даалгавар 2 загвартай. Танхимын анги нь
 * AssignmentsSection (Хийсэн / Дутуу / Хийгээгүй), онлайн анги нь энэ хэсэг:
 * багш даалгавар өгнө → сурагч зураг илгээнэ → багш Батлах / Буцаана.
 *
 * Хуанли, карт, давтамжийн самбар нь өмнө нь бэлэн байсан ч ямар ч хуудсанд
 * холбогдоогүй байсан — энд угсарч, дутуу байсан «үүсгэх», «засах»,
 * «устгах»-ыг нэмэв.
 * ========================================================================== */

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  createdAt: string;
  _count?: { submissions: number };
}

interface RosterRow {
  student: { id: string; firstName: string; lastName: string };
  state: string;
  note: string | null;
}

type Status = "loading" | "ready" | "error";

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand";

export default function OnlineHomeworkSection({ classroomId }: { classroomId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState(ubToday());
  const [openId, setOpenId] = useState<string | null>(null);
  const [rosters, setRosters] = useState<Record<string, RosterRow[]>>({});
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let alive = true;
    api<Assignment[]>(`/classrooms/${classroomId}/assignments`)
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [classroomId, tick]);

  function reload() {
    setStatus("loading");
    setError("");
    setTick((t) => t + 1);
  }

  const loadRoster = useCallback(async (id: string) => {
    const rows = await api<RosterRow[]>(`/assignments/${id}/submissions`);
    setRosters((r) => ({ ...r, [id]: rows }));
  }, []);

  async function toggle(id: string) {
    setActionError("");
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    try {
      await loadRoster(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Илгээлтүүдийг ачаалж чадсангүй");
    }
  }

  async function review(assignmentId: string, studentId: string, action: string) {
    setActionError("");
    try {
      await api(`/assignments/${assignmentId}/review`, {
        method: "POST",
        body: JSON.stringify({ studentId, action }),
      });
      await loadRoster(assignmentId);
      setTick((t) => t + 1); // «N илгээсэн» тоог шинэчилнэ
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    }
  }

  const dayItems = useMemo(
    () => items.filter((a) => ubDateKey(a.createdAt) === selectedDate),
    [items, selectedDate],
  );

  return (
    <section className="space-y-5">
      <CreateAssignmentForm
        classroomId={classroomId}
        onCreated={(a) => {
          setItems((list) => [a, ...list]);
          setSelectedDate(ubDateKey(a.createdAt));
        }}
      />

      {status === "loading" && <LoadingState rows={4} label="Даалгаврууд" />}
      {status === "error" && <ErrorState message={error} onRetry={reload} />}

      {status === "ready" && (
        <>
          <TeacherHomeworkCalendar
            assignments={items}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {actionError && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
              {actionError}
            </p>
          )}

          {dayItems.length === 0 ? (
            <EmptyState
              title="Энэ өдөр даалгавар өгөөгүй"
              hint="Хуанлиас өөр өдөр сонгох, эсвэл дээрх маягтаар шинэ даалгавар өгнө үү."
            />
          ) : (
            <div className="space-y-3">
              {dayItems.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <TeacherHomeworkTestCard
                    assignment={a}
                    isOpen={openId === a.id}
                    submissions={rosters[a.id] ?? []}
                    onToggle={() => void toggle(a.id)}
                    onReview={(studentId, action) => void review(a.id, studentId, action)}
                  />
                  <AssignmentActions
                    assignment={a}
                    onChanged={(patch) =>
                      setItems((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)))
                    }
                    onDeleted={() => setItems((list) => list.filter((x) => x.id !== a.id))}
                  />
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && <TeacherHomeworkFrequencyPanel assignments={items} />}
        </>
      )}
    </section>
  );
}

/* ---------------- Үүсгэх маягт ---------------- */
function CreateAssignmentForm({
  classroomId,
  onCreated,
}: {
  classroomId: string;
  onCreated: (a: Assignment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setFiles([]);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Гарчиг бичнэ үү");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const imageKeys: string[] = [];
      for (const f of files) imageKeys.push((await uploadFile(f)).key);
      const created = await api<Assignment>(`/classrooms/${classroomId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          imageKeys: imageKeys.length ? imageKeys : undefined,
        }),
      });
      onCreated(created);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-bright px-4 text-sm font-semibold text-on-brand transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Шинэ даалгавар өгөх
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 chunky p-4">
      <h3 className="font-bold">Шинэ даалгавар</h3>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Гарчиг</span>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Тайлбар</span>
        <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Хугацаа</span>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Зураг</span>
          <span className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 text-ink-dim">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {files.length ? `${files.length} зураг сонгосон` : "Зураг хавсаргах"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </span>
        </label>
      </div>
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-lg bg-brand-bright px-4 text-sm font-semibold text-on-brand disabled:opacity-60"
        >
          {busy ? "Хадгалж байна" : "Өгөх"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-ink-dim"
        >
          Болих
        </button>
      </div>
    </form>
  );
}

/* ---------------- Засах / устгах ---------------- */
function AssignmentActions({
  assignment,
  onChanged,
  onDeleted,
}: {
  assignment: Assignment;
  onChanged: (patch: Partial<Assignment>) => void;
  onDeleted: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "edit" | "delete">("idle");
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim()) {
      setError("Гарчиг хоосон байж болохгүй");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/assignments/${assignment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      onChanged({ title: title.trim(), description: description.trim() || null });
      setMode("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/assignments/${assignment.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Устгаж чадсангүй");
      setBusy(false);
    }
  }

  const smallBtn =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink-dim transition hover:border-brand hover:text-ink disabled:opacity-60";

  return (
    <div className="space-y-2 pl-1">
      {mode === "idle" && (
        <div className="flex gap-2">
          <button type="button" className={smallBtn} onClick={() => setMode("edit")}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Засах
          </button>
          <button type="button" className={smallBtn} onClick={() => setMode("delete")}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Устгах
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Гарчиг" />
          <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Тайлбар" />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="min-h-9 rounded-lg bg-brand-bright px-3 text-xs font-semibold text-on-brand disabled:opacity-60">
              Хадгалах
            </button>
            <button type="button" onClick={() => setMode("idle")} className={smallBtn}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Болих
            </button>
          </div>
        </div>
      )}

      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-error/30 bg-error/5 p-3 text-sm">
          <span className="text-error">Энэ даалгавар болон илгээлтүүдийг устгах уу?</span>
          <button type="button" disabled={busy} onClick={() => void remove()} className="min-h-9 rounded-lg border border-error/40 px-3 text-xs font-semibold text-error disabled:opacity-60">
            Тийм, устга
          </button>
          <button type="button" onClick={() => setMode("idle")} className={smallBtn}>
            Үгүй
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
