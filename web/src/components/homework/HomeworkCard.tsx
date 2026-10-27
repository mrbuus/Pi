"use client";
import {
  AlertTriangle,
  Calendar,
  ImagePlus,
  RotateCcw,
  X,
  LoaderCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { api, uploadFile } from "@/lib/api";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { StatusBadge } from "./StatusBadge";
import AttachmentPreview from "./AttachmentPreview";
import SubmissionRecord, {
  type SubmissionRecordData,
} from "./SubmissionRecord";
import { formatMnDate } from "@/lib/dateMn";
import { Meta } from "@/components/ui/Meta";
import {
  LessonLabel,
  extraTitle,
  lessonWeekday,
  type HomeworkLesson,
} from "./LessonLabel";
export type HomeworkSubmission = SubmissionRecordData;
export interface Homework {
  canSubmit?: boolean;
  deletedAt?: string | null;
  id: string;
  title: string;
  description?: string | null;
  imageKeys?: string[];
  dueDate?: string | null;
  classroom: { name: string; type: "IN_PERSON" | "ONLINE" };
  /** Даалгавар өгсөн хичээл (анги + өдөр) ба сэдэв — эзэн 2026-10-27 */
  lesson?: HomeworkLesson | null;
  myStatus: string;
  mySubmission: HomeworkSubmission | null;
}
interface PendingFile {
  id: string;
  file: File;
  state: "waiting" | "uploading" | "failed";
  error?: string;
}
const DAY_MS = 86_400_000;

function formatDue(dueDate: string | null | undefined, state: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
  const dateStr = formatMnDate(due, {
    month: "short",
    day: "numeric",
  });
  // Аль хэдийн шалгагдсан бол хугацаа өнгөрсөн ч анхааруулах шаардлагагүй
  const settled =
    state === "DONE_ONLINE" ||
    state === "DONE_IN_CLASS" ||
    state === "SUBMITTED";

  if (diffDays < 0) {
    return settled
      ? { text: `Хугацаа: ${dateStr}`, urgent: false }
      : { text: `Хугацаа өнгөрсөн (${dateStr})`, urgent: true };
  }
  if (diffDays === 0) {
    return { text: `Өнөөдөр дуусна (${dateStr})`, urgent: !settled };
  }
  if (diffDays === 1) {
    return { text: `Маргааш дуусна (${dateStr})`, urgent: false };
  }
  return { text: `Хугацаа: ${dateStr}`, urgent: false };
}

export default function HomeworkCard({
  homework,
  onUpdate,
}: {
  homework: Homework;
  onUpdate: (patch: Partial<Homework>) => void;
}) {
  const [note, setNote] = useState(
    homework.mySubmission?.studentNote ??
      (homework.mySubmission?.checkedAt
        ? ""
        : (homework.mySubmission?.note ?? "")),
  );
  const [photoKeys, setPhotoKeys] = useState<string[]>(
    homework.mySubmission?.imageKeys ?? [],
  );
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const uploadLock = useRef(false);
  const submitLock = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    homework.canSubmit !== false &&
    (homework.myStatus === "NOT_DONE" || homework.myStatus === "RETURNED");
  const due = formatDue(
    homework.dueDate,
    homework.canSubmit === false ? "DONE_IN_CLASS" : homework.myStatus,
  );

  async function uploadBatch(batch: PendingFile[]) {
    if (uploadLock.current || !batch.length) return;
    uploadLock.current = true;
    setUploading(true);
    try {
      for (const entry of batch) {
        setPending((list) =>
          list.map((p) =>
            p.id === entry.id
              ? { ...p, state: "uploading", error: undefined }
              : p,
          ),
        );
        let validationMessage = "";
        try {
          if (!/\.(jpe?g|png|gif|webp|heic|pdf)$/i.test(entry.file.name)) {
            validationMessage =
              "JPG, PNG, GIF, WEBP, HEIC зураг эсвэл PDF файл сонгоорой.";
            throw new Error(validationMessage);
          }
          if (entry.file.size > 25 * 1024 * 1024) {
            validationMessage =
              "Файл 25 МБ-аас их байна. Жижигрүүлээд дахин сонгоорой.";
            throw new Error(validationMessage);
          }
          const { key } = await uploadFile(entry.file, { purpose: "homework" });
          setPhotoKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
          setPending((list) => list.filter((p) => p.id !== entry.id));
        } catch {
          setPending((list) =>
            list.map((p) =>
              p.id === entry.id
                ? {
                    ...p,
                    state: "failed",
                    error:
                      validationMessage ||
                      (navigator.onLine
                        ? "Файл байршсангүй. Дахин оролдоорой."
                        : "Холболт тасарсан. Сүлжээ ормогц дахин оролдоорой."),
                  }
                : p,
            ),
          );
        }
      }
    } finally {
      uploadLock.current = false;
      setUploading(false);
    }
  }
  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const batch = Array.from(e.target.files ?? []).map((file) => ({
      id: crypto.randomUUID(),
      file,
      state: "waiting" as const,
    }));
    e.target.value = "";
    if (!batch.length || uploadLock.current) return;
    if (photoKeys.length + pending.length + batch.length > 10) {
      setError("Хамгийн ихдээ 10 файл хавсаргана. Хэрэггүй файлаа хасаад дахин сонгоорой.");
      return;
    }
    setPending((list) => [...list, ...batch]);
    setError("");
    void uploadBatch(batch);
  }
  async function submit() {
    if (submitLock.current || uploadLock.current || pending.length) return;
    submitLock.current = true;
    setSubmitting(true);
    setError("");
    try {
      const saved = await api<HomeworkSubmission>(
        `/assignments/${homework.id}/submit`,
        {
          method: "POST",
          body: { note: note.trim() || undefined, imageKeys: photoKeys },
        },
      );
      onUpdate({ myStatus: saved.state, mySubmission: saved });
    } catch {
      setError(
        navigator.onLine
          ? "Илгээлт баталгаажсангүй. Тайлбар, хавсралтаа хадгалж үлдээсэн тул дахин илгээж болно."
          : "Холболт тасарсан. Энэ хуудсаа нээлттэй байлгаад сүлжээ ормогц дахин илгээгээрэй.",
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          className="cyrillic-heading min-w-0 flex-1 break-words text-base font-semibold"
          title={homework.lesson?.label}
        >
          <LessonLabel lesson={homework.lesson} fallback={homework.title} />
        </h3>
        <StatusBadge state={homework.myStatus} />
      </div>
      <div className="mt-1 text-xs text-ink-dim">
      <Meta
        items={[
          lessonWeekday(homework.lesson),
          homework.classroom.name,
          homework.canSubmit === false
            ? homework.deletedAt
              ? "архивласан даалгавар"
              : "өмнөх ангийн түүх"
            : null,
        ]}
      />
      </div>
      {extraTitle(homework.title, homework.lesson) && (
        <p className="mt-2 break-words text-sm font-medium text-ink">
          <MathText>{extraTitle(homework.title, homework.lesson) ?? ""}</MathText>
        </p>
      )}
      {homework.description && (
        <p className="mt-2 whitespace-pre-line text-sm text-ink-dim">
          <MathText>{homework.description}</MathText>
        </p>
      )}
      {!!homework.imageKeys?.length && (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
            Даалгаврын хавсралт ({homework.imageKeys.length})
          </summary>
          <div className="flex flex-wrap gap-3">
            {homework.imageKeys.map((key, i) => (
              <AttachmentPreview
                key={key}
                fileKey={key}
                label={`Багшийн хавсралт ${i + 1}`}
              />
            ))}
          </div>
        </details>
      )}
      {due && (
        <p
          className={`mt-2 flex items-center gap-2 text-sm ${due.urgent ? "text-error" : "text-ink-dim"}`}
        >
          {due.urgent ? (
            <AlertTriangle className="h-4 w-4" aria-hidden />
          ) : (
            <Calendar className="h-4 w-4" aria-hidden />
          )}
          {due.text}
        </p>
      )}
      {homework.mySubmission && (
        <div className="mt-4 border-t border-line pt-3">
          <SubmissionRecord submission={homework.mySubmission} />
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error"
        >
          {error}
        </p>
      )}
      {canSubmit && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label
            className="block text-sm font-medium"
            htmlFor={`hw-note-${homework.id}`}
          >
            Сурагчийн тайлбар (заавал биш)
          </label>
          <textarea
            id={`hw-note-${homework.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            rows={2}
            placeholder="Жишээ нь: 5-р бодлого дээр эргэлзсэн"
            className="w-full rounded-lg border border-line bg-panel p-3 text-base focus-visible:outline-brand"
          />
          <div className="flex flex-wrap gap-3">
            {photoKeys.map((key, i) => (
              <div key={key} className="space-y-1">
                <AttachmentPreview fileKey={key} label={`Хавсралт ${i + 1}`} />
                <button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() =>
                    setPhotoKeys((keys) => keys.filter((k) => k !== key))
                  }
                  aria-label={`Хавсралт ${i + 1}-ийг илгээлтээс хасах`}
                  className="inline-flex min-h-11 items-center gap-1 text-xs text-error disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Хасах
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={uploading || submitting}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden /> Зураг, PDF нэмэх
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,application/pdf,.heic"
            multiple
            className="hidden"
            onChange={pickFiles}
          />
          <p className="text-xs text-ink-dim">
            Нэг файл 25 МБ хүртэл. Байршуулсан хавсралтаа доорх товчоор багшид
            илгээнэ.
          </p>
          {!!pending.length && (
            <ul className="space-y-2" aria-live="polite">
              {pending.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-line p-3 text-sm"
                >
                  <p className="break-all font-medium">{entry.file.name}</p>
                  <p
                    className={`mt-1 ${entry.state === "failed" ? "text-error" : "text-ink-dim"}`}
                  >
                    {entry.state === "failed"
                      ? entry.error
                      : entry.state === "uploading"
                        ? "Байршуулж байна…"
                        : "Дараалалд байна…"}
                  </p>
                  {entry.state === "failed" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={uploading}
                        onClick={() => void uploadBatch([entry])}
                      >
                        <RotateCcw aria-hidden />
                        Дахин оролдох
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={uploading}
                        onClick={() =>
                          setPending((list) =>
                            list.filter((p) => p.id !== entry.id),
                          )
                        }
                      >
                        Хасах
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || uploading || !!pending.length}
            className="w-full"
          >
            {submitting && (
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
            )}
            {submitting
              ? "Илгээж байна…"
              : homework.myStatus === "RETURNED"
                ? "Дахин илгээх"
                : "Багшид илгээх"}
          </Button>
          {!!pending.length && (
            <p className="text-xs text-ink-dim">
              Амжилтгүй файлаа дахин байршуулах эсвэл хасаад илгээнэ.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
