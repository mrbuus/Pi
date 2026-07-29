"use client";

import { AlertTriangle, Calendar, Camera } from "lucide-react";
import { useRef, useState } from "react";
import { api, fileUrl, uploadFile } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

export interface HomeworkSubmission {
  state: string;
  note?: string | null;
  imageKeys?: string[];
  submittedAt?: string | null;
  checkedAt?: string | null;
}

export interface Homework {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  classroom: { name: string };
  myStatus: string;
  mySubmission: HomeworkSubmission | null;
}

const DAY_MS = 86_400_000;

function formatDue(dueDate: string | null | undefined, state: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
  const dateStr = due.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
  // Аль хэдийн шалгагдсан бол хугацаа өнгөрсөн ч анхааруулах шаардлагагүй
  const settled = state === "DONE_ONLINE" || state === "DONE_IN_CLASS";

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
  const [note, setNote] = useState(homework.mySubmission?.note ?? "");
  const [photoKeys, setPhotoKeys] = useState<string[]>(
    homework.mySubmission?.imageKeys ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const due = formatDue(homework.dueDate, homework.myStatus);
  const canSubmit =
    homework.myStatus === "NOT_DONE" || homework.myStatus === "RETURNED";
  const submission = homework.mySubmission;

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // ижил файлыг дахин сонгоход ч onChange дуудагдана
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      for (const file of files) {
        const { key } = await uploadFile(file);
        setPhotoKeys((keys) => [...keys, key]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Зураг оруулахад алдаа гарлаа",
      );
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(key: string) {
    setPhotoKeys((keys) => keys.filter((k) => k !== key));
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    const prevStatus = homework.myStatus;
    const prevSubmission = homework.mySubmission;
    // Optimistic update — сервер хариу өгөхөөс өмнө шууд "Илгээсэн" болгоно
    onUpdate({
      myStatus: "SUBMITTED",
      mySubmission: {
        state: "SUBMITTED",
        note,
        imageKeys: photoKeys,
        submittedAt: new Date().toISOString(),
        checkedAt: null,
      },
    });
    try {
      await api(`/assignments/${homework.id}/submit`, {
        method: "POST",
        body: { note: note || undefined, imageKeys: photoKeys },
      });
    } catch (err) {
      // Амжилтгүй бол өмнөх төлөв рүү буцааж, алдааг харуулна
      onUpdate({ myStatus: prevStatus, mySubmission: prevSubmission });
      setError(
        err instanceof Error
          ? err.message
          : "Илгээхэд алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-base font-semibold break-words">
          {homework.title}
        </p>
        <StatusBadge state={homework.myStatus} />
      </div>

      {homework.description && (
        <p className="mt-1.5 whitespace-pre-line text-sm text-ink-dim">
          {homework.description}
        </p>
      )}

      {due && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-sm ${
            due.urgent ? "font-medium text-error" : "text-ink-dim"
          }`}
        >
          {due.urgent ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Calendar className="h-4 w-4" aria-hidden="true" />
          )}
          {due.text}
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {canSubmit ? (
        <div className="mt-3 space-y-3">
          {homework.myStatus === "RETURNED" && submission?.note && (
            <div className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
              <span className="font-semibold">Багшийн тэмдэглэл: </span>
              {submission.note}
            </div>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor={`hw-note-${homework.id}`}
            >
              Тайлбар (заавал биш)
            </label>
            <textarea
              id={`hw-note-${homework.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Жишээ нь: 5-р бодлого дээр эргэлзсэн"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2.5 text-base outline-none focus:border-brand-bright"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Зураг (заавал биш)</p>
            <div className="flex flex-wrap gap-2">
              {photoKeys.map((key) => (
                <div
                  key={key}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl(key)}
                    alt="Хавсаргасан зураг"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(key)}
                    aria-label="Зураг устгах"
                    className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-error text-xs font-bold text-on-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-line text-ink-dim transition hover:border-brand-bright/50 disabled:opacity-60"
              >
                {uploading ? (
                  <span aria-hidden="true" className="text-lg">
                    …
                  </span>
                ) : (
                  <Camera className="h-5 w-5" aria-hidden="true" />
                )}
                <span className="text-[10px]">
                  {uploading ? "Ачаалж байна" : "Зураг нэмэх"}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={onPickPhotos}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || uploading}
            className="min-h-[44px] w-full rounded-lg bg-brand-bright px-4 py-2.5 text-base font-bold text-on-brand transition disabled:opacity-60"
          >
            {submitting
              ? "Илгээж байна…"
              : homework.myStatus === "RETURNED"
                ? "Дахин илгээх"
                : "Хийсэн гэж тэмдэглэх"}
          </button>
        </div>
      ) : (
        submission && (
          <div className="mt-3 space-y-2 rounded-lg border border-line bg-panel p-3 text-sm">
            {submission.note && (
              <p className="whitespace-pre-line">{submission.note}</p>
            )}
            {submission.imageKeys && submission.imageKeys.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {submission.imageKeys.map((key) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={key}
                    src={fileUrl(key)}
                    alt="Илгээсэн зураг"
                    className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
                  />
                ))}
              </div>
            )}
            {submission.submittedAt && (
              <p className="text-xs text-ink-dim">
                Илгээсэн: {new Date(submission.submittedAt).toLocaleString("mn-MN")}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
