"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";
import { ArrowRightLeft, MoreHorizontal, RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import ExamDialog from "@/components/exams/ExamDialog";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import ChangeClassDialog from "./ChangeClassDialog";
import { errMsg } from "./types";

/**
 * Сурагчийн үйлдлүүд (Багш+/Админ, эзэн 2026-10-18): анги солих, сургалтаас
 * хасах, сэргээх. Сурагчийн жагсаалт, хувийн хуудас, ангийн «Сурагчид» табд
 * НЭГ ижил цонхыг ашиглана.
 */

const FIELD =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand";
const ITEM =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink outline-none data-[highlighted]:bg-ink/5";

export interface StudentRef {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  _count?: { enrollments: number };
}

const REASONS = ["Сургалтаа орхисон", "Өөр сургалтад шилжсэн", "Төлбөр", "Давхар бүртгэл"];

/** «Сургалтаас хасах» — шалтгаан заавал; идэвхтэй анги хаагдаж, түүх хэвээр үлдэнэ. */
export function RemoveFromTrainingDialog({
  student,
  onClose,
  onDone,
}: {
  student: StudentRef;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ready = reason.trim().length >= 3;

  async function submit() {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      await api(`/users/${encodeURIComponent(student.id)}/archive`, { method: "POST", body: { reason: reason.trim() } });
      toast.success(`${student.name} сургалтаас хасагдлаа`);
      onDone();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title="Сургалтаас хасах"
      description={student.name}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Болих
          </Button>
          <Button variant="danger" type="button" disabled={!ready || saving} onClick={() => void submit()}>
            <UserMinus aria-hidden /> {saving ? "Хасаж байна" : "Хасах"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-dim">
          Ангийн жагсаалт, самбараас гарна, нэвтрэх эрх хаагдана. Ирц, дүнгийн түүх хадгалагдана. «Архив» хэсгээс хэдийд ч сэргээнэ
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Шалтгааны санал">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="min-h-9 rounded-full border border-line px-3 text-sm text-ink-dim transition hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              {r}
            </button>
          ))}
        </div>
        <label className="block text-sm text-ink-dim">
          <span className="mb-1 block">Шалтгаан</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            rows={2}
            autoFocus
            className={`${FIELD} py-2`}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </ExamDialog>
  );
}

/** «Сэргээх» — буцаах ангиа сонгоно (сүүлд байсан анги урьдчилан сонгогдоно). */
export function RestoreStudentDialog({
  student,
  lastClassId,
  onClose,
  onDone,
}: {
  student: StudentRef;
  lastClassId?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<ClassOption[]>("/classrooms")
      .then((rows) => {
        if (!alive) return;
        setClasses([...rows].sort((a, b) => a.name.localeCompare(b.name, "mn", { numeric: true })));
      })
      .catch(() => alive && (setClasses([]), setError("Ангиудыг ачаалж чадсангүй, ангигүйгээр сэргээж болно")));
    return () => {
      alive = false;
    };
  }, []);

  // Сонголт хийгээгүй бол сүүлийн анги (идэвхтэй хэвээр бол)
  const chosen = target ?? (lastClassId && classes?.some((c) => c.id === lastClassId) ? lastClassId : "");

  async function submit() {
    if (saving || !classes) return;
    setSaving(true);
    setError("");
    try {
      await api(`/users/${encodeURIComponent(student.id)}/unarchive`, {
        method: "POST",
        body: chosen ? { classroomId: chosen } : {},
      });
      const name = classes.find((c) => c.id === chosen)?.name;
      toast.success(name ? `${student.name} — ${name} ангид сэргээгдлээ` : `${student.name} сэргээгдлээ`);
      onDone();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title="Сургалтад сэргээх"
      description={student.name}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Болих
          </Button>
          <Button type="button" disabled={!classes || saving} onClick={() => void submit()}>
            <RotateCcw aria-hidden /> {saving ? "Сэргээж байна" : "Сэргээх"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm text-ink-dim">
          <span className="mb-1 block">Буцаах анги</span>
          <select
            value={chosen}
            onChange={(e) => setTarget(e.target.value)}
            disabled={!classes}
            className={FIELD}
          >
            <option value="">Ангид оноохгүй (дараа хуваарилна)</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c._count ? ` (${c._count.enrollments} сурагч)` : ""}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </ExamDialog>
  );
}

type Open = "move" | "remove" | "restore" | null;

/** Мөр бүрийн «⋯» цэс. Идэвхтэй: Анги солих, Сургалтаас хасах. Архивд: Сэргээх. */
export function StudentActionsMenu({
  student,
  archived = false,
  currentClassId = null,
  lastClassId = null,
  onChanged,
  className,
}: {
  student: StudentRef;
  archived?: boolean;
  currentClassId?: string | null;
  lastClassId?: string | null;
  onChanged: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`${student.name} — үйлдэл`}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand ${className ?? ""}`}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="elev-2 z-[65] w-56 rounded-xl border border-line bg-surface p-1">
            {archived ? (
              <DropdownMenu.Item className={ITEM} onSelect={() => setOpen("restore")}>
                <RotateCcw className="h-4 w-4 text-ink-dim" aria-hidden /> Сэргээх
              </DropdownMenu.Item>
            ) : (
              <>
                <DropdownMenu.Item className={ITEM} onSelect={() => setOpen("move")}>
                  <ArrowRightLeft className="h-4 w-4 text-ink-dim" aria-hidden /> Анги солих
                </DropdownMenu.Item>
                <DropdownMenu.Item className={`${ITEM} text-error`} onSelect={() => setOpen("remove")}>
                  <UserMinus className="h-4 w-4" aria-hidden /> Сургалтаас хасах
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {open === "move" && (
        <ChangeClassDialog
          studentId={student.id}
          studentName={student.name}
          currentClassId={currentClassId}
          onClose={close}
          onChanged={onChanged}
        />
      )}
      {open === "remove" && <RemoveFromTrainingDialog student={student} onClose={close} onDone={onChanged} />}
      {open === "restore" && (
        <RestoreStudentDialog student={student} lastClassId={lastClassId} onClose={close} onDone={onChanged} />
      )}
    </>
  );
}
