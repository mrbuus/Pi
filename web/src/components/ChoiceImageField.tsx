"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { fileUrl, uploadFile } from "@/lib/api";

/**
 * Сонголтын зураг (график хариу): байхгүй бол «Зураг» товч, байвал жижиг
 * зураг + солих/хасах. Байршуулсны дараа onChange(key) — хадгалалт засварлагчийнх.
 */
export default function ChoiceImageField({
  imageKey,
  label,
  onChange,
}: {
  imageKey?: string | null;
  /** «A сонголт» г.м. — товчны тайлбарт */
  label: string;
  onChange: (key: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { key } = await uploadFile(file);
      onChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Зураг байршуулж чадсангүй");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {imageKey ? (
        <>
          <button
            type="button"
            onClick={() => ref.current?.click()}
            title="Зураг солих"
            aria-label={`${label}-ын зургийг солих`}
            className="rounded-lg border border-line bg-white p-0.5 hover:border-brand"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(imageKey)} alt="" className="h-10 w-auto max-w-24 object-contain" />
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={`${label}-ын зургийг хасах`}
            className="flex h-10 w-8 items-center justify-center rounded-lg text-ink-dim transition hover:bg-error/10 hover:text-error"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          aria-label={`${label}-д зураг нэмэх`}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-dashed border-line px-2 text-xs font-semibold text-ink-dim transition hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          Зураг
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-error">
          {error}
        </span>
      )}
    </span>
  );
}
