"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";

type Row = {
  rowNumber: number;
  lastName: string;
  firstName: string;
  phone: string;
  guardianPhone: string;
  classroomLabel: string;
  status: "NEW" | "UPDATE" | "ERROR";
  reason: string | null;
};
type Preview = { previewId: string; rows: Row[] };
type CommitResponse = { imported: number };
const BATCH_SIZE = 100;

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryMode, setRetryMode] = useState<"inspect" | "commit">("inspect");
  const [message, setMessage] = useState("");

  async function inspect() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(null);
    setMessage("");
    setRetryMode("inspect");
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api<Preview>("/users/students/import/preview", {
        method: "POST",
        body: form,
      });
      setPreview(result);
      setSelected(
        result.rows
          .filter((row) => row.status !== "ERROR")
          .map((row) => row.rowNumber),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Файлыг уншиж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!preview || !selected.length) return;
    setBusy(true);
    setError(null);
    setMessage("");
    setRetryMode("commit");
    let completed = 0;
    try {
      for (let offset = 0; offset < selected.length; offset += BATCH_SIZE) {
        const rowNumbers = selected.slice(offset, offset + BATCH_SIZE);
        const result = await api<CommitResponse>(
          "/users/students/import/commit",
          {
            method: "POST",
            body: { previewId: preview.previewId, rowNumbers },
          },
        );
        completed += result.imported;
      }
      setMessage(`${completed} мөр хадгаллаа.`);
      setPreview(null);
      setFile(null);
      setSelected([]);
    } catch (cause) {
      const details =
        cause instanceof Error ? cause.message : "Импорт амжилтгүй боллоо.";
      setError(
        completed
          ? `${details} Энэ оролдлогоор ${completed}/${selected.length} мөрийн багцын хариу авсан. Дахин оролдоход амжилттай багцууд давхар бүртгэгдэхгүй.`
          : details,
      );
    } finally {
      setBusy(false);
    }
  }

  const retry = retryMode === "commit" ? commit : inspect;
  const counts = preview?.rows.reduce(
    (total, row) => ({ ...total, [row.status]: total[row.status] + 1 }),
    { NEW: 0, UPDATE: 0, ERROR: 0 },
  );

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <Link
        href="/app/admin/students"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"
      >
        <ArrowLeft size={16} aria-hidden /> Сурагчийн жагсаалт
      </Link>
      <header>
        <h1 className="text-2xl font-extrabold text-ink">
          Excel-ээс сурагч оруулах
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Овог, Нэр, Утас багана шаардлагатай. Эцэг эхийн утас, Анги/Түвшин
          сонголттой. Нууц үг сурагчийн утас болно. Архивлагдсан бүртгэлийг
          эхлээд сэргээнэ үү.
        </p>
      </header>

      <section className="space-y-3 chunky p-4">
        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="flex-1 text-sm">
            {file?.name ?? ".xlsx файл сонгох (5 MB хүртэл)"}
          </span>
          <input
            type="file"
            className="sr-only"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setError(null);
              setMessage("");
            }}
          />
        </label>
        <button
          type="button"
          disabled={!file || busy}
          onClick={inspect}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-on-brand disabled:opacity-50"
        >
          <Upload size={16} aria-hidden /> Урьдчилан харах
        </button>
        {busy && <LoadingState rows={2} label="Боловсруулж байна" />}
        {error && <ErrorState message={error} onRetry={() => void retry()} />}
        {message && (
          <p
            role="status"
            className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm"
          >
            {message}
          </p>
        )}
      </section>

      {preview && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Шалгасан мөрүүд</h2>
              <p className="text-sm text-ink-dim">
                Шинэ {counts?.NEW}, шинэчлэх {counts?.UPDATE}, алдаа{" "}
                {counts?.ERROR}. Урьдчилан харах 15 минут хүчинтэй.
              </p>
              <p className="mt-1 text-sm text-ink-dim">
                {selected.length} мөрийг 100 хүртэл мөрийн жижиг багцаар
                дараалуулан хадгална. Хэсэгчилсэн алдааны дараа ижил preview-г
                дахин оролдоход өмнө амжилттай хадгалсан багцыг давтахгүй.
              </p>
            </div>
            <button
              type="button"
              disabled={busy || !selected.length}
              onClick={commit}
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-on-brand disabled:opacity-50"
            >
              {busy ? "Хадгалж байна…" : `${selected.length} мөр хадгалах`}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-panel text-xs text-ink-dim">
                <tr>
                  {["Сонгох", "Мөр", "Нэр", "Утас", "Анги", "Төлөв"].map(
                    (label) => (
                      <th className="p-3" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className="border-t border-line align-top"
                  >
                    <td className="p-3">
                      <input
                        aria-label={`${row.rowNumber}-р мөр`}
                        type="checkbox"
                        disabled={row.status === "ERROR" || busy}
                        checked={selected.includes(row.rowNumber)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, row.rowNumber]
                              : current.filter(
                                  (number) => number !== row.rowNumber,
                                ),
                          )
                        }
                      />
                    </td>
                    <td className="p-3">{row.rowNumber}</td>
                    <td className="p-3">
                      {row.lastName} {row.firstName}
                    </td>
                    <td className="p-3">{row.phone}</td>
                    <td className="p-3">{row.classroomLabel || "—"}</td>
                    <td className="p-3">
                      <span
                        className={
                          row.status === "ERROR"
                            ? "font-semibold text-error"
                            : "font-semibold text-ink"
                        }
                      >
                        {row.status === "NEW"
                          ? "Шинэ"
                          : row.status === "UPDATE"
                            ? "Шинэчлэх"
                            : "Алдаа"}
                      </span>
                      {row.reason && (
                        <p className="mt-1 text-xs text-error">{row.reason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
