"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationPage {
  notifications: NotificationItem[];
  nextCursor: string | null;
}

function internalLink(value: string | null): string | null {
  return value?.startsWith("/app/") ? value : null;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [countError, setCountError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [pendingReadId, setPendingReadId] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const result = await api<{ count: number }>("/notifications/my/unread-count");
      setUnreadCount(result.count);
      setCountError(null);
    } catch (error) {
      setCountError(error instanceof Error ? error.message : "Мэдэгдлийн тоо ачаалсангүй.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const updateCount = () => {
      api<{ count: number }>("/notifications/my/unread-count")
        .then((result) => {
          if (!active) return;
          setUnreadCount(result.count);
          setCountError(null);
        })
        .catch((error) => {
          if (active) setCountError(error instanceof Error ? error.message : "Мэдэгдлийн тоо ачаалсангүй.");
        });
    };
    updateCount();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") updateCount();
    }, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") updateCount();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function loadRecent() {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const result = await api<NotificationPage>("/notifications/my?limit=10");
      setRecent(result.notifications);
    } catch (error) {
      setRecentError(error instanceof Error ? error.message : "Мэдэгдэл ачаалсангүй.");
    } finally {
      setRecentLoading(false);
    }
  }

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void loadRecent();
  }

  async function markRead(id: string) {
    setPendingReadId(id);
    try {
      await api(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
      const now = new Date().toISOString();
      setRecent((items) => items.map((item) => item.id === id ? { ...item, readAt: now } : item));
      void refreshCount();
    } catch (error) {
      setRecentError(error instanceof Error ? error.message : "Мэдэгдэл уншсан болгож чадсангүй.");
    } finally {
      setPendingReadId(null);
    }
  }

  const accessibleLabel = unreadCount > 0
    ? `Мэдэгдэл, ${unreadCount} уншаагүй`
    : "Мэдэгдэл";

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        variant="secondary"
        aria-label={accessibleLabel}
        aria-expanded={open}
        aria-controls="notification-recent-panel"
        onClick={toggle}
        title="Мэдэгдэл"
        className="relative h-11 w-11 shrink-0 justify-center whitespace-nowrap !px-0"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold leading-none text-on-error" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <section
          id="notification-recent-panel"
          aria-labelledby="notification-recent-title"
          className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="notification-recent-title" className="font-semibold text-ink">Сүүлийн мэдэгдэл</h2>
            <Link href="/app/notifications" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Бүгдийг харах <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {countError && <p role="status" className="mb-2 text-xs text-ink-dim">Уншаагүй тоо шинэчлэгдээгүй.</p>}
          {recentLoading ? <LoadingState rows={3} label="Мэдэгдэл ачаалж байна" /> : null}
          {!recentLoading && recentError && <ErrorState message={recentError} onRetry={() => void loadRecent()} />}
          {!recentLoading && !recentError && recent.length === 0 && <EmptyState title="Мэдэгдэл алга" hint="Шинэ мэдээлэл ирэхэд энд харагдана." />}
          {!recentLoading && !recentError && recent.length > 0 && (
            <ul className="max-h-[65vh] divide-y divide-line overflow-y-auto">
              {recent.map((item) => {
                const href = internalLink(item.link);
                return (
                  <li key={item.id} className={`py-3 ${item.readAt ? "" : "border-l-2 border-brand pl-3"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {href ? <Link href={href} onClick={() => setOpen(false)} className="font-semibold text-ink hover:text-brand">{item.title}</Link> : <h3 className="font-semibold text-ink">{item.title}</h3>}
                        {item.body && <p className="mt-1 break-words text-sm text-ink-dim">{item.body}</p>}
                        <time className="mt-1 block text-xs text-ink-dim" dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time>
                      </div>
                      {!item.readAt && <Button type="button" variant="ghost" size="sm" aria-label="Уншсан болгох" loading={pendingReadId === item.id} onClick={() => void markRead(item.id)} className="min-h-11 min-w-11 shrink-0 justify-center px-2"><Check className="h-4 w-4" aria-hidden /></Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
