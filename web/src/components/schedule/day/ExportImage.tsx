"use client";

import { ImageDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { exportModel } from "./exportModel";
import { loadExportFonts, renderSchedule } from "./drawSchedule";
import type { DayPlanResponse } from "./types";

/** Утас/таблет (iOS, Android, iPadOS) — Web Share-ээр Photos/Gallery руу; бусад нь шууд татна */
function isHandheld(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ нь Mac гэж танигддаг — мэдрэгчтэй дэлгэцээр ялгана
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b && b.size ? resolve(b) : reject(new Error("empty image"))), "image/png"),
  );
}

/**
 * «Зураг татах» (эзэн 2026-10-18, засвар 2026-11-08): өдрийн хуваарьт харагдаж буй бүх
 * зүйлийг (анги, цаг, багш, тест, тарах/үлдэнэ, тарсан цаг, онолын зураг, тэмдэглэл, ирц,
 * амрах анги, хоол, ажиллах багш) PNG болгоно. Компьютер → Downloads хавтас руу шууд;
 * утас → урьдчилан харуулаад «Хадгалах» (Web Share → Photos/Gallery, эс бөгөөс татна).
 * Тарах/үлдэнэ, тэмдэглэл нь ажилтны мэдээлэл — зургийг багш нарын группт хуваалцана.
 */
export default function ExportImage({ data }: { data: DayPlanResponse }) {
  const [rendering, setRendering] = useState(false);
  const [file, setFile] = useState<{ url: string; file: File } | null>(null);
  const model = exportModel(data);
  const name = `huvaari-${data.date}.png`;

  async function run() {
    setRendering(true);
    try {
      await loadExportFonts();
      const blob = await toBlob(renderSchedule(model));
      if (isHandheld()) {
        // Утсанд: Web Share нь хэрэглэгчийн шинэ товшилт шаарддаг тул урьдчилан харуулаад «Хадгалах»
        setFile({ url: URL.createObjectURL(blob), file: new File([blob], name, { type: "image/png" }) });
      } else {
        // Компьютерт: Татаж авсан хавтас руу шууд
        download(blob, name);
        toast.success("Зураг татагдлаа", { description: name });
      }
    } catch (err) {
      console.error("Хуваарийн зураг үүсгэж чадсангүй", err);
      toast.error("Зураг үүсгэж чадсангүй", { description: "Дахин оролдоно уу" });
    } finally {
      setRendering(false);
    }
  }

  async function save() {
    if (!file) return;
    try {
      if (navigator.canShare?.({ files: [file.file] })) {
        await navigator.share({ files: [file.file], title: `Хуваарь ${model.title}` });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    download(file.file, name);
  }

  function close() {
    if (file) URL.revokeObjectURL(file.url);
    setFile(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={rendering || data.entries.length === 0}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
      >
        <ImageDown className="size-4" aria-hidden />
        {rendering ? "Бэлтгэж байна" : "Зураг татах"}
      </button>

      <Drawer open={file !== null} onOpenChange={(o) => !o && close()}>
        <DrawerContent className="mx-auto w-full max-w-2xl" aria-describedby={undefined}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2">
            <DrawerTitle className="text-lg font-bold">Хуваарийн зураг</DrawerTitle>
            {file && (
              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line" data-vaul-no-drag>
                {/* eslint-disable-next-line @next/next/no-img-element -- локал blob зураг */}
                <img src={file.url} alt={`Хуваарь ${model.title}`} className="block w-full" />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line bg-panel text-sm font-semibold"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-bright text-sm font-semibold text-on-brand"
              >
                <Share2 className="size-4" aria-hidden />
                Хадгалах
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
