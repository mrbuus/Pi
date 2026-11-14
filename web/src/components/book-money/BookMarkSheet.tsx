"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Check, Eraser } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { staffName, withPlus } from "@/lib/personName";
import { BOOK_AMOUNT_MAX, mnt, type BookMarkInput, type BookPerson } from "./books";

interface Collectors {
  /** Нэвтэрсэн хүн — анхдагч сонголт */
  me: string;
  /** Эзний өгсөн дарааллаар (сервер эрэмбэлнэ) */
  staff: BookPerson[];
}

/** «Хэн авсан» сонгогчийн багш нар — хуудас дахин ачаалтал нэг л удаа татна */
let collectorsCache: Promise<Collectors> | null = null;
function loadCollectors(): Promise<Collectors> {
  collectorsCache ??= api<Collectors>("/book-payments/collectors").catch((err) => {
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

const NO_CLASS = "__none__";
const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-dim/70 focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Номын мөнгөний дэлгэрэнгүй тэмдэглэгээ (эзэн 2026-11-12) — «⋯» товчоор нээгдэнэ.
 * Гол нь ХЭН АВСАН: багш нарын нэр шууд товчоор жагсана (эзний дарааллаар), нэрээ
 * дараад «Батлах» — хоёр л даралт. Дүн, тайлбар доор нь жижиг; «Авахгүй», «Арилгах».
 * Ангийн чек, сурагчийн хуудас хоёулаа хэрэглэнэ.
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
  const [collectors, setCollectors] = useState<Collectors | null>(null);
  // null = сонгоогүй: жагсаалт ирмэгц нэвтэрсэн хүн (өмнө нь тэмдэглэсэн бол тэр багш) сонгогдоно
  const [picked, setPicked] = useState<string | null>(target.collectedBy?.id ?? null);
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
      .then((c) => alive && setCollectors(c))
      .catch(() => alive && setErr("Багш нарын жагсаалтыг ачаалж чадсангүй"));
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

  const collector = picked ?? collectors?.me ?? null;

  function confirm() {
    if (amount === "") {
      setErr("Дүнгээ оруулна уу");
      return;
    }
    const n = Number(amount);
    if (n > BOOK_AMOUNT_MAX) {
      setErr(`Дүн ${mnt(BOOK_AMOUNT_MAX)}-өөс их байж болохгүй`);
      return;
    }
    // Багш сонгоогүй (жагсаалт ачаалаагүй) бол сервер тэмдэглэж буй хүнийг авсан гэж бичнэ
    void run({ status: "PAID", amount: n, ...(collector ? { collectedById: collector } : {}), ...extra() });
  }

  // Өмнө сонгогдсон багш жагсаалтад байхгүй (архивлагдсан г.м.) бол эхэнд нь хэвээр харуулна
  const staff = collectors?.staff ?? [];
  const chips = target.collectedBy && collectors && !staff.some((c) => c.id === target.collectedBy!.id) ? [target.collectedBy, ...staff] : staff;
  // Товч дээр зөвхөн нэр; ижил нэртэй хоёр багш байвал овгийн үсэгтэй
  const dup = new Set(chips.filter((c, i) => chips.some((o, j) => j !== i && o.firstName === c.firstName)).map((c) => c.id));
  const label = (c: BookPerson) => (dup.has(c.id) ? staffName(c) : withPlus(c.firstName, c.role));

  return (
    <div className="overflow-y-auto px-4 pb-5 pt-3">
      <DrawerTitle className="cyrillic-heading break-words text-lg font-bold text-ink">{target.studentName}</DrawerTitle>
      <DrawerDescription className="mt-0.5 text-sm text-ink-dim">
        {target.bookTitle}
        {target.price !== null ? `, ${mnt(target.price)}` : ""}
      </DrawerDescription>

      {locked ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-bg/60 px-3 py-2.5 text-sm text-ink">
            <span className="font-semibold">{target.lockedClassName}</span> ангид байхдаа төлсөн
            {target.collectedBy ? `, ${staffName(target.collectedBy)} авсан` : ""}
            {target.amount !== null ? `, ${mnt(target.amount)}` : ""}
          </p>
          <Link
            href={`/app/students/${encodeURIComponent(target.studentId)}?tab=books`}
            className="inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Сурагчийн хуудаснаас засах
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p id="book-collector-label" className="mb-1.5 text-sm font-semibold text-ink">
              Мөнгийг авсан багш
            </p>
            {!collectors && !err ? (
              <div className="h-24 animate-pulse rounded-xl bg-ink/5" role="status" aria-label="Багш нарыг ачаалж байна" />
            ) : (
              <div role="radiogroup" aria-labelledby="book-collector-label" className="flex flex-wrap gap-1.5">
                {chips.map((c) => {
                  const on = c.id === collector;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => setPicked(c.id)}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition",
                        on ? "border-transparent bg-brand-bright text-on-brand" : "border-line bg-surface text-ink hover:border-brand",
                      )}
                    >
                      {label(c)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <label className="block w-32 shrink-0">
              <span className="mb-1 block text-xs font-semibold text-ink-dim">Дүн</span>
              <span className="relative block">
                <input
                  value={amount === "" ? "" : Number(amount).toLocaleString("en-US")}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 7))}
                  inputMode="numeric"
                  placeholder="40,000"
                  disabled={busy}
                  className={cn(inputClass, "pr-7 tabular-nums")}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-dim" aria-hidden>
                  ₮
                </span>
              </span>
            </label>
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-xs font-semibold text-ink-dim">Тайлбар</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} disabled={busy} className={inputClass} />
            </label>
          </div>

          {target.classrooms && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-dim">Аль ангид байхдаа өгсөн</span>
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

          {err && (
            <p role="alert" className="text-sm text-error">
              {err}
            </p>
          )}

          <Button className="w-full" disabled={busy} onClick={confirm}>
            <Check aria-hidden /> Батлах
          </Button>
          <div className="flex flex-wrap justify-center gap-x-2">
            {target.status !== "SKIPPED" && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ status: "SKIPPED", ...extra() })}>
                <Ban aria-hidden /> Авахгүй
              </Button>
            )}
            {target.status !== null && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ status: "NONE" })}>
                <Eraser aria-hidden /> Арилгах
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
