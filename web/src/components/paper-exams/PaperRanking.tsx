"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { dayText, scoreText, type PaperExamRow, type PaperRanking as Ranking } from "./types";

/** Excel (UTF-8 BOM) — зөвхөн Админ, Багш+ (эзэн 2026-11-15: Excel олон нийтэд нээлттэй биш). */
function downloadCsv(r: Ranking) {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = [esc(r.exam.title), ["Дүн", "Сурагчийн код", "Байр"].join(","), ...r.rows.map((x) => [scoreText(x.score), esc(x.code), esc(x.rank)].join(","))];
  save(new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }), `${r.exam.title} — дүн.csv`);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * PNG зураг — хүн бүр татна. 578 мөр нэг баганад багтахгүй тул мөрүүдийг хэд хэдэн
 * хүснэгтэд (зэрэгцээ) хувааж зурна: гарчиг дээр, хүснэгт бүрт Дүн | Сурагчийн код | Байр.
 */
async function downloadPng(r: Ranking) {
  const bands = new Map<string, number>();
  for (const x of r.rows) if (!bands.has(x.rank)) bands.set(x.rank, bands.size);
  await document.fonts?.ready;
  const PER_BLOCK = 50;
  const blocks = Math.max(1, Math.ceil(r.rows.length / PER_BLOCK));
  const perRow = Math.min(blocks, 4);
  const bandCount = Math.ceil(blocks / perRow);
  const COL = [70, 130, 80];
  const blockW = COL.reduce((a, b) => a + b, 0);
  const GAP = 28;
  const PAD = 36;
  const ROW = 26;
  const HEAD = 32;
  const TITLE = 84;
  const rowsInBlock = Math.min(PER_BLOCK, r.rows.length);
  const bandH = HEAD + rowsInBlock * ROW;
  const W = PAD * 2 + perRow * blockW + (perRow - 1) * GAP;
  const H = PAD + TITLE + bandCount * bandH + (bandCount - 1) * GAP + PAD;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  const font = "Onest, ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1B1B18";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 28px ${font}`;
  ctx.fillText(r.exam.title, W / 2, PAD + 20);
  ctx.fillStyle = "#57544D";
  ctx.font = `500 15px ${font}`;
  ctx.fillText(`${dayText(r.exam.heldOn)} · ${r.rows.length} сурагч`, W / 2, PAD + 54);

  for (let b = 0; b < blocks; b++) {
    const slice = r.rows.slice(b * PER_BLOCK, (b + 1) * PER_BLOCK);
    const x0 = PAD + (b % perRow) * (blockW + GAP);
    const y0 = PAD + TITLE + Math.floor(b / perRow) * (bandH + GAP);
    // Толгой
    ctx.fillStyle = "#DCE6FB";
    ctx.fillRect(x0, y0, blockW, HEAD);
    ctx.fillStyle = "#1E3A8A";
    ctx.font = `700 14px ${font}`;
    let cx = x0;
    ["Дүн", "Сурагчийн код", "Байр"].forEach((h, i) => {
      ctx.fillText(h, cx + COL[i] / 2, y0 + HEAD / 2);
      cx += COL[i];
    });
    // Мөрүүд
    slice.forEach((row, i) => {
      const y = y0 + HEAD + i * ROW;
      // Ижил байртай бүлгүүд ээлжлэн өнгөтэй
      if ((bands.get(row.rank) ?? 0) % 2 === 1) {
        ctx.fillStyle = "#E3EBFB";
        ctx.fillRect(x0, y, blockW, ROW);
      }
      let x = x0;
      [scoreText(row.score), row.code, row.rank].forEach((v, j) => {
        ctx.fillStyle = j === 0 ? "#1B1B18" : "#2B2A26";
        ctx.font = `${j === 0 ? 700 : 500} 14px ${font}`;
        ctx.fillText(v, x + COL[j] / 2, y + ROW / 2);
        x += COL[j];
      });
    });
    // Хүрээ, баганын зураас
    const h = HEAD + slice.length * ROW;
    ctx.strokeStyle = "#C9C5BC";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, blockW - 1, h - 1);
    let lx = x0;
    for (let i = 0; i < COL.length - 1; i++) {
      lx += COL[i];
      ctx.beginPath();
      ctx.moveTo(lx + 0.5, y0);
      ctx.lineTo(lx + 0.5, y0 + h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0 + HEAD + 0.5);
    ctx.lineTo(x0 + blockW, y0 + HEAD + 0.5);
    ctx.stroke();
  }
  canvas.toBlob((blob) => blob && save(blob, `${r.exam.title} — дүн.png`), "image/png");
}

/**
 * «Дүн» — нэгдсэн шалгалтын жагсаалт: Дүн | Сурагчийн код | Байр. Ижил оноотой сурагчид
 * нэг байрыг хуваана («1-2»). Нэр харуулахгүй. Хүн бүр PNG-ээр, Админ/Багш+ Excel-ээр татна.
 */
export default function PaperRanking() {
  const [exams, setExams] = useState<PaperExamRow[] | null>(null);
  const [examId, setExamId] = useState("");
  const [data, setData] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const role = getRole();
  const canExcel = role === "ADMIN" || role === "TEACHER_PLUS";

  const loadExams = useCallback(() => {
    api<PaperExamRow[]>("/paper-exams")
      .then((list) => {
        setError("");
        const scored = list.filter((e) => e.sheetCount > 0);
        setExams(scored);
        setExamId((cur) => cur || scored[0]?.id || "");
      })
      .catch((e) => setError(errorText(e, "Жагсаалтыг ачаалж чадсангүй")));
  }, []);
  useEffect(loadExams, [loadExams]);
  const withScores = exams ?? [];

  const load = useCallback(() => {
    if (!examId) return;
    api<Ranking>(`/paper-exams/${encodeURIComponent(examId)}/ranking`)
      .then((r) => {
        setError("");
        setData(r);
      })
      .catch((e) => setError(errorText(e, "Дүнг ачаалж чадсангүй")));
  }, [examId]);
  useEffect(load, [load]);

  // Ижил байртай бүлгүүдийг ээлжлэн өнгөөр ялгана (эзэн 2026-11-15)
  const bandOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data?.rows ?? []) if (!m.has(r.rank)) m.set(r.rank, m.size);
    return m;
  }, [data]);
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (data?.rows ?? []).filter((r) => !q || r.code.toUpperCase().includes(q));
  }, [data, query]);

  if (!exams) return error ? <ErrorState message={error} onRetry={loadExams} /> : <SkeletonRows rows={8} />;
  if (withScores.length === 0) return <EmptyState title="Дүн оруулсан нэгдсэн шалгалт алга" />;

  const cell = "border-line px-3 py-2 text-center";
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {withScores.length > 1 && (
          <select
            aria-label="Шалгалт сонгох"
            value={examId}
            onChange={(e) => {
              setData(null);
              setExamId(e.target.value);
            }}
            className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
          >
            {withScores.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        )}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            aria-label="Сурагчийн кодоор хайх"
            inputMode="numeric"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Сурагчийн код"
            className="h-11 w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        {data && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadPng(data);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download aria-hidden /> Зураг татах
          </Button>
        )}
        {data && canExcel && (
          <Button variant="ghost" onClick={() => downloadCsv(data)}>
            <FileSpreadsheet aria-hidden /> Excel
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-col items-center gap-1 px-5 pb-3 pt-4 text-center">
            <h2 className="cyrillic-heading font-display text-xl font-bold text-ink">{data.exam.title}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Meta className="text-sm text-ink-dim" items={[dayText(data.exam.heldOn), `${data.rows.length} сурагч`]} />
              {!data.exam.published && <Badge>Сурагчдад нээгээгүй</Badge>}
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-sm tabular-nums">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[44%]" />
              <col className="w-[28%]" />
            </colgroup>
            <thead className="bg-brand-bright/12 text-xs font-bold text-brand-soft">
              <tr>
                <th className={cn(cell, "border-y")}>Дүн</th>
                <th className={cn(cell, "border-x border-y")}>Сурагчийн код</th>
                <th className={cn(cell, "border-y")}>Байр</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.code}-${i}`} className={cn((bandOf.get(r.rank) ?? 0) % 2 === 1 && "bg-brand-bright/10")}>
                  <td className={cn(cell, "border-b font-bold text-ink")}>{scoreText(r.score)}</td>
                  <td className={cn(cell, "border-x border-b text-ink")}>{r.code}</td>
                  <td className={cn(cell, "border-b text-ink-dim")}>{r.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-dim">«{query}» кодтой сурагч алга</p>}
        </Card>
      )}
    </div>
  );
}
