"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FilePlus2, FileUp, History, Lock, Pencil, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import {
  confirmRequiredOf,
  fetchRevision,
  fetchRevisions,
  restoreRevision,
  versionConflictOf,
  type RestoreResult,
  type RevisionAction,
  type RevisionDetail,
  type RevisionEntity,
  type RevisionList,
  type RevisionListItem,
} from "@/lib/revisions";
import ConfirmDialog from "./ConfirmDialog";
import RevisionDiff, { SnapshotView } from "./RevisionDiff";

const ACTION: Record<RevisionAction, { icon: LucideIcon; label: string }> = {
  CREATE: { icon: FilePlus2, label: "Үүсгэсэн" },
  UPDATE: { icon: Pencil, label: "Зассан" },
  RESTORE: { icon: RotateCcw, label: "Сэргээсэн" },
  IMPORT: { icon: FileUp, label: "Импорт" },
};

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * «Түүх»: хэн, хэзээ, юу өөрчилсөн (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md §3).
 * Мөр дээр дарахад өмнөх хувилбартай ялгаа (LaTeX) + «Энэ хувилбар руу буцаах».
 * Буцаах нь өөрөө шинэ хувилбар — түүх устахгүй.
 */
export default function HistoryPanel({
  entity,
  id,
  dirty = false,
  refreshKey = 0,
  onRestored,
}: {
  entity: RevisionEntity;
  id: string;
  /** Засварлагчид хадгалаагүй өөрчлөлт байгаа эсэх — сэргээхийн өмнө анхааруулна */
  dirty?: boolean;
  /** Өөрчлөгдвөл жагсаалтыг дахин ачаална (ж: хадгалсны дараа) */
  refreshKey?: number;
  onRestored?: (result: RestoreResult) => void;
}) {
  const [list, setList] = useState<RevisionList | null>(null);
  const [items, setItems] = useState<RevisionListItem[]>([]);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, RevisionDetail | "error">>({});
  const [confirm, setConfirm] = useState<{ version: number; warning: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const next = await fetchRevisions(entity, id, 1);
      setList(next);
      setItems(next.items);
      setDetails({});
    } catch (e) {
      setForbidden(e instanceof ApiError && e.status === 403);
      setError(errorText(e, "Түүх ачаалж чадсангүй"));
    }
  }, [entity, id]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load, refreshKey]);

  async function loadMore() {
    if (!list) return;
    setMoreBusy(true);
    try {
      const next = await fetchRevisions(entity, id, list.page + 1);
      setList(next);
      setItems((prev) => [...prev, ...next.items.filter((i) => !prev.some((p) => p.version === i.version))]);
    } catch (e) {
      toast.error(errorText(e, "Ачаалж чадсангүй"));
    } finally {
      setMoreBusy(false);
    }
  }

  function toggle(version: number) {
    setOpen((cur) => (cur === version ? null : version));
    if (details[version] && details[version] !== "error") return;
    fetchRevision(entity, id, version)
      .then((d) => setDetails((prev) => ({ ...prev, [version]: d })))
      .catch(() => setDetails((prev) => ({ ...prev, [version]: "error" })));
  }

  async function restore(version: number, confirmAnswer: boolean) {
    if (!list) return;
    setBusy(true);
    try {
      const result = await restoreRevision(entity, id, version, {
        expectedVersion: list.currentVersion,
        ...(confirmAnswer ? { confirm: true } : {}),
      });
      setConfirm(null);
      setOpen(null);
      toast.success(
        result.skipped.length
          ? `${version}-р хувилбар руу буцаалаа. Түгжээтэй тул хэвээр: ${result.skipped.join(", ")}`
          : `${version}-р хувилбар руу буцаалаа`,
      );
      await load();
      onRestored?.(result);
    } catch (e) {
      const warning = confirmRequiredOf(e);
      if (warning) {
        setConfirm({ version, warning });
        return;
      }
      setConfirm(null);
      const conflict = versionConflictOf(e);
      if (conflict) {
        toast.error(`${conflict.message}. Түүхийг шинэчиллээ.`);
        await load();
        return;
      }
      toast.error(errorText(e, "Сэргээж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  // Багш — зөвхөн өөрийн үүсгэсэн/зассан: эрхгүй үед «Дахин оролдох» утгагүй
  if (error && forbidden) return <EmptyState icon={Lock} title="Түүх харах эрх алга" hint={error} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!list) return <LoadingState rows={4} label="Түүх ачаалж байна" />;

  const target = entity === "PROBLEM" ? "бодлогыг" : "тестийг";

  return (
    <div className="space-y-3">
      {list.createdBy && (
        <p className="text-xs text-ink-dim">
          <Meta items={[`Үүсгэсэн: ${list.createdBy}`, formatMnDateTime(list.createdAt, { dateStyle: "short" })]} />
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Өөрчлөлтийн түүх алга"
          hint={`Энэ ${target} засаж хадгалмагц хэн, хэзээ, юу өөрчилсөн нь энд харагдана.`}
        />
      ) : (
        <ol className="space-y-2">
          {items.map((item) => {
            const action = ACTION[item.action] ?? ACTION.UPDATE;
            const detail = details[item.version];
            const isOpen = open === item.version;
            return (
              <li key={item.version} className="overflow-hidden rounded-xl border border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(item.version)}
                  className={cn(
                    "flex min-h-11 w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    isOpen && "bg-brand-bright/5",
                  )}
                >
                  <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-label={action.label} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{item.summary}</span>
                    <span className="mt-0.5 block text-xs text-ink-dim">
                      <Meta
                        items={[
                          item.actorName,
                          <time key="t" dateTime={item.createdAt} title={formatMnDateTime(item.createdAt)}>
                            {relativeTimeMn(item.createdAt)}
                          </time>,
                          `${item.version}-р хувилбар`,
                        ]}
                      />
                    </span>
                    {item.reason && <span className="mt-0.5 block text-xs text-ink-dim">Шалтгаан: {item.reason}</span>}
                  </span>
                  {item.current && <Badge tone="brand">Одоогийн</Badge>}
                  <ChevronRight
                    className={cn("mt-0.5 h-4 w-4 shrink-0 text-ink-dim transition-transform", isOpen && "rotate-90")}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-line px-3 py-3">
                    {!detail ? (
                      <LoadingState rows={2} label="Ялгааг ачаалж байна" />
                    ) : detail === "error" ? (
                      <ErrorState message="Хувилбарыг ачаалж чадсангүй" onRetry={() => toggle(item.version)} />
                    ) : (
                      <>
                        {detail.previousVersion === null ? (
                          <SnapshotView snapshot={detail.snapshot} />
                        ) : (
                          <>
                            <p className="text-xs text-ink-dim">{detail.previousVersion}-р хувилбартай харьцуулав</p>
                            <RevisionDiff changes={detail.changes} />
                            <details className="group rounded-lg border border-line px-3 py-2">
                              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-soft [&::-webkit-details-marker]:hidden">
                                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
                                Энэ хувилбарын бүрэн агуулга
                              </summary>
                              <div className="mt-2">
                                <SnapshotView snapshot={detail.snapshot} />
                              </div>
                            </details>
                          </>
                        )}
                        {!item.current &&
                          (list.canRestore ? (
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirm({ version: item.version, warning: null })}
                            >
                              <RotateCcw aria-hidden /> Энэ хувилбар руу буцаах
                            </Button>
                          ) : (
                            <p className="text-xs text-ink-dim">Зөвхөн үүсгэсэн багш эсвэл Багш+ буцаана.</p>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {list.page * list.pageSize < list.total && (
        <Button size="sm" variant="ghost" type="button" disabled={moreBusy} onClick={() => void loadMore()}>
          {moreBusy ? "Ачаалж байна" : "Өмнөх өөрчлөлтүүд"}
        </Button>
      )}

      <ConfirmDialog
        open={!!confirm}
        busy={busy}
        title={confirm ? `${confirm.version}-р хувилбар руу буцаах уу?` : ""}
        description="Одоогийн хувилбар түүхэнд хадгалагдана — дараа нь дахин буцааж болно."
        confirmLabel={confirm?.warning ? "Хариуг ч буцаах" : "Буцаах"}
        danger={!!confirm?.warning}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void restore(confirm.version, !!confirm.warning)}
      >
        {(dirty || confirm?.warning) && (
          <div className="space-y-2 text-sm">
            {dirty && <p className="text-ink">Засварлагч дахь хадгалаагүй өөрчлөлт устна.</p>}
            {confirm?.warning && (
              <p role="alert" className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{confirm.warning}</span>
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
