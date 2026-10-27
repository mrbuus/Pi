"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/app/app/admin/classrooms/ClassroomsClient";
import InfoHint from "@/components/ui/InfoHint";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import type { CoverageBook, CoverageTest, CoverageTree } from "./types";

type Tri = "all" | "some" | "none";

function triOf(tests: CoverageTest[], selected: Set<string>): Tri {
  const n = tests.filter((t) => selected.has(t.id)).length;
  return n === 0 ? "none" : n === tests.length ? "all" : "some";
}

/** Гурван төлөвтэй сонголт — «зарим нь» үед indeterminate; дарвал бүгдийг сонгоно */
function TriCheck({ state, onChange, label }: { state: Tri; onChange: (checked: boolean) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="size-5 shrink-0 cursor-pointer accent-brand"
    />
  );
}

/**
 * «Өмнө үзсэн сэдэв тэмдэглэх» (эзэн 2026-10-27). Систем эхлэхээс өмнө анги
 * үзсэн бүлэг/тестийг ном → бүлэг → тест модоор сонгож НЭГ удаад хадгална.
 * Бүлгийн сонголт нь бүлгийн бүх тестийг (A, B) зэрэг сонгоно. Огноогүй
 * тэмдэглэгээ — хичээлээр батлагдсан (огноотой) нь тусдаа, хөндөгдөхгүй.
 */
export default function PastCoverageDialog({
  classroomId,
  className,
  onClose,
  onSaved,
}: {
  classroomId: string;
  className: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tree, setTree] = useState<CoverageTree | null>(null);
  const [loadError, setLoadError] = useState("");
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openBooks, setOpenBooks] = useState<Set<string>>(new Set());
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const data = await api<CoverageTree>(`/class-dashboard/classes/${encodeURIComponent(classroomId)}/coverage`);
      const past = new Set(data.books.flatMap((b) => b.chapters.flatMap((c) => c.tests.filter((t) => t.past).map((t) => t.id))));
      setTree(data);
      setInitial(past);
      setSelected(new Set(past));
      // Анхдагч: үзсэн бүлэгтэй ном нээлттэй, үгүй бол эхний ном
      const touched = data.books.filter((b) => b.coveredChapters > 0).map((b) => b.id);
      setOpenBooks(new Set(touched.length ? touched : data.books.slice(0, 1).map((b) => b.id)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Номын жагсаалтыг ачаалж чадсангүй");
    }
  }, [classroomId]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const diff = useMemo(() => {
    let add = 0;
    let remove = 0;
    for (const id of selected) if (!initial.has(id)) add++;
    for (const id of initial) if (!selected.has(id)) remove++;
    return { add, remove };
  }, [selected, initial]);

  function setMany(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggle(setter: typeof setOpenBooks, id: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    const res = await api<{ added: number; restored: number; removed: number }>(
      `/class-dashboard/classes/${encodeURIComponent(classroomId)}/coverage/past`,
      { method: "PUT", body: { testIds: [...selected] } },
    );
    toast.success(
      res.added + res.restored + res.removed === 0
        ? "Өөрчлөлт алга"
        : `Хадгаллаа — ${res.added + res.restored} нэмсэн, ${res.removed} хассан`,
    );
    onSaved();
    onClose();
  }

  return (
    <Dialog
      title={`${className} — өмнө үзсэн сэдэв`}
      onClose={onClose}
      onConfirm={save}
      confirmLabel="Хадгалах"
      confirmDisabled={!tree || (diff.add === 0 && diff.remove === 0)}
    >
      {loadError && <ErrorState message={loadError} onRetry={() => void load()} />}
      {!tree && !loadError && <SkeletonRows rows={6} />}
      {tree && tree.books.length === 0 && (
        <EmptyState title="Сонгох ном алга" hint="Ангийн хичээлд тохирох нийтэлсэн тесттэй ном хараахан алга" />
      )}
      {tree && tree.books.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Meta
              className="min-w-0 flex-1 text-sm font-semibold text-ink"
              items={[
                `Сонгосон ${selected.size} тест`,
                diff.add ? `${diff.add} нэмэх` : null,
                diff.remove ? `${diff.remove} хасах` : null,
              ]}
            />
            <InfoHint>
              Систем эхлэхээс өмнө ангийн үзсэн бүлгийг сонгоно. Огноогүйгээр түүхэнд орж, одоогийн бүлэг ба номын явцад тооцогдоно. Хичээлээр баталсан бүлэгт огноо нь харагдана
            </InfoHint>
          </div>
          <div className="space-y-2">
            {tree.books.map((book) => (
              <BookSection
                key={book.id}
                book={book}
                open={openBooks.has(book.id)}
                onToggle={() => toggle(setOpenBooks, book.id)}
                selected={selected}
                onSet={setMany}
                openChapters={openChapters}
                onToggleChapter={(id) => toggle(setOpenChapters, id)}
              />
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
}

function BookSection({
  book,
  open,
  onToggle,
  selected,
  onSet,
  openChapters,
  onToggleChapter,
}: {
  book: CoverageBook;
  open: boolean;
  onToggle: () => void;
  selected: Set<string>;
  onSet: (ids: string[], on: boolean) => void;
  openChapters: Set<string>;
  onToggleChapter: (id: string) => void;
}) {
  const allTests = useMemo(() => book.chapters.flatMap((c) => c.tests), [book]);
  const chosenChapters = book.chapters.filter((c) => c.tests.some((t) => selected.has(t.id))).length;
  const panelId = `cov-book-${book.id}`;
  return (
    <section className="rounded-xl border border-line">
      <div className="flex items-center gap-2 pl-3">
        <TriCheck
          state={triOf(allTests, selected)}
          onChange={(on) => onSet(allTests.map((t) => t.id), on)}
          label={`${book.title} — бүх бүлэг`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-r-xl px-2 text-left hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="min-w-0 flex-1 truncate font-bold text-ink">{book.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-ink-dim">
            {chosenChapters}/{book.totalChapters} бүлэг
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      {open && (
        <ul id={panelId} className="divide-y divide-line border-t border-line">
          {book.chapters.map((c) => {
            const expanded = openChapters.has(c.id);
            const lessonDates = c.tests.flatMap((t) => t.lessonDates).sort();
            const single = c.tests.length === 1;
            return (
              <li key={c.id}>
                <div className="flex items-center gap-1 pl-3 pr-1">
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
                    <TriCheck state={triOf(c.tests, selected)} onChange={(on) => onSet(c.tests.map((t) => t.id), on)} />
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      <MetaTitle>{c.title}</MetaTitle>
                    </span>
                  </label>
                  {lessonDates.length > 0 && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-success"
                      title={`Хичээлээр баталсан — ${formatMnDate(lessonDates.at(-1)!)}`}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">Хичээлээр баталсан</span>
                      <span className="tabular-nums">{formatMnDate(lessonDates.at(-1)!)}</span>
                    </span>
                  )}
                  {!single && (
                    <button
                      type="button"
                      onClick={() => onToggleChapter(c.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Тестүүдийг нуух" : "Тестүүдийг харах"}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
                    </button>
                  )}
                </div>
                {!single && expanded && (
                  <ul className="pb-1 pl-11">
                    {c.tests.map((t) => (
                      <li key={t.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3">
                          <TriCheck state={selected.has(t.id) ? "all" : "none"} onChange={(on) => onSet([t.id], on)} />
                          <Meta
                            className="min-w-0 flex-1 text-sm text-ink"
                            items={[t.title, t.variant ? `${t.variant} хувилбар` : null]}
                          />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
