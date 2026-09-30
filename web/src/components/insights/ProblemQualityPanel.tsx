"use client";

import { useEffect, useMemo, useState } from "react";
import InfoHint from "@/components/ui/InfoHint";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import type { ProblemQuality } from "./types";

export default function ProblemQualityPanel() {
  const [rows, setRows] = useState<ProblemQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api<ProblemQuality[]>("/insights/problem-quality?limit=200")
      .then((result) => { if (active) setRows(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.isDefective) - Number(a.isDefective) || a.difficulty - b.difficulty), [rows]);
  const defectiveCount = rows.filter((row) => row.isDefective).length;

  return (
    <div className="space-y-4">
      <Card padding="tight">
        <SectionHeader
          title="Бодлогын үзүүлэлтийг тайлбарлах нь"
          hint={<InfoHint>Зөв хариултын хувь буюу p-value өндөр байх тусам бодлого олон сурагчид амар байсныг илтгэнэ. Ялгах үзүүлэлт нь шалгалтын нийт оноо өндөртэй сурагч тухайн бодлогыг зөв бодох хандлагатай эсэхийг хэмжинэ. Сөрөг утгыг түлхүүр, найруулгын алдаа байж болзошгүй тул гараар нягтална.</InfoHint>}
        />
        <p className="text-sm text-ink-dim">Эхлээд сөрөг ялгах үзүүлэлттэй бодлогууд, дараа нь хүндээс хялбар руу эрэмбэлэв.</p>
      </Card>

      {loading && <LoadingState rows={6} label="Бодлогын чанарын хэмжилт ачаалж байна" />}
      {!loading && error && <ErrorState message="Бодлогын хэмжилт ачаалсангүй. Дахин оролдоно уу." onRetry={() => { setError(false); setLoading(true); setRetry((value) => value + 1); }} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="Одоогоор оролдлогын өгөгдөл алга" hint="Сурагчид тест бөглөсний дараа энд гарна." />}
      {!loading && !error && rows.length > 0 && (
        <div className="space-y-3">
          {defectiveCount > 0 && <div role="status" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-ink">Сөрөг ялгах үзүүлэлттэй {defectiveCount} бодлого байна. Хариуны түлхүүр болон найруулгыг гараар нягтална уу.</div>}
          {sorted.map((row) => (
            <Card key={row.problemId} padding="tight" className={row.isDefective ? "border-warning/50" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-all font-semibold text-ink">{row.problemToken}</h3>
                  <div className="mt-1 text-sm text-ink-dim"><Meta items={[`${row.attemptCount} оролдлого`, `${row.correctCount} зөв хариулт`]} /></div>
                </div>
                {row.isDefective && <span className="rounded-full bg-warning/15 px-3 py-1 text-sm font-semibold text-ink">Гараар нягтална</span>}
              </div>
              {row.attemptCount < 10 ? (
                <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-sm text-ink-dim">Дүгнэлт гаргахад оролдлого хангалтгүй ({row.attemptCount})</p>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-surface p-3"><dt className="text-xs text-ink-dim">Зөв хариултын хувь</dt><dd className="mt-1 text-xl font-bold text-ink">{Math.round(row.difficulty * 100)}%</dd></div>
                  <div className="rounded-xl border border-line bg-surface p-3"><dt className="text-xs text-ink-dim">Ялгах үзүүлэлт</dt><dd className="mt-1 text-xl font-bold text-ink">{row.discrimination.toFixed(2)}</dd></div>
                </dl>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
