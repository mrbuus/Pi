"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { SkeletonRows } from "@/components/ui/Skeleton";
import LedgerDialog, { Field, inputCls } from "./LedgerDialog";
import { mnt, todayUB } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { LedgerRow } from "./ledgerTypes";

interface Preview {
  calculation: {
    totalLessonDays: number;
    attendedLessonDays: number;
    owed: number;
    totalPaid: number;
    refundAmount: number;
    shortfall: number;
    warnings: string[];
  };
  explanation: string[];
}

// api/src/tuition/proration.ts — PRORATION_WARNING_TEXT-ийн товч хувилбар
const WARNING: Record<string, string> = {
  NO_LESSON_DAYS: "Энэ хугацаанд ангийн хуваарьт хичээл олдсонгүй",
  LEFT_BEFORE_JOINED: "Гарах өдөр эхэлсэн өдрөөс өмнө байна",
  ZERO_TUITION: "Төлбөрийн дүн тохируулаагүй",
  LEFT_AFTER_LAST_LESSON: "Гарах өдөр сүүлийн хичээлээс хойш — бүтэн тооцов",
};

/**
 * Төвөөс гарах — буцаалтыг суусан ХИЧЭЭЛИЙН өдрөөр тооцно (tuition/proration.ts).
 * Огноо солих бүрт зөвхөн тооцоо (хадгалахгүй). «Ноорог үүсгэх» дарвал л
 * TuitionRefund (DRAFT) үүснэ — батлах/олгох нь буцаалтын хуудсанд.
 */
export default function RefundDialog({ row, onClose, onCreated }: { row: LedgerRow; onClose: () => void; onCreated: () => void }) {
  const [leftOn, setLeftOn] = useState(todayUB());
  const [data, setData] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const classroomId = row.classroom?.id;

  useEffect(() => {
    if (!classroomId || !/^\d{4}-\d{2}-\d{2}$/.test(leftOn)) return;
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({ studentId: row.id, classroomId, leftOn });
      api<Preview>(`/tuition/refund/preview?${q}`)
        .then((d) => alive && setData(d))
        .catch((e) => alive && setError(errMsg(e)))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [row.id, classroomId, leftOn]);

  async function createDraft() {
    if (!classroomId) return;
    setSaving(true);
    try {
      const r = await api<{ id: string }>("/tuition/refund", {
        method: "POST",
        body: { studentId: row.id, classroomId, leftOn },
      });
      setCreated(r.id);
      toast.success("Буцаалтын ноорог үүслээ");
      onCreated();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const c = data?.calculation;
  return (
    <LedgerDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Төвөөс гарах — буцаалт"
      description={`${row.firstName} ${row.lastName}${row.classroom ? ` — ${row.classroom.name}` : ""}`}
    >
      {!classroomId ? (
        <p className="text-sm text-ink-dim">Сурагч ангид бүртгэлгүй тул хичээлийн өдрөөр тооцох боломжгүй.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Гарах өдөр" htmlFor="refund-left">
            <input id="refund-left" type="date" value={leftOn} onChange={(e) => setLeftOn(e.target.value)} className={inputCls} />
          </Field>
          {loading && !data ? (
            <SkeletonRows rows={4} />
          ) : error ? (
            <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          ) : c ? (
            <div className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              <div
                className={`rounded-2xl p-4 ${c.refundAmount > 0 ? "bg-success/10" : c.shortfall > 0 ? "bg-error/10" : "bg-ink/5"}`}
              >
                <p className="text-sm text-ink-dim">
                  {c.refundAmount > 0 ? "Буцаах" : c.shortfall > 0 ? "Дутуу төлбөр" : "Тооцоо тэнцсэн"}
                </p>
                <p className="font-display text-3xl font-bold tabular-nums text-ink">
                  {mnt(c.refundAmount > 0 ? c.refundAmount : c.shortfall)}
                </p>
              </div>
              <ul className="space-y-1 text-sm text-ink">
                {data!.explanation.map((l) => (
                  <li key={l} className="tabular-nums">
                    {l}
                  </li>
                ))}
              </ul>
              {c.warnings.length > 0 && (
                <ul className="space-y-1">
                  {c.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-1.5 text-sm text-error">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {WARNING[w] ?? w}
                    </li>
                  ))}
                </ul>
              )}
              {created ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/app/tuition/refund/${encodeURIComponent(created)}`}>
                    Буцаалтыг батлах <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled={saving || loading} onClick={createDraft} className="w-full">
                  {saving ? "Үүсгэж байна" : "Буцаалтын ноорог үүсгэх"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </LedgerDialog>
  );
}
