"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Check, ChevronLeft, ChevronRight, ClipboardCheck, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate, formatMnDateTime } from "@/lib/dateMn";
import { byFirstName, rosterNames, shortName, staffName } from "@/lib/personName";
import { Segmented } from "./parts";
import type { CheckMark, CheckPerson, ClassCheck, ClassChecksResponse } from "./types";

type Filter = "all" | "left" | "done";

const mnt = (n: number) => `${n.toLocaleString("en-US")}₮`;
const md = (iso: string) => formatMnDate(iso, { month: "2-digit", day: "2-digit" });
const mdhm = (iso: string) => formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

function withMark(c: ClassCheck, studentId: string, mark: CheckMark | null): ClassCheck {
  const rest = c.marks.filter((m) => m.studentId !== studentId);
  return { ...c, marks: mark ? [...rest, mark] : rest };
}

/** N/M ба цугларсан мөнгө — N/M одоогийн сурагчаар, гарсан ч тэмдэглэгдсэний мөнгө орно */
function summary(c: ClassCheck, rosterIds: Set<string>) {
  let done = 0;
  let former = 0;
  for (const m of c.marks) {
    if (!m.checked) continue;
    if (rosterIds.has(m.studentId)) done += 1;
    else former += 1;
  }
  return { done, total: rosterIds.size, former, collected: c.amount === null ? null : (done + former) * c.amount };
}

/**
 * «Чек» (эзэн 2026-10-22) — ангийн нэртэй шалгах жагсаалт: «Номны мөнгө 25,000₮».
 * Дарах бүрд шууд хадгална (optimistic, алдаа гарвал буцаана). Нэг сурагчийн
 * дараалсан даралт дарааллаараа илгээгдэнэ; сервер (checkId, studentId)-аар upsert.
 */
export default function ClassChecksPanel({
  classroomId,
  onClose,
  onOpenCountChange,
}: {
  classroomId: string;
  onClose: () => void;
  onOpenCountChange?: (n: number) => void;
}) {
  const [data, setData] = useState<ClassChecksResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const base = `/classrooms/${encodeURIComponent(classroomId)}/checks`;

  // Нэг сурагчийн даралтын дараалал, хамгийн сүүлийн даралтын дугаар, серверийн баталсан төлөв
  const queue = useRef(new Map<string, Promise<void>>());
  const seq = useRef(new Map<string, number>());
  const confirmed = useRef(new Map<string, CheckMark | null>());
  const inflight = useRef(0);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ClassChecksResponse>(base));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Чекүүдийг ачаалж чадсангүй");
    }
  }, [base]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Өөр апп руу (ж: банк) шилжээд буцахад нөгөө багшийн тэмдэглэсэн нь харагдана
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && inflight.current === 0) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const openCount = data?.checks.length;
  useEffect(() => {
    if (openCount !== undefined) onOpenCountChange?.(openCount);
  }, [openCount, onOpenCountChange]);

  const updateCheck = useCallback((id: string, fn: (c: ClassCheck) => ClassCheck) => {
    setData((d) =>
      d && {
        ...d,
        checks: d.checks.map((c) => (c.id === id ? fn(c) : c)),
        archived: d.archived.map((c) => (c.id === id ? fn(c) : c)),
      },
    );
  }, []);

  const markSaving = useCallback((key: string, on: boolean) => {
    setSaving((s) => {
      if (s.has(key) === on) return s;
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (check: ClassCheck, studentId: string) => {
      const key = `${check.id}:${studentId}`;
      const current = check.marks.find((m) => m.studentId === studentId) ?? null;
      const next = !(current?.checked ?? false);
      if (!confirmed.current.has(key)) confirmed.current.set(key, current);
      const n = (seq.current.get(key) ?? 0) + 1;
      seq.current.set(key, n);
      inflight.current += 1;
      markSaving(key, true);
      updateCheck(check.id, (c) =>
        withMark(c, studentId, { studentId, checked: next, updatedAt: new Date().toISOString(), updatedBy: current?.updatedBy ?? null }),
      );
      const send = async () => {
        try {
          const saved = await api<CheckMark>(`${base}/${encodeURIComponent(check.id)}/students/${encodeURIComponent(studentId)}`, {
            method: "PUT",
            body: { checked: next },
          });
          if (seq.current.get(key) !== n) {
            confirmed.current.set(key, saved);
            return;
          }
          confirmed.current.delete(key);
          updateCheck(check.id, (c) => withMark(c, studentId, saved));
        } catch (err) {
          if (seq.current.get(key) !== n) return;
          const prev = confirmed.current.get(key) ?? null;
          confirmed.current.delete(key);
          updateCheck(check.id, (c) => withMark(c, studentId, prev));
          toast.error(err instanceof Error ? err.message : "Хадгалж чадсангүй — дахин дарна уу");
        } finally {
          inflight.current -= 1;
          if (seq.current.get(key) === n) markSaving(key, false);
        }
      };
      const p = (queue.current.get(key) ?? Promise.resolve()).then(send);
      queue.current.set(key, p);
      void p.finally(() => {
        if (queue.current.get(key) === p) queue.current.delete(key);
      });
    },
    [base, markSaving, updateCheck],
  );

  async function create(title: string, amount: number | null) {
    const created = await api<ClassCheck>(base, { method: "POST", body: { title, amount } });
    setData((d) => d && { ...d, checks: [created, ...d.checks] });
    setCreating(false);
    setSelectedId(created.id);
    toast.success("Чек нээлээ");
  }

  async function patch(id: string, body: { title?: string; amount?: number | null; archived?: boolean }) {
    const updated = await api<ClassCheck>(`${base}/${encodeURIComponent(id)}`, { method: "PATCH", body });
    setData((d) => {
      if (!d) return d;
      const wasArchived = d.archived.some((c) => c.id === id);
      const isArchived = !!updated.archivedAt;
      if (wasArchived === isArchived) {
        const put = (list: ClassCheck[]) => list.map((c) => (c.id === id ? updated : c));
        return { ...d, checks: put(d.checks), archived: put(d.archived) };
      }
      const checks = d.checks.filter((c) => c.id !== id);
      const archived = d.archived.filter((c) => c.id !== id);
      return isArchived
        ? { ...d, checks, archived: [updated, ...archived] }
        : { ...d, checks: [updated, ...checks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), archived };
    });
    return updated;
  }

  /** Устгах — сервер дээр зөөлөн (deletedAt): мөр, тэмдэглэгээ хадгалагдана, жагсаалтаас алга болно */
  async function remove(id: string) {
    await api(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    setData((d) => d && { ...d, checks: d.checks.filter((c) => c.id !== id), archived: d.archived.filter((c) => c.id !== id) });
    setSelectedId(null);
    toast.success("Чекийг устгалаа");
  }

  const roster = useMemo(() => (data ? [...data.students].sort(byFirstName) : []), [data]);
  const rosterIds = useMemo(() => new Set(roster.map((s) => s.id)), [roster]);
  const names = useMemo(() => rosterNames([...(data?.students ?? []), ...(data?.former ?? [])]), [data]);
  const selected = data && selectedId ? ([...data.checks, ...data.archived].find((c) => c.id === selectedId) ?? null) : null;

  return (
    <section aria-labelledby="checks-title" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 shrink-0 text-brand-soft" aria-hidden />
        <h2 id="checks-title" className="min-w-0 flex-1 truncate text-lg font-bold text-ink">
          Чек
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Чекийн хэсгийг хаах"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-3">
        {error && !data && <ErrorState message={error} onRetry={() => void load()} />}
        {!data && !error && (
          <div role="status" aria-label="Чекүүд ачаалж байна">
            <SkeletonRows rows={4} />
          </div>
        )}
        {data && selected && (
          <CheckDetail
            check={selected}
            roster={roster}
            rosterIds={rosterIds}
            former={data.former}
            names={names}
            saving={saving}
            onBack={() => setSelectedId(null)}
            onToggle={(sid) => toggle(selected, sid)}
            onPatch={(body) => patch(selected.id, body)}
            onDelete={() => remove(selected.id)}
          />
        )}
        {data && !selected && (
          <CheckList
            data={data}
            rosterIds={rosterIds}
            creating={creating}
            onCreate={() => setCreating(true)}
            onCancelCreate={() => setCreating(false)}
            onSubmitCreate={create}
            onOpen={setSelectedId}
          />
        )}
      </div>
    </section>
  );
}

function CheckList({
  data,
  rosterIds,
  creating,
  onCreate,
  onCancelCreate,
  onSubmitCreate,
  onOpen,
}: {
  data: ClassChecksResponse;
  rosterIds: Set<string>;
  creating: boolean;
  onCreate: () => void;
  onCancelCreate: () => void;
  onSubmitCreate: (title: string, amount: number | null) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {creating ? (
        <CheckForm submitLabel="Нээх" onSubmit={onSubmitCreate} onCancel={onCancelCreate} />
      ) : (
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onCreate}>
          <Plus aria-hidden /> Шинэ чек
        </Button>
      )}

      {data.checks.length === 0 && !creating && (
        <EmptyState
          icon={ClipboardCheck}
          title="Нээлттэй чек алга"
          hint="Номны мөнгө, шалгалтын цаас гэх мэтийг нэрлэж нээгээд хүүхэд бүрийг тэмдэглэнэ"
        />
      )}

      {data.checks.length > 0 && (
        <ul className="space-y-2">
          {data.checks.map((c) => (
            <li key={c.id}>
              <CheckRow check={c} rosterIds={rosterIds} onOpen={() => onOpen(c.id)} />
            </li>
          ))}
        </ul>
      )}

      {data.archived.length > 0 && (
        <details className="group rounded-xl">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" aria-hidden />
            Хаагдсан
            <span className="rounded-full bg-ink/8 px-1.5 text-xs tabular-nums">{data.archived.length}</span>
          </summary>
          <ul className="mt-1 space-y-1.5">
            {data.archived.map((c) => (
              <li key={c.id}>
                <CheckRow check={c} rosterIds={rosterIds} onOpen={() => onOpen(c.id)} quiet />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CheckRow({
  check,
  rosterIds,
  onOpen,
  quiet = false,
}: {
  check: ClassCheck;
  rosterIds: Set<string>;
  onOpen: () => void;
  quiet?: boolean;
}) {
  const s = summary(check, rosterIds);
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "row-interactive flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-brand",
        quiet ? "bg-bg/60" : "bg-surface",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className={cn("truncate font-semibold", quiet ? "text-ink-dim" : "text-ink")}>{check.title}</span>
          {check.amount !== null && <span className="shrink-0 text-sm tabular-nums text-ink-dim">{mnt(check.amount)}</span>}
        </span>
        {!quiet && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
          </span>
        )}
        <Meta
          className="mt-1 text-xs text-ink-dim"
          items={[
            <span key="n" className="font-semibold tabular-nums text-ink">
              {s.done}/{s.total}
            </span>,
            s.collected !== null && s.collected > 0 ? mnt(s.collected) : null,
            quiet && check.archivedAt
              ? `${staffName(check.archivedBy) ?? "Хэн нэгэн"} хаасан, ${md(check.archivedAt)}`
              : `${staffName(check.createdBy) ?? "Хэн нэгэн"} нээсэн, ${md(check.createdAt)}`,
          ]}
        />
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
    </button>
  );
}

function CheckDetail({
  check,
  roster,
  rosterIds,
  former,
  names,
  saving,
  onBack,
  onToggle,
  onPatch,
  onDelete,
}: {
  check: ClassCheck;
  roster: CheckPerson[];
  rosterIds: Set<string>;
  former: CheckPerson[];
  names: Map<string, string>;
  saving: Set<string>;
  onBack: () => void;
  onToggle: (studentId: string) => void;
  onPatch: (body: { title?: string; amount?: number | null; archived?: boolean }) => Promise<ClassCheck>;
  onDelete: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const archived = !!check.archivedAt;
  const s = summary(check, rosterIds);
  const markBy = useMemo(() => new Map(check.marks.map((m) => [m.studentId, m])), [check.marks]);
  const formerChecked = former.filter((p) => markBy.get(p.id)?.checked);
  const shown = roster.filter((p) => {
    const on = !!markBy.get(p.id)?.checked;
    return filter === "all" || (filter === "done" ? on : !on);
  });

  async function setArchived(value: boolean) {
    setBusy(true);
    try {
      await onPatch({ archived: value });
      toast.success(value ? "Чекийг хаалаа" : "Чекийг сэргээлээ");
      setConfirm(null);
      if (value) onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Устгаж чадсангүй");
      setBusy(false);
    }
  }

  const actionClass =
    "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand hover:bg-brand-bright/8 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Бүх чек
      </button>

      {editing ? (
        <CheckForm
          initialTitle={check.title}
          initialAmount={check.amount}
          submitLabel="Хадгалах"
          onCancel={() => setEditing(false)}
          onSubmit={async (title, amount) => {
            await onPatch({ title, amount });
            toast.success("Хадгаллаа");
            setEditing(false);
          }}
        />
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-extrabold tracking-tight text-ink">{check.title}</h3>
            <p className="mt-0.5 text-sm text-ink-dim">
              {staffName(check.createdBy) ?? "Хэн нэгэн"} нээсэн, {md(check.createdAt)}
            </p>
          </div>
          {!archived && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Нэр, дүнг засах"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl bg-bg/60 p-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-3xl font-bold tabular-nums text-ink" aria-label={`${s.total}-аас ${s.done} тэмдэглэгдсэн`}>
            {s.done}
            <span className="text-lg font-semibold text-ink-dim">/{s.total}</span>
          </p>
          {s.collected !== null && check.amount !== null && (
            <p className="text-sm text-ink-dim">
              <span className="font-semibold tabular-nums text-ink">{mnt(s.collected)}</span> цугларсан
              <span className="block text-xs">Нэг хүүхэд {mnt(check.amount)}</span>
            </p>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <span className="block h-full rounded-full bg-success transition-transform" style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
        </div>
      </div>

      {archived && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-ink-dim">
          <Archive className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Хаагдсан — {staffName(check.archivedBy) ?? "хэн нэгэн"}, {check.archivedAt ? md(check.archivedAt) : ""}
          </span>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void setArchived(false)}>
            <ArchiveRestore aria-hidden /> Сэргээх
          </Button>
        </div>
      )}

      {roster.length > 0 && (
        <Segmented
          label="Шүүлт"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Бүгд", count: s.total },
            { value: "left", label: "Үлдсэн", count: s.total - s.done },
            { value: "done", label: "Болсон", count: s.done },
          ]}
        />
      )}

      {roster.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Ангид одоо сурагч алга" hint="Сурагч бүртгэгдэхэд энд жагсана" />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-dim">
          {filter === "done" ? "Тэмдэглэсэн хүүхэд алга" : "Бүгд болсон"}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {shown.map((p) => (
            <li key={p.id}>
              <StudentToggle
                name={names.get(p.id) ?? shortName(p.firstName, p.lastName)}
                mark={markBy.get(p.id) ?? null}
                saving={saving.has(`${check.id}:${p.id}`)}
                disabled={archived}
                onToggle={() => onToggle(p.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {formerChecked.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-dim">Ангиас гарсан</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line opacity-80">
            {formerChecked.map((p) => (
              <li key={p.id}>
                <StudentToggle name={names.get(p.id) ?? shortName(p.firstName, p.lastName)} mark={markBy.get(p.id) ?? null} saving={false} disabled onToggle={() => undefined} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirm === "archive" ? (
        <div role="group" aria-label="Чекийг хаах уу" className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-ink">Хаасан чек «Хаагдсан» хэсэгт түүхтэйгээ үлдэнэ</p>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void setArchived(true)}>
            Тийм, хаах
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
            Болих
          </Button>
        </div>
      ) : confirm === "delete" ? (
        <div role="group" aria-label="Чекийг устгах уу" className="flex flex-wrap items-center gap-2 rounded-xl border border-error/40 bg-error/5 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-ink">
            «{check.title}» чек бүх жагсаалтаас алга болно. Тэмдэглэгээ нь системд хадгалагдан үлдэнэ
          </p>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>
            Тийм, устгах
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
            Болих
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4">
          {!archived && (
            <button type="button" onClick={() => setConfirm("archive")} className={actionClass}>
              <Archive className="h-4 w-4" aria-hidden /> Чекийг хаах
            </button>
          )}
          <button type="button" onClick={() => setConfirm("delete")} className={cn(actionClass, "hover:text-error")}>
            <Trash2 className="h-4 w-4" aria-hidden /> Устгах
          </button>
        </div>
      )}
    </div>
  );
}

/** Нэг сурагч — мөр бүхэлдээ дарагдана (утсан дээр том талбай) */
function StudentToggle({
  name,
  mark,
  saving,
  disabled,
  onToggle,
}: {
  name: string;
  mark: CheckMark | null;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const on = !!mark?.checked;
  const by = mark?.updatedBy ? staffName(mark.updatedBy) : null;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onToggle}
      aria-label={`${name} — ${on ? "тэмдэглэсэн, болиулах" : "тэмдэглэх"}`}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
        on ? "bg-success/10" : "bg-surface",
        !disabled && "hover:bg-panel active:bg-panel",
        disabled && "cursor-default",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{name}</span>
        {(saving || (mark && by)) && (
          <span className="block truncate text-xs text-ink-dim">
            {saving ? "Хадгалж байна" : `${by} ${mdhm(mark!.updatedAt)}`}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          on ? "border-success bg-success text-on-success" : "border-line text-ink-dim",
        )}
      >
        {on ? <Check className="h-5 w-5" strokeWidth={3} /> : <Plus className="h-5 w-5" />}
      </span>
    </button>
  );
}

/** Нэр + заавал биш дүн (₮). Дүнг «25,000» хэлбэрээр харуулна. */
function CheckForm({
  initialTitle = "",
  initialAmount = null,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialTitle?: string;
  initialAmount?: number | null;
  submitLabel: string;
  onSubmit: (title: string, amount: number | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-ink-dim/70 focus-visible:outline-2 focus-visible:outline-brand";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.replace(/\s+/g, " ").trim();
    if (!t) {
      setErr("Чекийн нэрээ бичнэ үү");
      return;
    }
    const n = amount ? Number(amount) : null;
    setBusy(true);
    setErr("");
    try {
      await onSubmit(t, n && n > 0 ? n : null);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-bg/60 p-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">Нэр</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          autoFocus
          placeholder="Номны мөнгө"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">
          Нэг хүүхдийн дүн <span className="font-normal text-ink-dim">(заавал биш)</span>
        </span>
        <span className="relative block">
          <input
            value={amount ? Number(amount).toLocaleString("en-US") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))}
            inputMode="numeric"
            placeholder="25,000"
            className={cn(inputClass, "pr-8 tabular-nums")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim" aria-hidden>
            ₮
          </span>
        </span>
      </label>
      {err && (
        <p role="alert" className="text-sm text-error">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Болих
        </Button>
      </div>
    </form>
  );
}
