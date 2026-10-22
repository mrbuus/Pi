"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  CircleCheck,
  ChevronRight,
  ExternalLink,
  FileText,
  ImagePlus,
  Images,
  LoaderCircle,
  RefreshCw,
  RotateCw,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { fileUrl, uploadFile, type UploadPurpose } from "@/lib/api";
import { cn } from "@/lib/cn";
import { PDF_MAX_PAGES, photosToPdf, type Rotation } from "@/lib/photosToPdf";

interface Picked {
  id: string;
  file: File;
  url: string;
  rotation: Rotation;
}

const iconBtn =
  "flex size-9 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-bright disabled:opacity-30";

/**
 * D13: ≤10 зураг сонгох (урьдчилан харах, дараалал солих, эргүүлэх, хасах) → хөтөч дээр
 * шахаж НЭГ PDF болгох → POST /uploads → onSave([pdfKey]). Илгээсэн PDF-ийг нээх, солих.
 */
export default function PhotoPicker({
  current,
  pages,
  onSave,
  saveLabel = "Илгээх",
  addLabel = "Зураг нэмэх",
  fileName = "zurag.pdf",
  highlight = false,
  purpose = "general",
}: {
  /** Одоо хавсаргасан түлхүүрүүд (ихэвчлэн ганц PDF) */
  current: string[];
  /** Илгээсэн хуудасны тоо */
  pages: number;
  onSave: (keys: string[]) => Promise<void>;
  saveLabel?: string;
  addLabel?: string;
  fileName?: string;
  /** Илгээх шаардлагатайг тодруулна (ж: багш дахин илгээхийг хүссэн) */
  highlight?: boolean;
  /** Хадгалах хугацаа: `theory` байнга, `homework` 7 хоног */
  purpose?: UploadPurpose;
}) {
  const [editing, setEditing] = useState(current.length === 0);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [phase, setPhase] = useState<"" | "build" | "upload" | "save">("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [justSent, setJustSent] = useState(false);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const busy = phase !== "";

  function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setJustSent(false);
    const room = PDF_MAX_PAGES - picked.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (chosen.length < files.length) setError(`${PDF_MAX_PAGES} хүртэл зураг сонгоно`);
    const next = chosen.map((file, i) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return { id: `${Date.now()}-${i}-${file.name}`, file, url, rotation: 0 as Rotation };
    });
    setPicked((prev) => [...prev, ...next]);
  }

  function move(index: number, delta: number) {
    setPicked((prev) => {
      const list = [...prev];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  }

  function rotate(id: string) {
    setPicked((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (((p.rotation + 90) % 360) as Rotation) } : p)),
    );
  }

  async function send() {
    setError("");
    setProgress(0);
    try {
      setPhase("build");
      const { file } = await photosToPdf(
        picked.map((p) => ({ file: p.file, rotation: p.rotation })),
        { fileName, onProgress: (d, t) => setProgress(Math.round((d / t) * 100)) },
      );
      setPhase("upload");
      const { key } = await uploadFile(file, { purpose });
      setPhase("save");
      await onSave([key]);
      setPicked([]);
      setEditing(false);
      setJustSent(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Илгээж чадсангүй. Дахин оролдоно уу");
    } finally {
      setPhase("");
    }
  }

  const sent = current.length > 0;

  return (
    <div className="space-y-3">
      {sent && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2",
            highlight ? "border-warning/50 bg-warning/5" : "border-line bg-panel",
          )}
        >
          <FileText className="size-5 shrink-0 text-brand-soft" aria-hidden />
          <span className="min-w-0 flex-1 whitespace-nowrap text-sm">
            <span className="font-semibold text-ink">Илгээсэн</span>
            <span className="ml-2 tabular-nums text-ink-dim">{pages} хуудас</span>
          </span>
          {current.map((key, i) => (
            <a
              key={key}
              href={fileUrl(key)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              {current.length > 1 ? `Нээх ${i + 1}` : "Нээх"}
            </a>
          ))}
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <RefreshCw aria-hidden />
              Солих
            </Button>
          )}
        </div>
      )}

      {justSent && !editing && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
          <CircleCheck className="size-5 shrink-0" aria-hidden />
          Илгээгдлээ. Багш шалгана
        </p>
      )}

      {editing && picked.length === 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="btn-3d flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-brand-bright px-2 text-on-brand transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2"
            >
              <Camera className="size-8" aria-hidden />
              <span className="text-base font-bold">Зураг авах</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line bg-panel px-2 text-ink transition hover:border-brand-bright focus-visible:ring-2 focus-visible:ring-brand-bright"
            >
              <Images className="size-8 text-brand-soft" aria-hidden />
              <span className="text-base font-bold">Зургаас сонгох</span>
            </button>
          </div>
          <p className="cyrillic-tight text-sm text-ink-dim">
            Дэвтрийн хуудас бүрийг гэрэлтэй газар, бүтнээр нь зураарай. {PDF_MAX_PAGES} хүртэл зураг
          </p>
        </div>
      )}

      {editing && picked.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {picked.map((p, i) => (
              <li key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
                <div className="relative aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`${i + 1}-р хуудас`}
                    className="h-full w-full object-cover transition-transform motion-reduce:transition-none"
                    style={{ transform: `rotate(${p.rotation}deg)${p.rotation % 180 ? " scale(0.75)" : ""}` }}
                  />
                  <span className="absolute left-1 top-1 rounded-md bg-ink/70 px-1.5 text-xs font-bold tabular-nums text-bg">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPicked((prev) => prev.filter((x) => x.id !== p.id))}
                    aria-label={`${i + 1}-р зургийг хасах`}
                    className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-ink/70 text-bg transition hover:bg-ink focus-visible:ring-2 focus-visible:ring-brand-bright"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex items-center justify-between px-0.5">
                  <button type="button" className={iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`${i + 1}-р зургийг өмнө нь`}>
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} disabled={busy} onClick={() => rotate(p.id)} aria-label={`${i + 1}-р зургийг эргүүлэх`}>
                    <RotateCw className="size-4" aria-hidden />
                  </button>
                  <button type="button" className={iconBtn} disabled={busy || i === picked.length - 1} onClick={() => move(i, 1)} aria-label={`${i + 1}-р зургийг дараа нь`}>
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {picked.length < PDF_MAX_PAGES && (
              <li className={picked.length ? "" : "col-span-3 sm:col-span-4"}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-ink-dim transition hover:border-brand-bright hover:text-brand-soft focus-visible:ring-2 focus-visible:ring-brand-bright"
                >
                  <ImagePlus className="size-6" aria-hidden />
                  <span className="cyrillic-tight px-1 text-center text-xs font-semibold">{addLabel}</span>
                </button>
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            {picked.length > 0 && (
              <Button size="lg" className="w-full sm:w-auto" onClick={send} disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
                {phase === "build"
                  ? `Бэлдэж байна ${progress}%`
                  : phase === "upload" || phase === "save"
                    ? "Илгээж байна"
                    : sent
                      ? "Солиод илгээх"
                      : saveLabel}
              </Button>
            )}
            {(sent || picked.length > 0) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setPicked([]);
                  setEditing(!sent); // илгээгээгүй бол сонгох товчнууд руу буцна
                  setError("");
                }}
              >
                Болих
              </Button>
            )}
            <span className="ml-auto text-xs tabular-nums text-ink-dim">
              {picked.length}/{PDF_MAX_PAGES}
            </span>
          </div>
        </>
      )}

      {/* Утасны камер шууд нээгдэнэ (capture) ба зургийн сан — хоёр тусдаа оролт */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
