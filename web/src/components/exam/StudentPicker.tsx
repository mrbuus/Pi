"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/* ============================================================================
 * StudentPicker — сурагч хайх (код/нэрээр), cuid гараар бичихийг сольсон.
 * GET /users/search?q= ашиглана (Wave 1). Багш цаасан шалгалтын дүн
 * оруулахдаа өмнө нь ойлгомжгүй cuid бичдэг байсныг засав.
 *
 * Хайлтын debounce-ийг useEffect-ээр биш, шууд onChange event handler дотор
 * хийсэн — "setState in effect" cascading-render дүрмээс зайлсхийж, шалтгаан
 * (хэрэглэгчийн бичсэн үг) ба үр дагаврыг (сервер лүү хайлт) нэг л газар
 * тодорхой холбоно.
 * ========================================================================== */

export interface StudentHit {
  id: string;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  username: string | null;
}

export default function StudentPicker({
  onSelect,
}: {
  onSelect: (student: StudentHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudentHit | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function handleQueryChange(next: string) {
    if (selected) setSelected(null);
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = next.trim();
    if (q.length < 2) {
      setHits([]);
      setOpen(false);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    debounceRef.current = setTimeout(() => {
      api<StudentHit[]>(`/users/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setHits(r);
          setOpen(true);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Алдаа"))
        .finally(() => setLoading(false));
    }, 300);
  }

  function pick(hit: StudentHit) {
    setSelected(hit);
    setQuery(`${hit.studentCode ? hit.studentCode + " — " : ""}${hit.firstName} ${hit.lastName}`);
    setOpen(false);
    onSelect(hit);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setHits([]);
    onSelect(null);
  }

  return (
    <div ref={boxRef} className="relative min-w-[220px] flex-1">
      <label htmlFor="student-search" className="sr-only">
        Сурагч хайх (код эсвэл нэрээр)
      </label>
      <input
        id="student-search"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => hits.length > 0 && !selected && setOpen(true)}
        placeholder="Сурагчийн код эсвэл нэрээр хайх…"
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:border-brand"
      />
      {selected && (
        <button
          type="button"
          onClick={clearSelection}
          aria-label="Сурагчийн сонголтыг цэвэрлэх"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-dim transition hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      )}
      {open && !selected && (
        <div className="absolute z-20 mt-1 w-full max-w-sm overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {loading && <p className="px-3 py-2 text-xs text-ink-dim">Хайж байна…</p>}
          {!loading && error && <p className="px-3 py-2 text-xs text-error">{error}</p>}
          {!loading && !error && hits.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-dim">Олдсонгүй</p>
          )}
          {!loading &&
            !error &&
            hits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => pick(h)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-panel"
              >
                <span className="font-medium text-ink">
                  {h.firstName} {h.lastName}
                </span>
                {h.studentCode && (
                  <span className="shrink-0 rounded bg-panel px-1.5 py-0.5 font-mono text-[11px] text-ink-dim">
                    {h.studentCode}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
