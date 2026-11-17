"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import type { PaperMaterial } from "./types";

/**
 * Шалгалтын материал. Хуудас бүр Pimath-ын бүдэг саарал логотой JPEG (лого зурган дотроо
 * шингэсэн). Сурагч A, B хоёр хувилбарыг хоёуланг харна (эзэн 2026-11-16) — эхлээд өөрийнх
 * нь нээгдэнэ; ажилтан `variant`-аар дурынхыг.
 * «PDF татах» (эзэн 2026-11-17): хүссэн хүн материалыг PDF-ээр татна. PDF-ийг хөтөч дээр
 * яг эдгээр логотой хуудсуудаас угсарна (логогүй эх файл хаана ч гарахгүй); файлын нэр
 * шалгалтын нэрээс автоматаар — «Нэгдсэн шалгалт 1» → «Нэгдсэн шалгалт-1».
 */
/** «Нэгдсэн шалгалт 1» → «Нэгдсэн шалгалт-1»; файлын нэрд тохирохгүй тэмдэгтийг хасна */
export function materialFileName(title: string, variant: string, manyVariants: boolean): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+(\d+)$/, "-$1");
  return `${base || "Шалгалтын материал"}${manyVariants && variant ? `-${variant}` : ""}.pdf`;
}

function dataUriBytes(src: string): Uint8Array {
  const bin = atob(src.slice(src.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Логотой хуудсуудаас PDF угсарч татна (сан нь дарах үед л ачаалагдана) */
async function downloadPdf(pages: string[], fileName: string) {
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  for (const src of pages) {
    const image = await doc.embedJpg(dataUriBytes(src));
    // A4 хэмжээ: урт тал 842pt (хэвтээ, босоо аль ч хуудсанд), богино тал нь харьцаагаар
    const k = 842 / Math.max(image.width, image.height);
    const w = image.width * k;
    const h = image.height * k;
    doc.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h });
  }
  const bytes = await doc.save({ useObjectStreams: true });
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function MaterialViewer({
  examId,
  title,
  variant,
  staff,
  variantCount,
}: {
  examId: string;
  /** Шалгалтын нэр — татах файлын нэр болно */
  title: string;
  variant?: string;
  staff?: boolean;
  /** Ажилтны харагдацад хувилбарын тоо (файлын нэрд хувилбар залгах эсэх) */
  variantCount?: number;
}) {
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PaperMaterial | null>(null);
  const [error, setError] = useState("");
  // Сурагчийн сонгосон хувилбар; null = өөрийнх (сервер шийднэ)
  const [picked, setPicked] = useState<string | null>(null);
  const path = staff
    ? `/paper-exams/${encodeURIComponent(examId)}/material?variant=${encodeURIComponent(variant ?? "A")}`
    : `/paper-exams/my/${encodeURIComponent(examId)}/material${picked ? `?variant=${encodeURIComponent(picked)}` : ""}`;
  const load = useCallback(() => {
    api<PaperMaterial>(path)
      .then((d) => {
        setError("");
        setData(d);
      })
      .catch((e) => setError(errorText(e, "Материалыг ачаалж чадсангүй")));
  }, [path]);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <SkeletonRows rows={4} />;
  if (data.pages.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-dim">Энэ хувилбарын материал хараахан ороогүй байна</p>
      </Card>
    );
  }
  return (
    <div
      className="space-y-3 select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {!staff && (data.variants?.length ?? 0) > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Хувилбар">
          {data.variants!.map((v) => (
            <button
              key={v}
              aria-pressed={data.variant === v}
              onClick={() => v !== data.variant && setPicked(v)}
              className={cn(
                "min-h-11 rounded-xl border-2 px-4 text-sm font-bold",
                data.variant === v ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim",
              )}
            >
              {v} хувилбар{v === data.own ? " (таны өгсөн)" : ""}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-ink-dim">
          <FileText className="size-4" aria-hidden /> {data.variant} хувилбар, {data.pages.length} хуудас
        </p>
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const many = (staff ? (variantCount ?? 1) : (data.variants?.length ?? 1)) > 1;
              await downloadPdf(data.pages, materialFileName(title, data.variant, many));
            } catch {
              toast.error("PDF үүсгэж чадсангүй. Дахин оролдоно уу");
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand disabled:opacity-60"
        >
          <Download className="size-4" aria-hidden /> {saving ? "Бэлдэж байна" : "PDF татах"}
        </button>
      </div>
      {data.pages.map((src, i) => (
        <div key={i} className="relative overflow-hidden rounded-xl border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- лого шингэсэн data URI хуудас */}
          <img src={src} alt={`${i + 1}-р хуудас`} draggable={false} className="pointer-events-none block w-full" />
          {/* Зураг дээр шууд дарах/хадгалахаас хамгаалах тунгалаг давхарга */}
          <div className="absolute inset-0" aria-hidden />
        </div>
      ))}
    </div>
  );
}
