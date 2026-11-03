"use client";

import { ReceiptText } from "lucide-react";
import LessonHistoryTab from "@/components/students/hub/LessonHistoryTab";
import { useSection } from "@/components/students/progress/useSection";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { formatMnDateTime } from "@/lib/dateMn";
import WithdrawalSummary from "./WithdrawalSummary";
import type { SavedWithdrawal } from "./types";

const REFUND_STATUS: Record<string, string> = {
  DRAFT: "Буцаалт: ноорог",
  PENDING_APPROVAL: "Буцаалт: батлуулахаар",
  APPROVED: "Буцаалт: батлагдсан",
  PAID: "Буцаалт: шилжүүлсэн",
  CANCELLED: "Буцаалт: цуцалсан",
};

/**
 * «Гарсан тооцоо» (эзэн 2026-11-03): «Сургалтаас хасах» үед хадгалсан тооцоо + бүх хугацааны ирц,
 * даалгаврын түүх. Тооцоо хадгалсан агшнаараа (дараа нь дүрэм өөрчлөгдсөн ч хэвээр).
 */
export default function WithdrawalTab({ studentId }: { studentId: string }) {
  const q = useSection<SavedWithdrawal[]>(`/tuition/withdrawal/student/${encodeURIComponent(studentId)}`, []);
  if (q.status === "loading") return <LoadingState rows={4} label="Гарсан тооцоо" />;
  if (q.status === "error") return <ErrorState message={q.error} onRetry={q.reload} />;
  const rows = q.data ?? [];
  return (
    <div className="space-y-5">
      {rows.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Тооцоо алга" hint="«Сургалтаас хасах» товчоор хассан үед тооцоо энд хадгалагдана" />
      ) : (
        rows.map((w) => (
          <article key={w.id} className="space-y-2">
            <header>
              <h3 className="font-bold text-ink">Сургалтаас хассан тооцоо</h3>
              <Meta
                className="text-sm text-ink-dim"
                items={[
                  `гарсан ${w.leftOn}`,
                  w.reason,
                  w.createdBy ? `${w.createdBy} ${formatMnDateTime(w.createdAt, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : null,
                  w.refundStatus ? REFUND_STATUS[w.refundStatus.status] ?? null : null,
                ]}
              />
            </header>
            <WithdrawalSummary data={w.detail} />
          </article>
        ))
      )}
      <section aria-label="Хичээлийн бүх түүх">
        <h3 className="mb-2 font-bold text-ink">Хичээлийн бүх түүх</h3>
        <LessonHistoryTab studentId={studentId} />
      </section>
    </div>
  );
}
