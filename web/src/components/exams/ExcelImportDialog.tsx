"use client";

import { useState } from "react";
import { FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import ExamDialog from "./ExamDialog";
import { errorText, type ExcelPreview, type PreviewStatus } from "./types";

const STATUS: Record<PreviewStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  READY: { label: "Бэлэн", tone: "success" },
  EMPTY: { label: "Бүх нүд хоосон", tone: "warning" },
  ABSENT: { label: "Ирээгүй", tone: "info" },
  TOTAL_ONLY: { label: "Зөвхөн нийт оноо", tone: "warning" },
  LOCKED: { label: "Онлайнаар өгсөн", tone: "neutral" },
  UNMATCHED: { label: "Сурагч олдсонгүй", tone: "danger" },
  AMBIGUOUS: { label: "Нэр давхцсан", tone: "danger" },
  DUPLICATE: { label: "Давхардсан мөр", tone: "danger" },
};

export interface ImportedRow {
  studentId: string;
  wrong: string[];
  absent: boolean;
}

/**
 * Эзний «Багшийн анги» Excel-ийг уншиж урьдчилан харуулна → «Хүснэгтэд
 * буулгах» дармагц дүн шивэх торонд хадгалаагүй өөрчлөлт болж орно (дараа нь
 * «Хадгалах»). Онлайнаар өгсөн, тулгагдаагүй мөрийг алгасна.
 */
export default function ExcelImportDialog({
  open,
  onOpenChange,
  testId,
  classroomId,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  classroomId: string;
  onApply: (rows: ImportedRow[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [includeEmpty, setIncludeEmpty] = useState(false);

  async function load(target: File, sheet?: string) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", target);
      const query = new URLSearchParams({ classroomId, ...(sheet ? { sheet } : {}) });
      setPreview(
        await api<ExcelPreview>(`/exams/${encodeURIComponent(testId)}/gradebook/excel?${query}`, {
          method: "POST",
          body: form,
        }),
      );
    } catch (e) {
      setPreview(null);
      setError(errorText(e, "Excel файлыг уншиж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  function reset(next: boolean) {
    if (!next) {
      setFile(null);
      setPreview(null);
      setError("");
      setIncludeEmpty(false);
    }
    onOpenChange(next);
  }

  const applicable = (preview?.rows ?? []).filter(
    (r) =>
      r.studentId &&
      (r.status === "READY" || r.status === "ABSENT" || (includeEmpty && r.status === "EMPTY")),
  );
  const emptyCount = (preview?.rows ?? []).filter((r) => r.status === "EMPTY").length;
  const blocked = !!preview && preview.errors.length > 0;

  return (
    <ExamDialog
      open={open}
      onOpenChange={reset}
      wide
      title="Excel-ээс оруулах"
      description="Эзний «Багшийн анги» хэлбэр: хоосон нүд зөв, 0 буруу"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={() => reset(false)}>
            Болих
          </Button>
          <Button
            type="button"
            disabled={!preview || blocked || applicable.length === 0}
            onClick={() => {
              onApply(
                applicable.map((r) => ({
                  studentId: r.studentId!,
                  wrong: r.status === "ABSENT" ? [] : r.wrong,
                  absent: r.status === "ABSENT",
                })),
              );
              reset(false);
            }}
          >
            <FileSpreadsheet aria-hidden /> {applicable.length} сурагчийг хүснэгтэд буулгах
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-semibold text-ink">
            <span className="mb-1 block">Excel файл (.xlsx)</span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                setPreview(null);
                if (next) void load(next);
              }}
              className="block w-full text-sm font-normal text-ink file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-line file:bg-panel file:px-3 file:font-semibold file:text-ink"
            />
          </label>
          {preview && preview.sheets.length > 1 && (
            <label className="text-sm font-semibold text-ink">
              <span className="mb-1 block">Хуудас</span>
              <select
                value={preview.sheet}
                disabled={busy}
                onChange={(e) => file && void load(file, e.target.value)}
                className="min-h-11 max-w-[16rem] rounded-xl border border-line bg-surface px-3 font-normal text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                {preview.sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {busy && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-dim">
            <Upload className="h-4 w-4" aria-hidden /> Уншиж байна
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error">
            {error}
          </p>
        )}

        {preview && (
          <>
            {preview.errors.length > 0 && (
              <div role="alert" className="space-y-1 rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-error">
                <p className="font-semibold">Баганууд тестийнхтэй таарахгүй байна — засаад дахин оруулна уу:</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {preview.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.warnings.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                {preview.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
                  </li>
                ))}
              </ul>
            )}
            {emptyCount > 0 && (
              <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={includeEmpty}
                  onChange={(e) => setIncludeEmpty(e.target.checked)}
                  className="h-5 w-5 accent-brand-bright"
                />
                Бүх нүд хоосон {emptyCount} мөрийг «бүгд зөв» гэж оруулах
              </label>
            )}
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-panel text-left text-xs text-ink-dim">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Мөр</th>
                    <th className="px-3 py-2 font-semibold">Excel-ийн нэр</th>
                    <th className="px-3 py-2 font-semibold">Сурагч</th>
                    <th className="px-3 py-2 text-right font-semibold">Оноо</th>
                    <th className="px-3 py-2 font-semibold">Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => {
                    const s = STATUS[r.status];
                    return (
                      <tr key={r.rowNumber} className="border-t border-line">
                        <td className="px-3 py-2 tabular-nums text-ink-dim">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-ink">{r.name}</td>
                        <td className="px-3 py-2 text-ink">{r.studentName ?? <span className="text-ink-dim">-</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink">
                          {r.total !== null ? `${r.total}/${preview.maxScore}` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={s.tone}>{s.label}</Badge>
                          {r.odd.length > 0 && (
                            <span className="ml-2 text-xs text-warning" title={r.odd.join(", ")}>
                              {r.odd.length} нүдэнд 0-ээс өөр утга
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {preview.missingStudents.length > 0 && (
              <p className="text-sm text-ink-dim">
                Excel-д алга: {preview.missingStudents.map((s) => s.name).join(", ")}
              </p>
            )}
          </>
        )}
      </div>
    </ExamDialog>
  );
}
