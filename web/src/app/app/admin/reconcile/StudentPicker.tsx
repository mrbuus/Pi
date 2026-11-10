"use client";

import { useEffect, useState } from "react";
import { Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { inputCls } from "@/components/payments/LedgerDialog";
import StudentDetailDialog from "./StudentDetailDialog";
import type { StudentCard } from "./types";

/** Хүүхэд хайх (нэр, овог эсвэл утасны хэсгээр) — сонгосныг харуулж, солих боломжтой. */
export default function StudentPicker({
  id,
  value,
  onChange,
  suggestions = [],
}: {
  id: string;
  value: StudentCard | null;
  onChange: (s: StudentCard | null) => void;
  /** Тулгалтын санал болгосон хүүхдүүд — хайхгүйгээр сонгоно */
  suggestions?: StudentCard[];
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StudentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** «⋯» дарсан хүүхэд — дэлгэрэнгүй цонх */
  const [detail, setDetail] = useState<StudentCard | null>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setItems([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ items: StudentCard[] }>(`/reconcile/students?q=${encodeURIComponent(t)}`);
        setItems(res.items);
      } catch {
        setError("Хайлт амжилтгүй боллоо");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const detailDialog = (
    <StudentDetailDialog
      studentId={detail?.id ?? null}
      open={!!detail}
      onOpenChange={(o) => !o && setDetail(null)}
      onPick={
        detail && detail.id !== value?.id
          ? () => {
              onChange(detail);
              setDetail(null);
            }
          : undefined
      }
    />
  );

  if (value)
    return (
      <div className="flex min-h-11 items-center justify-between gap-1 rounded-xl border border-brand/40 bg-brand-bright/5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          <Meta items={[value.name, value.classroom, value.archived ? "Гарсан" : null]} />
        </span>
        <MoreButton name={value.name} onClick={() => setDetail(value)} />
        {detailDialog}
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Сонгосон хүүхдийг солих"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    );

  const list = q.trim().length >= 2 ? items : suggestions;
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр, овог эсвэл утас"
          autoComplete="off"
          className={`${inputCls} pl-9`}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-dim" aria-hidden />}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {list.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-line">
          {list.map((s) => (
            <li key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onChange(s)}
                className="row-interactive flex min-h-11 min-w-0 flex-1 items-center px-3 text-left text-sm text-ink"
              >
                <span className="flex flex-col py-1.5">
                  <Meta items={[s.name, s.classroom, s.archived ? "Гарсан" : null, s.paidUp ? "Бүтэн төлсөн" : null]} />
                  {!!s.phones?.length && (
                    <span className="text-xs tabular-nums text-ink-dim">
                      <Meta items={s.phones.map((p) => `${p.label} ${p.value}`)} />
                    </span>
                  )}
                </span>
              </button>
              <MoreButton name={s.name} onClick={() => setDetail(s)} />
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !loading && !error && items.length === 0 && <p className="text-sm text-ink-dim">Олдсонгүй</p>}
      {detailDialog}
    </div>
  );
}

/** «⋯» — хүүхдийн дэлгэрэнгүй (утас, сарын төлбөр, хуулгын түүх) */
export function MoreButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${name} — дэлгэрэнгүй`}
      title="Дэлгэрэнгүй"
      className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
    >
      <MoreHorizontal className="size-5" aria-hidden />
    </button>
  );
}
