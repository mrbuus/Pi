"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Link2, RotateCcw, Search, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import InfoHint from "@/components/ui/InfoHint";
import { formatMnDateTime } from "@/lib/dateMn";
import ExamDialog from "@/components/exams/ExamDialog";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { scoreText, type BoardRow, type ImportHistoryRow, type ImportPreview, type ImportPreviewRow } from "./types";

const MATCH_LABEL: Record<NonNullable<ImportPreviewRow["match"]>, string> = {
  CODE: "кодоор",
  LEGACY: "хуучин кодоор",
  NAME: "нэрээр",
};

/**
 * Дүн оруулах: файл сонгох → урьдчилан харах (ӨС-д бичихгүй) → «Хадгалах».
 * Эзний Excel (зөв = 1) болон машины үсэгтэй гаралт хоёуланг нь уншина.
 */
export default function ImportPanel({
  examId,
  itemCount,
  unmatched,
  onChanged,
}: {
  examId: string;
  itemCount: number;
  unmatched: BoardRow[];
  onChanged: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [replace, setReplace] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ImportHistoryRow[] | null>(null);
  const [linking, setLinking] = useState<BoardRow | null>(null);
  const [reverting, setReverting] = useState<ImportHistoryRow | null>(null);

  const loadHistory = useCallback(() => {
    api<ImportHistoryRow[]>(`/paper-exams/${encodeURIComponent(examId)}/imports`)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [examId]);
  useEffect(loadHistory, [loadHistory]);

  async function send(target: File, confirm: boolean, replaceOld = replace) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", target);
      const query = new URLSearchParams({ confirm: confirm ? "1" : "0", replace: replaceOld ? "1" : "0" });
      const res = await api<ImportPreview>(`/paper-exams/${encodeURIComponent(examId)}/import?${query}`, {
        method: "POST",
        body: form,
      });
      if (confirm) {
        toast.success(`${res.totals.willWrite} сурагчийн дүн хадгаллаа`);
        setFile(null);
        setPreview(null);
        loadHistory();
        onChanged();
      } else setPreview(res);
    } catch (e) {
      setPreview(null);
      setError(errorText(e, "Файлыг уншиж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  const problems = (preview?.rows ?? []).filter((r) => !r.student || r.duplicate || r.warnings.length > 0);
  const shown = showAll ? (preview?.rows ?? []) : problems;
  const writeCount = preview
    ? preview.totals.rows - preview.totals.duplicates - (replace ? 0 : preview.totals.replaces)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-bold text-brand-soft">
          <Upload className="size-5" aria-hidden /> Файл оруулах
          <InfoHint label="Файлын хэлбэр">
            Шийт бүр нэг баг. Шифр, Овог, Нэр баганууд ба 1…{itemCount} дугаартай бодлогын баганууд. Нүдэнд 1 (зөв), хоосон (буруу),
            эсвэл уншигчийн гаргасан үсэг (A–E).
          </InfoHint>
        </h3>
        <label className="block text-sm font-semibold text-ink">
          <span className="sr-only">Excel файл (.xlsx)</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              e.target.value = "";
              setFile(next);
              setPreview(null);
              setShowAll(false);
              if (next) void send(next, false);
            }}
            className="block w-full text-sm font-normal text-ink file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-line file:bg-panel file:px-3 file:font-semibold file:text-ink"
          />
        </label>
        {busy && <p className="mt-3 text-sm text-ink-dim">Уншиж байна…</p>}
        {error && (
          <p className="mt-3 flex items-start gap-2 text-sm text-error" role="alert">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
      </Card>

      {preview && file && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="size-5 text-brand-soft" aria-hidden />
            <h3 className="min-w-0 flex-1 truncate font-bold text-ink">{preview.fileName}</h3>
          </div>
          {preview.blocking && (
            <p className="mb-3 rounded-xl bg-error/10 p-3 text-sm text-error" role="alert">
              {preview.blocking}
            </p>
          )}
          {preview.sameFileImportedAt && (
            <p className="mb-3 rounded-xl bg-warning/12 p-3 text-sm text-warning">
              Яг энэ файлыг {formatMnDateTime(preview.sameFileImportedAt)}-нд оруулсан байна.
            </p>
          )}
          {preview.noKeyLetters && (
            <p className="mb-3 rounded-xl bg-warning/12 p-3 text-sm text-warning">
              Файлд үсгээр хариулт байна, харин түлхүүр оруулаагүй. Хадгалж болно — «Түлхүүр» табд оруулахад оноо бодогдоно.
            </p>
          )}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Нийт мөр" value={preview.totals.rows} />
            <Stat label="Сурагчтай таарсан" value={preview.totals.matched} tone="success" />
            <Stat label="Таараагүй" value={preview.totals.unmatched} tone={preview.totals.unmatched ? "warning" : undefined} />
            <Stat label="Өмнөх дүнг солих" value={preview.totals.replaces} />
          </div>
          <ul className="mb-3 space-y-1 text-sm">
            {preview.sheets.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{s.groupLabel}</span>
                <Meta
                  className="text-ink-dim"
                  items={[s.groupTeacher ? `Багш: ${s.groupTeacher}` : null, `${s.rowCount} сурагч`, `${s.itemCount} бодлого`, s.mode === "LETTERS" ? "үсгээр" : "1 / хоосон"]}
                />
              </li>
            ))}
            {preview.skipped.map((s) => (
              <li key={s.name} className="text-ink-dim">
                «{s.name}» шийтийг алгассан: {s.reason}
              </li>
            ))}
          </ul>

          {preview.totals.replaces > 0 && (
            <label className="mb-3 flex min-h-11 items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="size-5" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Өмнө оруулсан {preview.totals.replaces} сурагчийн дүнг энэ файлаар солих
            </label>
          )}

          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-ink">
              {showAll ? "Бүх мөр" : problems.length ? `Анхаарах ${problems.length} мөр` : "Анхаарах мөр алга"}
            </h4>
            <Button variant="ghost" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Зөвхөн анхаарахыг" : "Бүгдийг харах"}
            </Button>
          </div>
          {shown.length > 0 && (
            <div className="max-h-96 overflow-auto rounded-xl border border-line">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="sticky top-0 bg-panel text-left text-xs text-ink-dim">
                  <tr>
                    <th className="px-2 py-2">Файлд</th>
                    <th className="px-2 py-2">Сурагч</th>
                    <th className="px-2 py-2 text-right">Оноо</th>
                    <th className="px-2 py-2">Тайлбар</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.key} className="border-t border-line align-top">
                      <td className="px-2 py-1.5">
                        <span className="text-ink">
                          {r.lastName} {r.firstName}
                        </span>
                        <div className="text-xs text-ink-dim">
<Meta items={[r.code || "шифргүй", r.groupLabel, `${r.rowNumber}-р мөр`]} />
</div>
                      </td>
                      <td className="px-2 py-1.5">
                        {r.student ? (
                          <>
                            <span className="text-ink">{r.student.name}</span>
                            <span className="block text-xs text-ink-dim">{r.match ? MATCH_LABEL[r.match] : ""}</span>
                          </>
                        ) : (
                          <Badge tone="warning">Олдсонгүй</Badge>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {scoreText(r.totalScore)}/{scoreText(r.maxScore)}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-ink-dim">
                        {!r.student && <span className="block">Хадгалсны дараа гараар холбоно</span>}
                        {r.warnings.map((w) => (
                          <span key={w} className="block">
                            {w}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
            >
              Болих
            </Button>
            <Button disabled={busy || !!preview.blocking || writeCount <= 0} onClick={() => send(file, true)}>
              <Upload aria-hidden /> {writeCount} хуудас хадгалах
            </Button>
          </div>
        </Card>
      )}

      {unmatched.length > 0 && (
        <Card>
          <h3 className="mb-3 font-bold text-brand-soft">Сурагчтай холбогдоогүй хуудас</h3>
          <ul className="divide-y divide-line">
            {unmatched.map((r) => (
              <li key={r.sheetId} className="flex min-h-11 flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-ink">
                    {r.lastName} {r.firstName}
                  </span>
                  <Meta className="ml-2 text-xs text-ink-dim" items={[r.code || "шифргүй", `${scoreText(r.totalScore)} оноо`]} />
                </span>
                <Button variant="secondary" onClick={() => setLinking(r)}>
                  <Link2 aria-hidden /> Сурагч холбох
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-bold text-brand-soft">Оруулсан түүх</h3>
        {history === null ? (
          <p className="text-sm text-ink-dim">Уншиж байна…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-ink-dim">Одоогоор файл оруулаагүй.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className={cn("flex min-h-11 flex-wrap items-center gap-3 py-2", h.status === "REVERTED" && "opacity-60")}>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-ink">{h.fileName}</span>
                  <div className="text-xs text-ink-dim">
<Meta
                    items={[formatMnDateTime(h.createdAt), h.createdBy, `${h.sheetCount} хуудас`, `${h.matchedCount} таарсан`]}
                  />
</div>
                </span>
                {h.status === "REVERTED" ? (
                  <Badge>Буцаасан</Badge>
                ) : (
                  <Button variant="ghost" onClick={() => setReverting(h)}>
                    <RotateCcw aria-hidden /> Буцаах
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <LinkDialog
        row={linking}
        onClose={() => setLinking(null)}
        onLinked={() => {
          setLinking(null);
          onChanged();
        }}
      />
      <ExamDialog
        open={!!reverting}
        onOpenChange={(v) => !v && setReverting(null)}
        title="Импортыг буцаах уу?"
        description={reverting ? `«${reverting.fileName}» файлаар орсон дүн хүчингүй болно.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReverting(null)}>
              Болих
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!reverting) return;
                setBusy(true);
                try {
                  await api(`/paper-exams/imports/${encodeURIComponent(reverting.id)}/revert`, { method: "POST" });
                  toast.success("Буцаалаа");
                  setReverting(null);
                  loadHistory();
                  onChanged();
                } catch (e) {
                  toast.error(errorText(e, "Буцааж чадсангүй"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Буцаах
            </Button>
          </>
        }
      >
        <span />
      </ExamDialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  return (
    <div className={cn("rounded-xl border border-line p-3", tone === "success" && "bg-success/8", tone === "warning" && "bg-warning/10")}>
      <div className="font-display text-xl font-bold tabular-nums text-ink">{value}</div>
      <div className="text-xs text-ink-dim">{label}</div>
    </div>
  );
}

interface FoundStudent {
  id: string;
  name: string;
  code: string | null;
  classes: string[];
}

function LinkDialog({ row, onClose, onLinked }: { row: BoardRow | null; onClose: () => void; onLinked: () => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<FoundStudent[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (!row || text.length < 2) return;
    const t = window.setTimeout(() => {
      api<FoundStudent[]>(`/paper-exams/students/search?q=${encodeURIComponent(text)}`)
        .then(setFound)
        .catch(() => setFound([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, row]);

  async function link(studentId: string) {
    if (!row) return;
    setBusy(true);
    try {
      await api(`/paper-exams/sheets/${encodeURIComponent(row.sheetId)}`, { method: "PATCH", body: { studentId } });
      toast.success("Холболоо");
      setQ("");
      setFound(null);
      onLinked();
    } catch (e) {
      toast.error(errorText(e, "Холбож чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ExamDialog
      open={!!row}
      onOpenChange={(v) => {
        if (!v) {
          setQ("");
          setFound(null);
          onClose();
        }
      }}
      title="Сурагч холбох"
      description={row ? `Файлд: ${row.lastName} ${row.firstName}${row.code ? `, шифр ${row.code}` : ""}` : undefined}
    >
      <label className="relative block">
        <span className="sr-only">Нэр эсвэл код</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр эсвэл сурагчийн код"
          className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink focus-visible:border-brand-bright"
        />
      </label>
      <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto">
        {q.trim().length >= 2 &&
          found?.map((s) => (
            <li key={s.id}>
              <button disabled={busy} onClick={() => link(s.id)} className="row-interactive flex min-h-11 w-full items-center gap-2 px-2 py-2 text-left text-sm">
                <span className="min-w-0 flex-1 font-semibold text-ink">{s.name}</span>
                <Meta className="text-xs text-ink-dim" items={[s.code, s.classes.join(", ")]} />
              </button>
            </li>
          ))}
        {q.trim().length >= 2 && found?.length === 0 && <li className="py-3 text-sm text-ink-dim">Олдсонгүй</li>}
      </ul>
    </ExamDialog>
  );
}
