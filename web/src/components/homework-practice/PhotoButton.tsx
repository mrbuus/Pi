"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileCheck2, X } from "lucide-react";
import PhotoPicker from "@/components/makeup/PhotoPicker";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { HwMyResponse, HwPhoto } from "./types";

export const HW_PHOTO_MAX_PAGES = 6;

/**
 * «Зураг илгээх» — буланд байрлах жижиг товч + цонх. Дэвтрийн зургийг (≤6 хуудас)
 * тайрч, PDF болгож, purpose "homework" (7 хоног) -оор илгээнэ.
 * `photo` === undefined бол (бодох дэлгэцийн толгойд) цонх нээгдэхэд жагсаалтаас олно.
 */
export default function PhotoButton({
  classroomId,
  date,
  photo,
  onChange,
  compact = false,
}: {
  classroomId: string;
  date: string;
  photo?: HwPhoto | null;
  onChange?: (photo: HwPhoto | null) => void;
  /** Толгойн мөрөнд — зөвхөн дүрс (утсан дээр) */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<HwPhoto | null | undefined>(photo);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- эцэг талын шинэ утгыг дагана
    if (photo !== undefined) setLoaded(photo);
  }, [photo]);

  useEffect(() => {
    if (!open || loaded !== undefined) return;
    let cancelled = false;
    api<HwMyResponse>("/homework/my?days=14")
      .then((r) => {
        if (cancelled) return;
        const day = r.days.find((d) => d.classroomId === classroomId && d.date === date);
        setLoaded(day?.photo ?? null);
      })
      .catch((e) => !cancelled && setError(e instanceof Error && e.message ? e.message : "Нээж чадсангүй"));
    return () => {
      cancelled = true;
    };
  }, [open, loaded, classroomId, date]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      // Тайрах цонх нээлттэй бол Escape зөвхөн түүнийг хаана
      if (e.key === "Escape" && !document.querySelector("[data-crop-dialog]")) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function update(next: HwPhoto | null) {
    setLoaded(next);
    onChange?.(next);
  }

  async function save(keys: string[], pages: number) {
    const next = await api<HwPhoto>("/homework/photos", {
      method: "POST",
      body: { classroomId, date, fileKey: keys[0], pages },
    });
    update(next);
  }

  async function remove() {
    if (!loaded) return;
    await api(`/homework/photos/${encodeURIComponent(loaded.id)}`, { method: "DELETE" });
    update(null);
  }

  const sent = !!loaded;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={sent ? `Зураг илгээсэн, ${loaded?.pages ?? 0} хуудас` : "Зураг илгээх"}
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-bright",
          sent
            ? "border-success/40 bg-success/10 text-success"
            : "border-line text-ink-dim hover:border-brand-bright hover:text-brand-soft",
        )}
      >
        {sent ? <FileCheck2 className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}
        <span className={cn(compact && "hidden sm:inline")}>
          {sent ? `Зураг ${loaded?.pages ?? 0} хуудас` : "Зураг илгээх"}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hw-photo-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] elev-1 sm:rounded-2xl sm:p-5"
          >
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p id="hw-photo-title" className="font-bold text-ink">
                  Дэвтрийн зураг
                </p>
                <p className="text-sm text-ink-dim">{HW_PHOTO_MAX_PAGES} хүртэл хуудас, 7 хоног хадгална</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Хаах"
                className="flex size-11 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {error && loaded === undefined ? (
              <ErrorState message={error} onRetry={() => setError("")} />
            ) : loaded === undefined ? (
              <div className="space-y-2" role="status" aria-label="Ачаалж байна">
                <SkeletonLine width="50%" />
                <SkeletonLine height={40} />
              </div>
            ) : (
              <PhotoPicker
                key={loaded?.fileKey ?? "new"}
                current={loaded ? [loaded.fileKey] : []}
                pages={loaded?.pages ?? 0}
                onSave={save}
                onDelete={remove}
                fileName={`daalgavar-${date}.pdf`}
                purpose="homework"
                maxPages={HW_PHOTO_MAX_PAGES}
                crop
                replaceLabel="Дахин илгээх"
                addLabel="Хуудас нэмэх"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
