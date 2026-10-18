"use client";

import { useId, useMemo, useState } from "react";
import { Lock, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { ExamSettings } from "@/components/exams/types";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ActionDialog from "./ActionDialog";
import { errorMessage, useVariantSettings, type MenuTest } from "./shared";

type ClassRow = ExamSettings["classes"][number];

interface MergedClass {
  id: string;
  name: string;
  /** testId → тухайн хувилбарын мөр */
  byTest: Record<string, ClassRow | undefined>;
}

/**
 * «Ангиуд»: тест аль ангид нээлттэй вэ. Нэг унтраалга A ба B хоёуланд
 * үйлчилнэ (POST/DELETE /exams/:testId/classes/:classroomId). Хувилбарууд
 * ялгаатай бол мөр бүрт «Зөвхөн A» гэж харуулна. Сурагч эхэлсэн ангийг
 * хаах боломжгүй (сервер 409) — урьдчилан тайлбарлана.
 */
export default function ClassesDialog({
  tests,
  onChanged,
  onClose,
}: {
  tests: MenuTest[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const settings = useVariantSettings(tests.map((t) => t.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const ready = !settings.loading && !settings.error && tests.every((t) => settings.byId[t.id]);

  const merged = useMemo<MergedClass[]>(() => {
    if (!ready) return [];
    const map = new Map<string, MergedClass>();
    for (const t of tests) {
      for (const c of settings.byId[t.id].classes) {
        const row = map.get(c.id) ?? { id: c.id, name: c.name, byTest: {} };
        row.byTest[t.id] = c;
        map.set(c.id, row);
      }
    }
    const isOpen = (c: MergedClass) => tests.some((t) => c.byTest[t.id]?.assigned);
    // Нээлттэй анги эхэнд, дараа нь нэрээр
    return [...map.values()].sort(
      (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || a.name.localeCompare(b.name, "mn"),
    );
  }, [ready, tests, settings.byId]);

  const q = query.trim().toLowerCase();
  const shown = q ? merged.filter((c) => c.name.toLowerCase().includes(q)) : merged;
  const openCount = merged.filter((c) => tests.some((t) => c.byTest[t.id]?.assigned)).length;
  const gate = ready && settings.byId[tests[0].id]?.permissions.reviewGate;
  const reviewDays = ready ? settings.byId[tests[0].id]?.reviewAutoDays : undefined;

  async function toggle(c: MergedClass, open: boolean) {
    if (busy) return;
    setBusy(c.id);
    setRowError(null);
    const targets = tests.filter((t) => !!c.byTest[t.id]?.assigned !== open);
    try {
      for (const t of targets) {
        const res = await api<ExamSettings>(
          `/exams/${encodeURIComponent(t.id)}/classes/${encodeURIComponent(c.id)}`,
          open
            ? { method: "POST", body: gate && reviewDays !== undefined ? { reviewAfterDays: reviewDays } : {} }
            : { method: "DELETE" },
        );
        settings.replace(t.id, res);
      }
      toast.success(open ? `«${c.name}» ангид нээлээ` : `«${c.name}» ангид хаалаа`);
      onChanged();
    } catch (e) {
      setRowError({ id: c.id, message: errorMessage(e, open ? "Ангид нээж чадсангүй" : "Ангид хааж чадсангүй") });
      // Хэсэгчлэн амжилттай байж болзошгүй — бодит төлөвийг дахин ачаална
      onChanged();
      settings.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ActionDialog
      title="Ангиуд"
      description={tests.length > 1 ? "Нээх, хаах нь A, B хувилбарт хамт үйлчилнэ" : "Тест нээлттэй ангиуд"}
      busy={!!busy}
      onClose={onClose}
      footer={
        <Button type="button" variant="ghost" disabled={!!busy} onClick={onClose}>
          Хаах
        </Button>
      }
    >
      {settings.error ? (
        <ErrorState message={settings.error} onRetry={settings.reload} />
      ) : !ready ? (
        <LoadingState rows={4} label="Ангиудыг ачаалж байна" />
      ) : merged.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Танд удирдах анги алга"
          hint="Ангид багшаар томилогдмогц энд гарч, тестийг нээх боломжтой болно"
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">
            {openCount > 0 ? `${openCount} ангид нээлттэй` : "Одоогоор аль ч ангид нээгээгүй"}
          </p>
          {merged.length > 8 && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Анги хайх
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Анги хайх"
                className="min-h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-base text-ink outline-none focus:border-brand"
              />
            </div>
          )}
          {shown.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-dim">«{query.trim()}» нэртэй анги олдсонгүй</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {shown.map((c) => (
                <ClassItem
                  key={c.id}
                  row={c}
                  tests={tests}
                  busy={busy === c.id}
                  disabled={!!busy}
                  error={rowError?.id === c.id ? rowError.message : ""}
                  onToggle={(open) => void toggle(c, open)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </ActionDialog>
  );
}

function ClassItem({
  row,
  tests,
  busy,
  disabled,
  error,
  onToggle,
}: {
  row: MergedClass;
  tests: MenuTest[];
  busy: boolean;
  disabled: boolean;
  error: string;
  onToggle: (open: boolean) => void;
}) {
  const labelId = useId();
  const assigned = tests.filter((t) => row.byTest[t.id]?.assigned);
  const all = assigned.length === tests.length;
  const some = assigned.length > 0;
  const started = assigned.some((t) => (row.byTest[t.id]?.startedCount ?? 0) > 0);
  const first = assigned[0] ? row.byTest[assigned[0].id] : undefined;
  const students = first?.studentCount ?? 0;
  const submitted = assigned.reduce((n, t) => n + (row.byTest[t.id]?.submittedCount ?? 0), 0);
  const lockedOpen = some && started;
  // Хэсэгчлэн нээлттэй бол дарахад бүгдэд нээнэ; бүгдэд нээлттэй бол хаана
  const nextOpen = !all;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p id={labelId} className="truncate font-semibold text-ink" title={row.name}>
            {row.name}
          </p>
          <Meta
            className="text-xs text-ink-dim"
            items={[
              some ? `${students} сурагч` : null,
              some ? `${submitted} дүн` : null,
              some && !all ? `Зөвхөн ${assigned.map((t) => t.variantLabel ?? "").join(", ")} нээлттэй` : null,
              !some ? "Нээгээгүй" : null,
            ]}
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={all}
          aria-labelledby={labelId}
          aria-describedby={lockedOpen ? `${labelId}-lock` : undefined}
          disabled={disabled || (lockedOpen && !nextOpen)}
          onClick={() => onToggle(nextOpen)}
          className="relative inline-flex h-11 w-16 shrink-0 items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-1 top-1/2 h-7 -translate-y-1/2 rounded-full border transition-colors",
              all ? "border-transparent bg-brand-bright" : some ? "border-brand-bright/50 bg-brand-bright/25" : "border-line bg-ink/10",
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow transition-transform",
              all ? "translate-x-9" : some ? "translate-x-[1.375rem]" : "translate-x-2",
              busy && "animate-pulse",
            )}
          />
          <span className="sr-only">{all ? "Нээлттэй" : some ? "Хэсэгчлэн нээлттэй" : "Хаалттай"}</span>
        </button>
      </div>
      {lockedOpen && (
        <p id={`${labelId}-lock`} className="mt-1 flex items-center gap-1.5 text-xs text-ink-dim">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Сурагч эхэлсэн тул хаах боломжгүй
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </li>
  );
}
