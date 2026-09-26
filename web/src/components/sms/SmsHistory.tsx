"use client";

import { useEffect, useState } from "react";
import { RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { api, getRole } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/Button";

interface SmsMessage {
  id: string;
  toPhone: string;
  body: string;
  status: "SENT" | "FAILED" | "QUEUED" | "CANCELLED";
  createdAt: string;
  error?: string | null;
  segments: number;
}

export function SmsHistory() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const canRetry = getRole() === "ADMIN";

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
      const data = await api<{ messages: SmsMessage[]; total: number }>(
        `/sms/messages?${params}`,
      );
      setMessages(data.messages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      skip: String((page - 1) * pageSize),
      take: String(pageSize),
      ...(statusFilter !== "all" && { status: statusFilter.toUpperCase() }),
    });
    api<{ messages: SmsMessage[]; total: number }>(`/sms/messages?${params}`)
      .then((data) => {
        if (!active) return;
        setMessages(data.messages);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Алдаа гарлаа"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
    SENT: "bg-success/10 text-success",
    FAILED: "bg-error/10 text-error",
    QUEUED: "bg-warning/10 text-warning",
    CANCELLED: "bg-panel text-ink-dim",
  };

  const statusLabels: Record<string, string> = {
    SENT: "Явсан",
    FAILED: "Амжилтгүй",
    QUEUED: "Хүлээгдэж байна",
    CANCELLED: "Цуцалсан",
  };

  return (
    <div className="space-y-4">
      {/* Шүүлтүүр */}
      <Card>
        <SectionHeader title="Шүүлтүүр" />
        <div className="flex flex-wrap gap-2">
          {(["all", "sent", "failed"] as const).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => {
                if (statusFilter === s && page === 1) return;
                setLoading(true);
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
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[msg.status] ?? "bg-panel text-ink-dim"}`}>
                  {statusLabels[msg.status]}
                </span>
                <Meta
                  items={[
                    <span key="phone" className="font-mono text-sm">{msg.toPhone}</span>,
                    new Date(msg.createdAt).toLocaleString("mn-MN"),
                    `${msg.segments} хэсэг`,
                  ]}
                  className="text-xs text-ink-dim"
                />
              </div>
              <p className="mt-2 text-sm text-ink break-words">{msg.body}</p>
              {msg.error && (
                <p className="mt-1 text-xs text-error">Алдаа: {msg.error}</p>
              )}
            </div>
            {canRetry && msg.status === "FAILED" && (
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
                onClick={() => { setLoading(true); setPage(page - 1); }}
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
                onClick={() => { setLoading(true); setPage(page + 1); }}
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
