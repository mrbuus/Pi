"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Crop, LoaderCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/kit/button";

/**
 * Энгийн тайрах алхам (эзэн 2026-10-29): зураг дээр тэгш өнцөгт — 4 булангийн
 * бариул чирж хэмжээ, дотор нь чирж байрлал солино (pointer events → хулгана, хуруу
 * хоёуланд). «Алгасах» бол зургийг өөрчлөхгүй. Тайралтыг canvas-аар хийж JPEG File
 * буцаана (PDF угсрахын өмнө). Шинэ npm сан хэрэглэхгүй.
 */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Handle = "nw" | "ne" | "sw" | "se" | "move";

const MIN = 0.08; // хамгийн бага хэмжээ (зургийн өргөн/өндрийн хувь)
const MAX_SIDE = 2400; // тайрсан зургийн урт тал (PDF-д 1600 болж дахин шахагдана)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

async function cropFile(file: File, r: Rect): Promise<File> {
  let source: CanvasImageSource & { width: number; height: number };
  let close: (() => void) | null = null;
  let url: string | null = null;
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bmp;
    close = () => bmp.close();
  } else {
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    source = Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  }
  try {
    const sx = Math.round(r.x * source.width);
    const sy = Math.round(r.y * source.height);
    const sw = Math.max(1, Math.round(r.w * source.width));
    const sh = Math.max(1, Math.round(r.h * source.height));
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * k));
    canvas.height = Math.max(1, Math.round(sh * k));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Зураг тайрах боломжгүй хөтөч байна");
    ctx.fillStyle = "#ffffff"; // тунгалаг PNG-ийн дэвсгэр
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Зургийг тайрч чадсангүй"))), "image/jpeg", 0.9),
    );
    canvas.width = 0;
    canvas.height = 0;
    const name = file.name.replace(/\.[^.]+$/, "") + "-crop.jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    close?.();
    if (url) URL.revokeObjectURL(url);
  }
}

export default function CropDialog({
  file,
  index,
  total,
  onDone,
  onSkip,
}: {
  file: File;
  /** «2/3» гэх мэт — дарааллаар тайрах үед */
  index?: number;
  total?: number;
  onDone: (cropped: File) => void;
  onSkip: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; px: number; py: number; start: Rect } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL-ийн амьдрах хугацаа
    setUrl(u);
    setRect({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 });
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  function begin(e: ReactPointerEvent<HTMLElement>, handle: Handle) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { handle, px: e.clientX, py: e.clientY, start: rect };
  }

  function onMove(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box || !box.width || !box.height) return;
    const dx = (e.clientX - d.px) / box.width;
    const dy = (e.clientY - d.py) / box.height;
    const s = d.start;
    let { x, y, w, h } = s;
    if (d.handle === "move") {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else {
      const right = s.x + s.w;
      const bottom = s.y + s.h;
      if (d.handle === "nw" || d.handle === "sw") {
        x = clamp(s.x + dx, 0, right - MIN);
        w = right - x;
      } else {
        w = clamp(s.w + dx, MIN, 1 - s.x);
      }
      if (d.handle === "nw" || d.handle === "ne") {
        y = clamp(s.y + dy, 0, bottom - MIN);
        h = bottom - y;
      } else {
        h = clamp(s.h + dy, MIN, 1 - s.y);
      }
    }
    setRect({ x, y, w, h });
  }

  function end() {
    drag.current = null;
  }

  async function apply() {
    setBusy(true);
    setError("");
    try {
      const full = rect.x < 0.005 && rect.y < 0.005 && rect.w > 0.99 && rect.h > 0.99;
      onDone(full ? file : await cropFile(file, rect));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Зургийг тайрч чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  const pct = (v: number) => `${v * 100}%`;
  const handles: { h: Exclude<Handle, "move">; style: React.CSSProperties; label: string }[] = [
    { h: "nw", style: { left: pct(rect.x), top: pct(rect.y) }, label: "Зүүн дээд булан" },
    { h: "ne", style: { left: pct(rect.x + rect.w), top: pct(rect.y) }, label: "Баруун дээд булан" },
    { h: "sw", style: { left: pct(rect.x), top: pct(rect.y + rect.h) }, label: "Зүүн доод булан" },
    { h: "se", style: { left: pct(rect.x + rect.w), top: pct(rect.y + rect.h) }, label: "Баруун доод булан" },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Зураг тайрах"
      data-crop-dialog
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-line bg-surface p-3 elev-1 sm:p-4">
        <div className="flex items-center gap-2">
          <Crop className="size-5 shrink-0 text-brand-soft" aria-hidden />
          <p className="font-bold text-ink">Зураг тайрах</p>
          {index !== undefined && total !== undefined && total > 1 && (
            <span className="ml-auto text-sm tabular-nums text-ink-dim">
              {index + 1}/{total}
            </span>
          )}
        </div>
        <p className="cyrillic-tight text-sm text-ink-dim">Булангуудыг чирж дэвтрийн хуудсаа л үлдээгээрэй</p>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-ink/5 p-5">
          {url && (
            <div ref={boxRef} className="relative inline-block max-h-full touch-none select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Тайрах зураг"
                draggable={false}
                className="block max-h-[58dvh] max-w-full object-contain"
              />
              {/* Тайрахгүй хэсгийг бараантуулна */}
              <div
                className="absolute cursor-move border-2 border-brand-bright"
                style={{
                  left: pct(rect.x),
                  top: pct(rect.y),
                  width: pct(rect.w),
                  height: pct(rect.h),
                  boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.5)",
                }}
                onPointerDown={(e) => begin(e, "move")}
                onPointerMove={onMove}
                onPointerUp={end}
                onPointerCancel={end}
              />
              {handles.map(({ h, style, label }) => (
                <button
                  key={h}
                  type="button"
                  aria-label={label}
                  className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
                  style={style}
                  onPointerDown={(e) => begin(e, h)}
                  onPointerMove={onMove}
                  onPointerUp={end}
                  onPointerCancel={end}
                >
                  <span aria-hidden className="size-5 rounded-full border-2 border-surface bg-brand-bright shadow" />
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={busy}>
            <SkipForward aria-hidden />
            Алгасах
          </Button>
          <Button className="ml-auto" onClick={apply} disabled={busy || !url}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Check aria-hidden />}
            Тайрах
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
