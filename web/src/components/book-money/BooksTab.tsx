"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, MoreHorizontal, Plus } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";
import { staffName } from "@/lib/personName";
import BookMarkSheet, { type BookSheetTarget } from "./BookMarkSheet";
import { mnt, type BookMarkInput, type BookPayment, type StudentBooksResponse } from "./books";

const when = (iso: string) => formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

type BookRow = StudentBooksResponse["books"][number];

/**
 * Сурагчийн хуудасны «Ном» таб (эзэн 2026-11-12) — ном бүрийн мөнгийг өгсөн эсэх,
 * аль ангид байхдаа, аль багшид, хэдийг. Ангийн чекээс гадуур эндээс шууд
 * тэмдэглэж болно. Доор нь бүх өөрчлөлтийн түүх (юу ч устахгүй).
 */
export default function BooksTab({ studentId }: { studentId: string }) {
  const [data, setData] = useState<StudentBooksResponse | null>(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<BookRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const base = `/book-payments/students/${encodeURIComponent(studentId)}`;

  const load = useCallback(async () => {
    try {
      setData(await api<StudentBooksResponse>(base));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Номын мэдээллийг ачаалж чадсангүй");
    }
  }, [base]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function save(bookKey: string, input: BookMarkInput) {
    await api(`${base}/books/${encodeURIComponent(bookKey)}`, { method: "PUT", body: input });
    await load();
  }

  /** Шууд дарах: санал болгох үнэ байвал тэр дүнгээр, өөрөө авсан гэж; үгүй бол дэлгэрэнгүйг нээнэ */
  async function quick(b: BookRow) {
    if (b.payment || b.suggestedAmount === null) {
      setSheetFor(b);
      setSheetOpen(true);
      return;
    }
    setBusyKey(b.key);
    try {
      await save(b.key, { status: "PAID", amount: b.suggestedAmount });
      toast.success(`${b.title} — өгсөн гэж тэмдэглэлээ`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusyKey(null);
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState rows={5} label="Ном" />;

  const name = `${data.student.lastName} ${data.student.firstName}`.trim();
  const target: BookSheetTarget | null = sheetFor && {
    studentId,
    studentName: name,
    bookTitle: sheetFor.title,
    price: sheetFor.suggestedAmount,
    status: sheetFor.payment?.status ?? null,
    amount: sheetFor.payment?.amount ?? null,
    collectedBy: sheetFor.payment?.collectedBy ?? null,
    note: sheetFor.payment?.note ?? null,
    classrooms: data.classrooms,
    classroomId: sheetFor.payment ? (sheetFor.payment.classroom?.id ?? null) : (data.classrooms.find((c) => c.current)?.id ?? null),
  };

  return (
    <div className="space-y-4">
      <section className="chunky p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Ном, шалгалтын хуудас</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {data.books.map((b) => (
            <li key={b.key}>
              <Row
                book={b}
                busy={busyKey === b.key}
                onQuick={() => void quick(b)}
                onMore={() => {
                  setSheetFor(b);
                  setSheetOpen(true);
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      {data.history.length > 0 && (
        <section className="chunky p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">Түүх</h2>
          <ul className="divide-y divide-line">
            {data.history.map((h) => (
              <li key={h.id} className={cn("py-2.5 text-sm", h.voidedAt && "text-ink-dim")}>
                <p className={cn("font-semibold", h.voidedAt ? "line-through decoration-ink-dim/60" : "text-ink")}>
                  {h.title}
                  {h.status === "PAID" ? (h.amount !== null ? `, ${mnt(h.amount)}` : "") : ", авахгүй"}
                </p>
                <Meta className="text-xs text-ink-dim" items={[...paymentFacts(h), `${staffName(h.createdBy) ?? "Хэн нэгэн"} тэмдэглэсэн ${when(h.createdAt)}`]} />
                {h.voidedAt && (
                  <p className="text-xs text-ink-dim">
                    {staffName(h.voidedBy) ?? "Хэн нэгэн"} өөрчилсөн {when(h.voidedAt)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <BookMarkSheet
        target={target}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={async (input) => {
          if (!sheetFor) return;
          await save(sheetFor.key, input);
          toast.success("Хадгаллаа");
        }}
      />
    </div>
  );
}

/** «12-5 анги», «Баасанжав авсан», тайлбар */
function paymentFacts(p: BookPayment): (string | null)[] {
  return [
    p.classroom ? `${p.classroom.name} анги` : "Ангигүй",
    p.status === "PAID" && p.collectedBy ? `${staffName(p.collectedBy)} авсан` : null,
    p.note,
  ];
}

function Row({ book, busy, onQuick, onMore }: { book: BookRow; busy: boolean; onQuick: () => void; onMore: () => void }) {
  const p = book.payment;
  const paid = p?.status === "PAID";
  const skipped = p?.status === "SKIPPED";
  return (
    <div className={cn("flex min-h-14 items-stretch", paid ? "bg-success/10" : "bg-surface")}>
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-semibold text-ink">{book.title}</span>
          {paid && p.amount !== null && <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{mnt(p.amount)}</span>}
          {!p && book.suggestedAmount !== null && <span className="shrink-0 text-sm tabular-nums text-ink-dim">{mnt(book.suggestedAmount)}</span>}
        </p>
        {busy ? (
          <p className="text-xs text-ink-dim">Хадгалж байна</p>
        ) : p ? (
          <Meta
            className="text-xs text-ink-dim"
            items={[skipped ? "Авахгүй" : null, ...paymentFacts(p), `${staffName(p.createdBy) ?? "Хэн нэгэн"} ${when(p.createdAt)}`]}
          />
        ) : (
          <p className="text-xs text-ink-dim">Өгөөгүй</p>
        )}
      </div>
      <button
        type="button"
        onClick={onMore}
        aria-label={`${book.title} — дэлгэрэнгүй: авсан багш, дүн`}
        className="flex w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={paid}
        disabled={busy}
        onClick={onQuick}
        aria-label={`${book.title} — ${paid ? "өгсөн, засах" : "өгсөн гэж тэмдэглэх"}`}
        className="flex w-16 shrink-0 items-center justify-center hover:bg-panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
            paid ? "border-success bg-success text-on-success" : "border-line text-ink-dim",
          )}
        >
          {paid ? <Check className="h-5 w-5" strokeWidth={3} /> : skipped ? <Ban className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </span>
      </button>
    </div>
  );
}
