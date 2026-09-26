"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import type { NotificationItem } from "@/components/notifications/NotificationBell";

interface NotificationPage {
  notifications: NotificationItem[];
  nextCursor: string | null;
}
type Filter = "all" | "unread" | "read";

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}

function internalLink(value: string | null): string | null {
  return value?.startsWith("/app/") ? value : null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingRead, setSavingRead] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<NotificationPage>("/notifications/my?limit=20"),
      api<{ count: number }>("/notifications/my/unread-count"),
    ])
      .then(([page, unread]) => {
        if (!active) return;
        setItems(page.notifications);
        setNextCursor(page.nextCursor);
        setUnreadCount(unread.count);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Мэдэгдэл ачаалж чадсангүй."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === "unread") return !item.readAt;
    if (filter === "read") return Boolean(item.readAt);
    return true;
  }), [items, filter]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [page, unread] = await Promise.all([
        api<NotificationPage>("/notifications/my?limit=20"),
        api<{ count: number }>("/notifications/my/unread-count"),
      ]);
      setItems(page.notifications);
      setNextCursor(page.nextCursor);
      setUnreadCount(unread.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Мэдэгдэл ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setActionError(null);
    try {
      const page = await api<NotificationPage>(`/notifications/my?limit=20&cursor=${encodeURIComponent(nextCursor)}`);
      setItems((current) => [...current, ...page.notifications]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Дараагийн мэдэгдлүүдийг ачаалж чадсангүй.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(id: string) {
    setSavingRead(id);
    setActionError(null);
    try {
      await api(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Мэдэгдэл уншсан болгож чадсангүй.");
    } finally {
      setSavingRead(null);
    }
  }

  async function markAllRead() {
    setSavingAll(true);
    setActionError(null);
    try {
      await api("/notifications/read-all", { method: "POST" });
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
      setUnreadCount(0);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Мэдэгдлийг бүгдийг уншсан болгож чадсангүй.");
    } finally {
      setSavingAll(false);
    }
  }

  if (loading) return <LoadingState rows={5} label="Мэдэгдэл ачаалж байна" />;
  if (error) return <div className="space-y-4"><PageHeader title="Мэдэгдэл" /><ErrorState message={error} onRetry={() => void reload()} /></div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Мэдэгдэл"
        description="Даалгавар болон зарын шинэ мэдээллээ эндээс шалгана."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ink">
            <Bell className="h-4 w-4 text-brand" aria-hidden />
            <span>Уншаагүй</span>
            <strong aria-live="polite">{unreadCount}</strong>
          </div>
          <Button type="button" variant="secondary" disabled={unreadCount === 0 || savingAll} loading={savingAll} onClick={() => void markAllRead()}>
            <CheckCheck className="h-4 w-4" aria-hidden />
            Бүгдийг уншсан болгох
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Мэдэгдлийн шүүлтүүр">
          {([
            ["all", "Бүгд"],
            ["unread", "Уншаагүй"],
            ["read", "Уншсан"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors ${filter === value ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink-dim hover:bg-panel"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {actionError && <ErrorState message={actionError} />}
      {visibleItems.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "Уншаагүй мэдэгдэл алга" : filter === "read" ? "Уншсан мэдэгдэл алга" : "Мэдэгдэл алга"}
          hint={nextCursor ? "Дараагийн хуудсанд үргэлжлүүлэн шалгаж болно." : "Шинэ даалгавар эсвэл зар ирэхэд энд харагдана."}
        />
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((item) => {
            const href = internalLink(item.link);
            return (
              <li key={item.id}>
                <Card className={item.readAt ? "" : "border-l-4 border-l-brand"}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-ink">{item.title}</h2>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${item.readAt ? "border-line text-ink-dim" : "border-brand/30 bg-brand/5 font-semibold text-brand"}`}>
                          {item.readAt ? "Уншсан" : "Шинэ"}
                        </span>
                      </div>
                      {item.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-dim">{item.body}</p>}
                      <time className="mt-2 block text-xs text-ink-dim" dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
                      {href && <Link href={href} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">Холбогдох хэсэг рүү очих</Link>}
                    </div>
                    {!item.readAt && (
                      <Button type="button" variant="secondary" loading={savingRead === item.id} disabled={savingRead !== null || savingAll} onClick={() => void markRead(item.id)} className="min-h-11 shrink-0">
                        Уншсан болгох
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <div className="flex justify-center">
          <Button type="button" variant="secondary" loading={loadingMore} disabled={loadingMore} onClick={() => void loadMore()}>
            <ChevronDown className="h-4 w-4" aria-hidden />
            Дараагийн мэдэгдлүүд
          </Button>
        </div>
      )}
    </div>
  );
}
