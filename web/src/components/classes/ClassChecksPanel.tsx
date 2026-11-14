"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, ChevronLeft, ChevronRight, ClipboardCheck, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate, formatMnDateTime } from "@/lib/dateMn";
import { byFirstName, rosterNames, shortName, staffName } from "@/lib/personName";
import BookMarkSheet, { type BookSheetTarget } from "@/components/book-money/BookMarkSheet";
import { BOOKS, SHEET_KINDS, type BookMarkInput } from "@/components/book-money/books";
import CheckStudentSheet from "./CheckStudentSheet";
import { Segmented } from "./parts";
import type { CheckMark, CheckPerson, ClassCheck, ClassChecksResponse } from "./types";

type Filter = "all" | "left" | "done";

const mnt = (n: number) => `${n.toLocaleString("en-US")}₮`;
/** API-ийн CHECK_AMOUNT_MAX-тай ижил */
const AMOUNT_MAX = 100_000_000;
const md = (iso: string) => formatMnDate(iso, { month: "2-digit", day: "2-digit" });
const mdhm = (iso: string) => formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

function withMark(c: ClassCheck, studentId: string, mark: CheckMark | null): ClassCheck {
  const rest = c.marks.filter((m) => m.studentId !== studentId);
  return { ...c, marks: mark ? [...rest, mark] : rest };
}

/** Серверт илгээх тэмдэглэгээ — номын чекэд нэмэлт талбартай */
type MarkBody = { checked: boolean; skipped?: boolean; amount?: number; collectedById?: string; note?: string | null };

/**
 * N/M ба цугларсан мөнгө — N/M одоогийн сурагчаар, гарсан ч тэмдэглэгдсэний мөнгө орно.
 * Номын чек: «авахгүй» хүүхэд M-д орохгүй; өөр ангид төлсөн нь N-д орно (төлсөн),
 * харин мөнгө нь тэр ангийнх тул энд цугларсанд орохгүй; дүн нь сурагч бүрийнхээр.
 */
function summary(c: ClassCheck, rosterIds: Set<string>) {
  let done = 0;
  let former = 0;
  let skipped = 0;
  let bookSum = 0;
  for (const m of c.marks) {
    const inRoster = rosterIds.has(m.studentId);
    if (m.skipped) {
      if (inRoster) skipped += 1;
      continue;
    }
    if (!m.checked) continue;
    if (inRoster) done += 1;
    else former += 1;
    if (!m.elsewhere) bookSum += m.amount ?? 0;
  }
  const collected = c.bookKey ? bookSum : c.amount === null ? null : (done + former) * c.amount;
  return { done, total: rosterIds.size - skipped, former, skipped, collected };
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
  // Хаах хөдөлгөөний үеэр нэр алга болохгүйн тулд сүүлийн хүүхдийг хадгална
  const [infoFor, setInfoFor] = useState<CheckPerson | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const base = `/classrooms/${encodeURIComponent(classroomId)}/checks`;

  // Нэг сурагчийн даралтын дараалал, хамгийн сүүлийн даралтын дугаар, серверийн баталсан төлөв
  const queue = useRef(new Map<string, Promise<void>>());
  const seq = useRef(new Map<string, number>());
  const confirmed = useRef(new Map<string, CheckMark | null>());
  const inflight = useRef(0);
  // Тэмдэглэгээ алдаатай бол (өөр багш чекийг хаасан/устгасан, сурагч ангиас гарсан)
  // бүх даралт дуусмагц серверээс дахин уншина — дэлгэц хуучин төлөвтэй үлдэхгүй
  const resync = useRef(false);

  /** quiet = арын шинэчлэл: хадгалж буй даралт байвал хариуг хаяна (optimistic төлөвийг дарахгүй) */
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setError("");
      try {
        const res = await api<ClassChecksResponse>(base);
        if (quiet && inflight.current > 0) return;
        setData(res);
      } catch (err) {
        if (!quiet) setError(err instanceof Error ? err.message : "Чекүүдийг ачаалж чадсангүй");
      }
    },
    [base],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Өөр апп руу (ж: банк) шилжээд буцахад нөгөө багшийн тэмдэглэсэн нь харагдана
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && inflight.current === 0) void load(true);
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

  const mark = useCallback(
    (check: ClassCheck, studentId: string, body: MarkBody) => {
      const key = `${check.id}:${studentId}`;
      const current = check.marks.find((m) => m.studentId === studentId) ?? null;
      const next = body.checked;
      // Номын чек: сервер хариулах хүртэл дүн, төлөвийг урьдчилан харуулна
      const bookFields = check.bookKey
        ? {
            skipped: !!body.skipped,
            amount: next ? (body.amount ?? check.amount) : null,
            collectedBy: next ? (current?.collectedBy ?? null) : null,
            note: body.note ?? null,
            elsewhere: null,
          }
        : {};
      if (!confirmed.current.has(key)) confirmed.current.set(key, current);
      const n = (seq.current.get(key) ?? 0) + 1;
      seq.current.set(key, n);
      inflight.current += 1;
      markSaving(key, true);
      updateCheck(check.id, (c) =>
        withMark(c, studentId, {
          studentId,
          checked: next,
          updatedAt: new Date().toISOString(),
          updatedBy: current?.updatedBy ?? null,
          ...bookFields,
        }),
      );
      const send = async () => {
        try {
          const saved = await api<CheckMark>(`${base}/${encodeURIComponent(check.id)}/students/${encodeURIComponent(studentId)}`, {
            method: "PUT",
            body,
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
          resync.current = true;
        } finally {
          inflight.current -= 1;
          if (seq.current.get(key) === n) markSaving(key, false);
          if (inflight.current === 0 && resync.current) {
            resync.current = false;
            void load(true);
          }
        }
      };
      const p = (queue.current.get(key) ?? Promise.resolve()).then(send);
      queue.current.set(key, p);
      void p.finally(() => {
        if (queue.current.get(key) === p) queue.current.delete(key);
      });
    },
    [base, load, markSaving, updateCheck],
  );

  /** Дугуй товч: тэмдэглэх/болиулах. Өөр ангид төлсөн мөрийг эндээс хөндөхгүй */
  const toggle = useCallback(
    (check: ClassCheck, studentId: string) => {
      const current = check.marks.find((m) => m.studentId === studentId) ?? null;
      if (current?.elsewhere) return;
      mark(check, studentId, { checked: !(current?.checked ?? false) });
    },
    [mark],
  );

  async function create(title: string, amount: number | null, bookKey: string | null) {
    const created = await api<ClassCheck>(base, {
      method: "POST",
      body: bookKey ? { bookKey, amount } : { title, amount },
    });
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
            onMark={(sid, body) => mark(selected, sid, body)}
            onPatch={(body) => patch(selected.id, body)}
            onDelete={() => remove(selected.id)}
            onOpenInfo={(p) => {
              setInfoFor(p);
              setInfoOpen(true);
            }}
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
      <CheckStudentSheet classroomId={classroomId} student={infoFor} open={infoOpen} onClose={() => setInfoOpen(false)} />
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
  onSubmitCreate: (title: string, amount: number | null, bookKey: string | null) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  // Нэг ангид нэг номын ганц чек — нээсэн (нуусан ч) номыг дахин сонгуулахгүй
  const usedBooks = new Set([...data.checks, ...data.archived].flatMap((c) => (c.bookKey ? [c.bookKey] : [])));
  return (
    <div className="space-y-3">
      {creating ? (
        <CheckForm chooseKind usedBooks={usedBooks} submitLabel="Нээх" onSubmit={onSubmitCreate} onCancel={onCancelCreate} />
      ) : (
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onCreate}>
          <Plus aria-hidden /> Шинэ чек
        </Button>
      )}

      {data.checks.length === 0 && !creating && (
        <EmptyState
          icon={ClipboardCheck}
          title="Нээлттэй чек алга"
          hint="Ном эсвэл шалгалтаа сонгож, бусад зүйлийг нэрлэж нээгээд хүүхэд бүрийг тэмдэглэнэ"
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
            Нуусан
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
            s.skipped > 0 ? `${s.skipped} авахгүй` : null,
            quiet && check.archivedAt
              ? `${staffName(check.archivedBy) ?? "Хэн нэгэн"} нуусан, ${md(check.archivedAt)}`
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
  onMark,
  onPatch,
  onDelete,
  onOpenInfo,
}: {
  check: ClassCheck;
  roster: CheckPerson[];
  rosterIds: Set<string>;
  former: CheckPerson[];
  names: Map<string, string>;
  saving: Set<string>;
  onBack: () => void;
  onToggle: (studentId: string) => void;
  onMark: (studentId: string, body: MarkBody) => void;
  onPatch: (body: { title?: string; amount?: number | null; archived?: boolean }) => Promise<ClassCheck>;
  onDelete: () => Promise<void>;
  onOpenInfo: (student: CheckPerson) => void;
}) {
  const [filter, setFilterState] = useState<Filter>("all");
  // «Үлдсэн/Болсон» шүүлттэй үед дарсан хүүхэд шууд алга болохгүй (андуурч дарвал
  // буцааж болиулна) — шүүлт солиход л жагсаалт шинэчлэгдэнэ
  const [sticky, setSticky] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  // Номын чекийн «⋯» — авсан багш, дүн, авахгүй
  const [moreFor, setMoreFor] = useState<CheckPerson | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const isBook = !!check.bookKey;
  const archived = !!check.archivedAt;
  const s = summary(check, rosterIds);
  const markBy = useMemo(() => new Map(check.marks.map((m) => [m.studentId, m])), [check.marks]);
  const formerChecked = former.filter((p) => markBy.get(p.id)?.checked);
  const shown = roster.filter((p) => {
    if (filter === "all" || sticky.has(p.id)) return true;
    const m = markBy.get(p.id);
    return filter === "done" ? !!m?.checked : !m?.checked && !m?.skipped;
  });

  function setFilter(f: Filter) {
    setFilterState(f);
    setSticky(new Set());
  }

  function toggleStudent(id: string) {
    if (filter !== "all") setSticky((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    onToggle(id);
  }

  async function setArchived(value: boolean) {
    setBusy(true);
    try {
      await onPatch({ archived: value });
      toast.success(value ? "Чекийг нуулаа" : "Чекийг буцааж гаргалаа");
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
    "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";
  const left = s.total - s.done;
  const moreMark = moreFor ? (markBy.get(moreFor.id) ?? null) : null;
  const moreTarget: BookSheetTarget | null = moreFor && {
    studentId: moreFor.id,
    studentName: names.get(moreFor.id) ?? shortName(moreFor.firstName, moreFor.lastName),
    bookTitle: check.title,
    price: check.amount,
    status: moreMark?.checked ? "PAID" : moreMark?.skipped ? "SKIPPED" : null,
    amount: moreMark?.amount ?? null,
    collectedBy: moreMark?.collectedBy ?? null,
    note: moreMark?.note ?? null,
    lockedClassName: moreMark?.elsewhere ? (moreMark.elsewhere.name ?? "Өөр") : null,
  };

  function saveMore(input: BookMarkInput) {
    if (!moreFor) return;
    if (filter !== "all") setSticky((prev) => (prev.has(moreFor.id) ? prev : new Set(prev).add(moreFor.id)));
    onMark(
      moreFor.id,
      input.status === "PAID"
        ? { checked: true, amount: input.amount, collectedById: input.collectedById, note: input.note }
        : input.status === "SKIPPED"
          ? { checked: false, skipped: true, note: input.note }
          : { checked: false },
    );
  }

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
          fixedBook={isBook}
          submitLabel="Хадгалах"
          onCancel={() => setEditing(false)}
          onSubmit={async (title, amount) => {
            // Өөрчлөлтгүй бол серверт явуулахгүй, «Хадгаллаа» гэж худал хэлэхгүй
            if (title !== check.title || amount !== check.amount) {
              await onPatch({ title, amount });
              toast.success("Хадгаллаа");
            }
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
              onClick={() => {
                setConfirm(null);
                setEditing(true);
              }}
              disabled={busy}
              aria-label={isBook ? "Үнийг засах" : "Нэр, дүнг засах"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
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
              <span className="block text-xs">
                {isBook ? "Үнэ" : "Нэг хүүхэд"} {mnt(check.amount)}
                {s.skipped > 0 ? `, ${s.skipped} хүүхэд авахгүй` : ""}
              </span>
            </p>
          )}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <span className="block h-full rounded-full bg-success transition-transform" style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
        </div>
      </div>

      {archived && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-ink-dim">
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Нуусан — {staffName(check.archivedBy) ?? "хэн нэгэн"}, {check.archivedAt ? md(check.archivedAt) : ""}
          </span>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void setArchived(false)}>
            <Eye aria-hidden /> {busy ? "Гаргаж байна" : "Буцааж гаргах"}
          </Button>
        </div>
      )}

      {roster.length > 0 && (
        <Segmented
          label="Шүүлт"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Бүгд", count: roster.length },
            { value: "left", label: "Үлдсэн", count: left },
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
              <StudentRow
                name={names.get(p.id) ?? shortName(p.firstName, p.lastName)}
                mark={markBy.get(p.id) ?? null}
                saving={saving.has(`${check.id}:${p.id}`)}
                disabled={archived || busy}
                book={isBook ? { price: check.amount } : undefined}
                onToggle={() => toggleStudent(p.id)}
                onInfo={() => onOpenInfo(p)}
                onMore={() => {
                  setMoreFor(p);
                  setMoreOpen(true);
                }}
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
                <StudentRow
                  name={names.get(p.id) ?? shortName(p.firstName, p.lastName)}
                  mark={markBy.get(p.id) ?? null}
                  saving={false}
                  disabled
                  book={isBook ? { price: check.amount, readOnly: true } : undefined}
                  onToggle={() => undefined}
                  onInfo={() => onOpenInfo(p)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? null : confirm === "archive" ? (
        <div role="group" aria-label="Чекийг нуух уу" className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-ink">
            {left > 0 && <span className="block font-semibold text-warning">{left} хүүхэд тэмдэглэгдээгүй байна</span>}
            Нуусан чек «Нуусан» хэсэгт түүхтэйгээ үлдэнэ, хэзээ ч буцааж гаргаж болно
          </p>
          <Button size="sm" disabled={busy} onClick={() => void setArchived(true)}>
            {busy ? "Нууж байна" : "Тийм, нуух"}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
            Болих
          </Button>
        </div>
      ) : confirm === "delete" ? (
        <div role="group" aria-label="Чекийг устгах уу" className="flex flex-wrap items-center gap-2 rounded-xl border border-error/40 bg-error/5 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-ink">
            «{check.title}» чек бүх жагсаалтаас алга болж, буцааж гаргах боломжгүй
            {s.done + s.former > 0 ? ` (${s.done + s.former} хүүхэд тэмдэглэгдсэн)` : ""}.{" "}
            {isBook
              ? "Хүүхэд бүрийн төлбөрийн бүртгэл сурагчийн хуудас, «Номын мөнгө» самбарт хэвээр үлдэнэ. Дууссан чекийг устгахын оронд нуухыг зөвлөе"
              : "Тэмдэглэгээ нь системд хадгалагдан үлдэнэ"}
          </p>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void remove()}>
            {busy ? "Устгаж байна" : "Тийм, устгах"}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(null)}>
            Болих
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4">
          {!archived && (
            <button type="button" disabled={busy} onClick={() => setConfirm("archive")} className={actionClass}>
              <EyeOff className="h-4 w-4" aria-hidden /> Чекийг нуух
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => setConfirm("delete")} className={cn(actionClass, "hover:text-error")}>
            <Trash2 className="h-4 w-4" aria-hidden /> Устгах
          </button>
        </div>
      )}
      {isBook && (
        <BookMarkSheet
          target={moreTarget}
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          onSave={async (input) => saveMore(input)}
        />
      )}
    </div>
  );
}

/**
 * Нэг сурагч — нэр дээр дарвал товч мэдээлэл (утас г.м.), баруун талын том
 * дугуй хэсэг дээр дарвал тэмдэглэнэ/болиулна (утсан дээр 64px өргөн талбай).
 */
function StudentRow({
  name,
  mark,
  saving,
  disabled,
  book,
  onToggle,
  onInfo,
  onMore,
}: {
  name: string;
  mark: CheckMark | null;
  saving: boolean;
  disabled: boolean;
  /** Номын чек: үнэ (өөр дүнг ялгаж харуулна); readOnly = гарсан сурагч */
  book?: { price: number | null; readOnly?: boolean };
  onToggle: () => void;
  onInfo: () => void;
  onMore?: () => void;
}) {
  const on = !!mark?.checked;
  const by = mark?.updatedBy ? staffName(mark.updatedBy) : null;
  const elsewhere = mark?.elsewhere ?? null;
  const skipped = !!mark?.skipped;
  const collector = mark?.collectedBy ? staffName(mark.collectedBy) : null;
  // Номын чек: хэн авсан, дүн (үнээс өөр бол), өөр хүн тэмдэглэсэн бол хэн
  const bookLine =
    book && mark && (on || skipped)
      ? [
          skipped ? "Авахгүй" : null,
          elsewhere ? `${elsewhere.name ?? "Өөр"} ангид төлсөн` : null,
          on && collector ? `${collector} авсан` : null,
          on && mark.amount != null && (elsewhere || mark.amount !== book.price) ? mnt(mark.amount) : null,
          mark.note || null,
          by && (skipped || mark.updatedBy?.id !== mark.collectedBy?.id) ? `${by} тэмдэглэсэн ${mdhm(mark.updatedAt)}` : mdhm(mark.updatedAt),
        ]
      : null;
  return (
    <div className={cn("flex min-h-14 items-stretch transition-colors", on ? "bg-success/10" : "bg-surface")}>
      <button
        type="button"
        onClick={onInfo}
        aria-label={`${name} — мэдээлэл, утас`}
        className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <span className="block truncate font-semibold text-ink underline-offset-2 hover:underline">{name}</span>
        {saving ? (
          <span className="block truncate text-xs text-ink-dim">Хадгалж байна</span>
        ) : bookLine ? (
          <Meta className="text-xs text-ink-dim" items={bookLine} />
        ) : (
          !book && mark && by && <span className="block truncate text-xs text-ink-dim">{`${by} ${mdhm(mark.updatedAt)}`}</span>
        )}
      </button>
      {book && onMore && !disabled && (
        <button
          type="button"
          onClick={onMore}
          aria-label={`${name} — дэлгэрэнгүй: авсан багш, дүн, авахгүй`}
          className="flex w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-pressed={on}
        disabled={disabled || !!elsewhere}
        onClick={onToggle}
        aria-label={`${name} — ${on ? "тэмдэглэсэн, болиулах" : "тэмдэглэх"}`}
        className={cn(
          "flex w-16 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
          !disabled && !elsewhere && "hover:bg-panel active:bg-panel",
          (disabled || !!elsewhere) && "cursor-default",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
            on ? "border-success bg-success text-on-success" : "border-line text-ink-dim",
          )}
        >
          {on ? (
            <Check className="h-5 w-5" strokeWidth={3} />
          ) : skipped ? (
            <Ban className="h-5 w-5" />
          ) : disabled ? null : (
            <Plus className="h-5 w-5" />
          )}
        </span>
      </button>
    </div>
  );
}

/** Нэр + заавал биш дүн (₮). Дүнг «25,000» хэлбэрээр харуулна. */
function CheckForm({
  initialTitle = "",
  initialAmount = null,
  chooseKind = false,
  usedBooks,
  fixedBook = false,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialTitle?: string;
  initialAmount?: number | null;
  /** Шинэ чек: эхлээд төрлөө (ном эсвэл бусад) сонгоно */
  chooseKind?: boolean;
  usedBooks?: Set<string>;
  /** Номын чекийг засах: нэр солигдохгүй, зөвхөн үнэ */
  fixedBook?: boolean;
  submitLabel: string;
  onSubmit: (title: string, amount: number | null, bookKey: string | null) => Promise<void>;
  onCancel: () => void;
}) {
  // null = сонгоогүй, "other" = энгийн чек, бусад нь номын түлхүүр
  const [kind, setKind] = useState<string | null>(chooseKind ? null : "other");
  const isBook = fixedBook || (kind !== null && kind !== "other");
  const [title, setTitle] = useState(initialTitle);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-ink-dim/70 focus-visible:outline-2 focus-visible:outline-brand";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = isBook ? title : title.replace(/\s+/g, " ").trim();
    if (!isBook && !t) {
      setErr("Чекийн нэрээ бичнэ үү");
      return;
    }
    const n = amount ? Number(amount) : null;
    if (isBook && !n) {
      setErr("Үнээ оруулна уу");
      return;
    }
    if (n !== null && n > AMOUNT_MAX) {
      setErr(`Дүн ${mnt(AMOUNT_MAX)}-өөс их байж болохгүй`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onSubmit(t, n && n > 0 ? n : null, isBook && !fixedBook ? kind : null);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-bg/60 p-3">
      {chooseKind && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Ямар чек нээх вэ</p>
          <div role="radiogroup" aria-label="Чекийн төрөл" className="flex flex-wrap gap-1.5">
            {[...BOOKS, ...SHEET_KINDS, { key: "other", title: "Бусад" }].map((b) => {
              const used = usedBooks?.has(b.key) ?? false;
              const on = kind === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={used || busy}
                  title={used ? "Энэ номын чек энэ ангид нээгдсэн" : undefined}
                  onClick={() => {
                    setKind(b.key);
                    setErr("");
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition disabled:opacity-40",
                    on ? "border-transparent bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
                  )}
                >
                  {b.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {kind !== null && !isBook && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Нэр</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
            placeholder="Шалгалтын цаас"
            className={inputClass}
          />
        </label>
      )}
      {kind !== null && (
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">
          {isBook ? "Үнэ" : "Нэг хүүхдийн дүн"} {!isBook && <span className="font-normal text-ink-dim">(заавал биш)</span>}
        </span>
        <span className="relative block">
          <input
            value={amount ? Number(amount).toLocaleString("en-US") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9))}
            inputMode="numeric"
            autoFocus={isBook}
            placeholder={isBook ? (SHEET_KINDS.some((k) => k.key === kind) ? "3,000" : "40,000") : "25,000"}
            className={cn(inputClass, "pr-8 tabular-nums")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim" aria-hidden>
            ₮
          </span>
        </span>
      </label>
      )}
      {err && (
        <p role="alert" className="text-sm text-error">
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || kind === null}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Болих
        </Button>
      </div>
    </form>
  );
}
