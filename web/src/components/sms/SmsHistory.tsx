"use client";

"use client";

import { useEffect, useState } from "react";
import { RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/Button";
import InfoHint from "@/components/ui/InfoHint";

interface SmsMessage {
  id: string;
  to: string;
  text: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  errorReason?: string;
}

export function SmsHistory() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      // Сервер нь skip/take хүлээж авдаг (page/limit БИШ) — нэрийг таарууллаа,
      // эс бөгөөс шүүлт чимээгүй ажиллахгүй байсан.
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        take: String(pageSize),
        ...(statusFilter !== "all" && { status: statusFilter.toUpperCase() }),
      });
      const data = await api<{ items: SmsMessage[]; total: number }>(
        `/sms/messages?${params}`,
      );
      setMessages(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page, statusFilter]);

  const handleRetry = async (messageId: string) => {
    try {
      await api(`/sms/messages/${messageId}/retry`, { method: "POST" });
      // Жагсаалтыг дахин ачаалах
      await fetchMessages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Алдаа");
    }
  };

  if (loading) return <LoadingState rows={5} label="Мессежүүдийг ачаалж байна" />;
  if (error) return <ErrorState message={error} onRetry={fetchMessages} />;

  const statusColors: Record<string, string> = {
    sent: "bg-success/10 text-success",
    failed: "bg-error/10 text-error",
    pending: "bg-warning/10 text-warning",
  };

  const statusLabels: Record<string, string> = {
    sent: "Явсан",
    failed: "Амжилтгүй",
    pending: "Хүлээгдэж байна",
  };

  return (
    <div className="space-y-4">
      {/* Шүүлтүүр */}
      <Card>
        <SectionHeader title="Шүүлтүүр" />
        <div className="flex flex-wrap gap-2">
          {(["all", "sent", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                statusFilter === s
                  ? "bg-brand text-on-brand"
                  : "bg-surface border border-line text-ink hover:bg-panel"
              }`}
            >
              {s === "all" ? "Бүгд" : statusLabels[s]}
            </button>
          ))}
        </div>
      </Card>

      {/* Мессежүүдийн жагсаалт */}
      {messages.length === 0 ? (
        <EmptyState
          title="Мессеж байхгүй"
          hint="Анхаарч байгаа шүүлтүүрт мессеж олдсонгүй."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[msg.status]}`}>
                    {statusLabels[msg.status]}
                  </span>
                  <Meta
                    items={[
                      <span className="font-mono text-sm">{msg.to}</span>,
                      new Date(msg.sentAt).toLocaleString("mn-MN"),
                    ]}
                    className="text-xs text-ink-dim"
                  />
                </div>
                <p className="mt-2 text-sm text-ink break-words">{msg.text}</p>
                {msg.errorReason && (
                  <p className="mt-1 text-xs text-error">Алдаа: {msg.errorReason}</p>
                )}
              </div>
              {msg.status === "failed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRetry(msg.id)}
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                  Дахин
                </Button>
              )}
            </Card>
          ))}

          {/* Хуудаслалт */}
          {totalPages > 1 && (
            <Card className="flex items-center justify-center gap-2 p-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Button>
              <span className="text-sm text-ink-dim">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
