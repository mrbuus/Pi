"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Check, Eraser } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { staffName } from "@/lib/personName";
import { BOOK_AMOUNT_MAX, mnt, type BookMarkInput, type BookPerson } from "./books";

/** «Хэн авсан» сонгогчийн багш нар — хуудас дахин ачаалтал нэг л удаа татна */
let collectorsCache: Promise<BookPerson[]> | null = null;
function loadCollectors(): Promise<BookPerson[]> {
  collectorsCache ??= api<BookPerson[]>("/book-payments/collectors").catch((err) => {
    collectorsCache = null;
    throw err;
  });
  return collectorsCache;
}

export interface BookSheetTarget {
  studentId: string;
  studentName: string;
  bookTitle: string;
  /** Анхдагч дүн (чекийн үнэ / санал болгох үнэ) */
  price: number | null;
  status: "PAID" | "SKIPPED" | null;
  amount: number | null;
  collectedBy: BookPerson | null;
  note: string | null;
  /** Зөвхөн сурагчийн хуудсанд: анги сонгох боломжтой */
  classrooms?: { id: string; name: string; current: boolean }[];
  classroomId?: string | null;
  /** Өөр ангид төлсөн — ангийн чекээс засахгүй, зөвхөн харуулна */
  lockedClassName?: string | null;
}

const ME = "__me__";
const NO_CLASS = "__none__";
const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-dim/70 focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Номын мөнгөний дэлгэрэнгүй тэмдэглэгээ (эзэн 2026-11-12) — «⋯» товчоор нээгдэнэ:
 * мөнгийг аль багш авсан, бодит дүн (гэмтэлтэй номонд хямдруулсан г.м.), тайлбар,
 * «Авахгүй», тэмдэглэгээг арилгах. Ангийн чек, сурагчийн хуудас хоёулаа хэрэглэнэ.
 */
export default function BookMarkSheet({
  target,
  open,
  onClose,
  onSave,
}: {
  target: BookSheetTarget | null;
  open: boolean;
  onClose: () => void;
  onSave: (input: BookMarkInput) => Promise<void>;
}) {
  return (
    <Drawer open={open && !!target} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-md">
        {target && (
          <SheetBody
            // Өөр сурагч/ном руу шилжихэд маягт шинээр эхэлнэ
            key={`${target.studentId}:${target.bookTitle}:${target.status}:${target.amount}:${target.collectedBy?.id}`}
            target={target}
            onClose={onClose}
            onSave={onSave}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  target,
  onClose,
  onSave,
}: {
  target: BookSheetTarget;
  onClose: () => void;
  onSave: (input: BookMarkInput) => Promise<void>;
}) {
  const [collectors, setCollectors] = useState<BookPerson[] | null>(null);
  const [collector, setCollector] = useState(target.collectedBy?.id ?? ME);
  const [amount, setAmount] = useState(() => {
    const n = target.status === "PAID" ? target.amount : target.price;
    return n === null ? "" : String(n);
  });
  const [note, setNote] = useState(target.note ?? "");
  const [classroom, setClassroom] = useState(target.classroomId ?? target.classrooms?.[0]?.id ?? NO_CLASS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const locked = !!target.lockedClassName;

  useEffect(() => {
    let alive = true;
    loadCollectors()
      .then((list) => alive && setCollectors(list))
      .catch(() => alive && setCollectors([]));
    return () => {
      alive = false;
    };
  }, []);

  async function run(input: BookMarkInput) {
    setBusy(true);
    setErr("");
    try {
      await onSave(input);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  const extra = () => ({
    note: note.trim() || null,
    ...(target.classrooms ? { classroomId: classroom === NO_CLASS ? null : classroom } : {}),
  });

  function savePaid() {
    if (amount === "") {
      setErr("Дүнгээ оруулна уу");
      return;
    }
    const n = Number(amount);
    if (n > BOOK_AMOUNT_MAX) {
      setErr(`Дүн ${mnt(BOOK_AMOUNT_MAX)}-өөс их байж болохгүй`);
      return;
    }
    void run({ status: "PAID", amount: n, ...(collector === ME ? {} : { collectedById: collector }), ...extra() });
  }

  // Сонгогдсон багш жагсаалтад байхгүй (архивлагдсан г.м.) бол нэрийг нь хэвээр харуулна
  const options = collectors ?? [];
  const missing = target.collectedBy && !options.some((c) => c.id === target.collectedBy!.id) ? target.collectedBy : null;
  const diff = target.price !== null && amount !== "" ? Number(amount) - target.price : 0;

  return (
    <div className="overflow-y-auto px-4 pb-5 pt-3">
      <DrawerTitle className="cyrillic-heading break-words text-lg font-bold text-ink">{target.studentName}</DrawerTitle>
      <DrawerDescription className="mt-0.5 text-sm text-ink-dim">
        {target.bookTitle} номын мөнгө{target.price !== null ? `, үнэ ${mnt(target.price)}` : ""}
      </DrawerDescription>

      {locked ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-bg/60 px-3 py-2.5 text-sm text-ink">
            <span className="font-semibold">{target.lockedClassName}</span> ангид байхдаа төлсөн
            {target.collectedBy ? `, ${staffName(target.collectedBy)} авсан` : ""}
            {target.amount !== null ? `, ${mnt(target.amount)}` : ""}. Энэ мөнгө тэр ангийн тооцоонд байгаа тул эндээс засахгүй
          </p>
          <Link
            href={`/app/students/${encodeURIComponent(target.studentId)}?tab=books`}
            className="inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Сурагчийн хуудаснаас харах, засах
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Мөнгийг авсан багш</span>
            <select value={collector} onChange={(e) => setCollector(e.target.value)} disabled={busy} className={inputClass}>
              <option value={ME}>Би өөрөө</option>
              {missing && <option value={missing.id}>{staffName(missing)}</option>}
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {staffName(c)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Өгсөн дүн</span>
            <span className="relative block">
              <input
                value={amount === "" ? "" : Number(amount).toLocaleString("en-US")}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 7))}
                inputMode="numeric"
                placeholder="40,000"
                disabled={busy}
                className={cn(inputClass, "pr-8 tabular-nums")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim" aria-hidden>
                ₮
              </span>
            </span>
            {diff !== 0 && (
              <span className="mt-1 block text-xs text-ink-dim">
                Үнээс {mnt(Math.abs(diff))} {diff < 0 ? "бага" : "их"}
              </span>
            )}
          </label>

          {target.classrooms && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">Аль ангид байхдаа өгсөн</span>
              <select value={classroom} onChange={(e) => setClassroom(e.target.value)} disabled={busy} className={inputClass}>
                {target.classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.current ? "" : " (өмнөх анги)"}
                  </option>
                ))}
                <option value={NO_CLASS}>Ангигүй</option>
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Тайлбар <span className="font-normal text-ink-dim">(заавал биш)</span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Гэмтэлтэй ном авсан"
              disabled={busy}
              className={inputClass}
            />
          </label>

          {err && (
            <p role="alert" className="text-sm text-error">
              {err}
            </p>
          )}

          <Button className="w-full" disabled={busy} onClick={savePaid}>
            <Check aria-hidden /> {target.status === "PAID" ? "Хадгалах" : "Өгсөн гэж тэмдэглэх"}
          </Button>
          <div className="flex flex-wrap gap-2">
            {target.status !== "SKIPPED" && (
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void run({ status: "SKIPPED", ...extra() })}>
                <Ban aria-hidden /> Авахгүй
              </Button>
            )}
            {target.status !== null && (
              <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => void run({ status: "NONE" })}>
                <Eraser aria-hidden /> Тэмдэглэгээг арилгах
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
