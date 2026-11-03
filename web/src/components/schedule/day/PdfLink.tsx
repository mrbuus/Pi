"use client";

import { FileDown } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Тестийн эх PDF-ийг татна — сервер тестийн нэрээр («100x100 V3 - Функц - Тест 1.pdf»)
 * attachment болгон илгээх тул хуудас хэвээр үлдэнэ. Файл нь гараар шивсэн эх
 * (A, B хамт) — бүх багшид нээлттэй, сурагчид API хаалттай.
 */
export default function PdfLink({ pdfKey, label, className }: { pdfKey?: string | null; label: string; className?: string }) {
  if (!pdfKey) return null;
  return (
    <a
      href={fileUrl(pdfKey)}
      rel="noopener noreferrer"
      aria-label={`${label} — PDF татах`}
      title="PDF татах"
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand hover:bg-brand/10",
        className,
      )}
    >
      <FileDown className="size-4" aria-hidden />
      PDF
    </a>
  );
}
