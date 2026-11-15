"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import type { PaperMaterial } from "./types";

/**
 * Шалгалтын материал — ЗӨВХӨН ХАРАХ (эзэн 2026-11-15, оюуны өмч). Хуудас бүр Piemath-ын
 * бүдэг саарал логотой JPEG (лого зурган дотроо шингэсэн). Татах товч байхгүй; баруун
 * товч, чирэх, утсанд удаан дарж хадгалахыг хаана. Сурагч зөвхөн өөрийн хувилбарыг авна
 * (сервер шийднэ), ажилтан `variant`-аар дурынхыг.
 */
export default function MaterialViewer({ examId, variant, staff }: { examId: string; variant?: string; staff?: boolean }) {
  const [data, setData] = useState<PaperMaterial | null>(null);
  const [error, setError] = useState("");
  const path = staff
    ? `/paper-exams/${encodeURIComponent(examId)}/material?variant=${encodeURIComponent(variant ?? "A")}`
    : `/paper-exams/my/${encodeURIComponent(examId)}/material`;
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
      <p className="flex items-center gap-2 text-sm text-ink-dim">
        <FileText className="size-4" aria-hidden /> {data.variant} хувилбар · {data.pages.length} хуудас · зөвхөн харах
      </p>
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
