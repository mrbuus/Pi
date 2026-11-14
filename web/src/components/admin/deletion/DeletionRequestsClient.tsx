"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Inbox, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import RequireRole from "@/components/nav/RequireRole";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { formatMnDateTime } from "@/lib/dateMn";
import ReviewDialog, { type ReviewAction } from "./ReviewDialog";
import {
  ROLE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  type DeletionRequest,
  type DeletionStatus,
} from "./types";

type Tab = "OPEN" | "RESOLVED" | "REJECTED";

const TABS: { key: Tab; label: string; query: string }[] = [
  { key: "OPEN", label: "Нээлттэй", query: "" },
  { key: "RESOLVED", label: "Шийдвэрлэсэн", query: "?status=RESOLVED" },
  { key: "REJECTED", label: "Татгалзсан", query: "?status=REJECTED" },
];

const ORDER: Record<DeletionStatus, number> = {
  PENDING: 0,
  IN_REVIEW: 1,
  RESOLVED: 2,
  REJECTED: 3,
};

function errText(e: unknown): string {
  return e instanceof Error && e.message
    ? e.message
    : "Жагсаалтыг ачаалж чадсангүй";
}

/** ADMIN: аппаас ирсэн бүртгэл устгах хүсэлтийг хянана (App Store 5.1.1(v)). */
export default function DeletionRequestsClient() {
  const [tab, setTab] = useState<Tab>("OPEN");
  const [rows, setRows] = useState<DeletionRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<{
    request: DeletionRequest;
    action: ReviewAction;
  } | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    const query = TABS.find((t) => t.key === tab)?.query ?? "";
    api<DeletionRequest[]>(`/admin/deletion-requests${query}`)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(errText(e)));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => load(), [load]);

  // Хүлээгдэж буй хүсэлт эхэнд, дотроо хуучин нь түрүүлж
  const sorted = useMemo(
    () =>
      rows
        ? [...rows].sort(
            (a, b) =>
              ORDER[a.status] - ORDER[b.status] ||
              a.createdAt.localeCompare(b.createdAt),
          )
        : null,
    [rows],
  );

  function handleSaved(updated: { id: string; status: DeletionStatus }) {
    setTarget(null);
    toast.success(
      updated.status === "RESOLVED"
        ? "Хүсэлтийг шийдвэрлэсэн гэж тэмдэглэлээ"
        : updated.status === "REJECTED"
          ? "Хүсэлтээс татгалзлаа"
          : "Хянаж байна гэж тэмдэглэлээ",
    );
    load();
  }

  return (
    <RequireRole allow={["ADMIN"]}>
      <PageHeader
        title="Устгах хүсэлт"
        description="Аппаас ирсэн бүртгэл устгах хүсэлтийг хянаж шийдвэрлэнэ. Шийдвэр хадгалахад хэрэглэгчийн өгөгдөл устахгүй"
      />

      <div role="tablist" aria-label="Төлөв" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-bright/60 ${
              tab === t.key
                ? "border-brand-bright bg-brand-bright text-on-brand"
                : "border-line bg-surface text-ink-dim hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && sorted === null && (
        <div className="space-y-3" role="status" aria-label="Ачаалж байна">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <span className="sr-only">Ачаалж байна</span>
        </div>
      )}

      {!error && sorted !== null && sorted.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={
            tab === "OPEN"
              ? "Нээлттэй хүсэлт алга"
              : tab === "RESOLVED"
                ? "Шийдвэрлэсэн хүсэлт алга"
                : "Татгалзсан хүсэлт алга"
          }
          hint="Хэрэглэгч аппаас бүртгэл устгах хүсэлт илгээхэд энд харагдана"
        />
      )}

      {!error && sorted !== null && sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onAction={(action) => setTarget({ request: r, action })}
            />
          ))}
        </ul>
      )}

      <ReviewDialog
        request={target?.request ?? null}
        action={target?.action ?? null}
        onClose={() => setTarget(null)}
        onSaved={handleSaved}
      />
    </RequireRole>
  );
}

function RequestCard({
  request: r,
  onAction,
}: {
  request: DeletionRequest;
  onAction: (action: ReviewAction) => void;
}) {
  const name = `${r.user.firstName} ${r.user.lastName}`;
  const open = r.status === "PENDING" || r.status === "IN_REVIEW";
  return (
    <li className="chunky p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-bold text-ink">{name}</p>
          <p className="mt-0.5 text-sm text-ink-dim">
            <Meta
              items={[
                ROLE_LABEL[r.user.role] ?? r.user.role,
                r.user.phone,
                r.user.email,
              ]}
            />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.user.archivedAt && (
            <Badge tone="neutral">
              <Archive aria-hidden />
              Архивласан
            </Badge>
          )}
          <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-dim">
        Илгээсэн: {formatMnDateTime(r.createdAt)}
      </p>

      <div className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm">
        <p className="text-xs font-semibold text-ink-dim">Шалтгаан</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-ink">
          {r.reason?.trim() ? r.reason : "Шалтгаан бичээгүй"}
        </p>
      </div>

      {!open && (
        <div className="mt-3 text-sm text-ink-dim">
          {r.reviewedAt && <p>Шийдсэн: {formatMnDateTime(r.reviewedAt)}</p>}
          {r.reviewNote && (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-ink">
              {r.reviewNote}
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {r.status === "PENDING" && (
            <Button variant="secondary" onClick={() => onAction("IN_REVIEW")}>
              <Search aria-hidden />
              Хянаж эхлэх
            </Button>
          )}
          <Button onClick={() => onAction("RESOLVED")}>
            <CheckCircle2 aria-hidden />
            Зөвшөөрөх
          </Button>
          <Button variant="danger" onClick={() => onAction("REJECTED")}>
            <XCircle aria-hidden />
            Татгалзах
          </Button>
        </div>
      )}
    </li>
  );
}
