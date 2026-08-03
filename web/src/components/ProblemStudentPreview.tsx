"use client";

import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { Check } from "lucide-react";

/**
 * "Сурагчид ингэж харагдана" — багш бодлого оруулж байх үеийн шууд preview.
 *
 * Шалгалт бодох дэлгэцийн (app/tests/[id]) бодлогын картыг яг хуулбарлана:
 *   - MathText статемент ($...$ LaTeX)
 *   - Зураг (imageKey → fileUrl), геометрийн зурагтай бол ProblemFigure-ээр
 *     хажуу/дээр layout-той, lightbox зумтай харуулна
 *   - CHOICE: бүтэцтэй сонголтууд TEXT горимоор — ҮСЭГГҮЙ, зөвхөн утга
 *     (сурагч бүрд дараалал нь холилдоно). Зөв хариуг зөвхөн багшид
 *     жижиг ✓ тэмдгээр ялгаж харуулна — сурагчид энэ тэмдэг харагдахгүй.
 *   - FILL_NUMBER / OPEN: хариултын оролтын хэлбэрийг дуурайлгана.
 *
 * Тайлбар: navy-theme картын дэвсгэр (bg-brand-navy-soft) нь шалгалтын
 * дэлгэцтэй ижил, санаатайгаар ХОЁР горимд (цайвар/харанхуй) хэвээр
 * харанхуй үлдэнэ — тиймээс дотор нь дэвсгэрээс хамааралгүй тогтмол цайвар
 * өнгийг (text-brand-soft) ашиглана (theme-хамааралтай text-ink-dim биш).
 */

export interface PreviewChoice {
  text: string;
  isCorrect: boolean;
}

export default function ProblemStudentPreview({
  statementText,
  imageKey,
  // TODO: бодлогын загварт imageAlt (зургийн alt текст) талбар алга байгаа тул
  // одоохондоо энэ preview-д алдагдалгүй харуулах боломжгүй. Prisma schema-д
  // Problem.imageAlt нэмэгдмэгц энд prop болгож дамжуулна (бусад агентын хариуцах
  // файл тул энд өөрөө нэмэхгүй).
  format,
  points,
  choices = [],
  order = 1,
}: {
  statementText?: string | null;
  imageKey?: string | null;
  format: string; // CHOICE | FILL_NUMBER | OPEN
  points: number;
  choices?: PreviewChoice[];
  order?: number;
}) {
  // Хоосон мөрүүд сурагчид очихгүй тул preview-д ч харуулахгүй
  const visible = choices.filter((c) => c.text.trim() !== "");
  const isChoice = format === "CHOICE" && visible.length > 0;

  return (
    <div className="rounded-2xl border border-dashed border-brand-bright/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-soft">
          Сурагчид ингэж харагдана
        </p>
        {isChoice && (
          <p className="text-[11px] text-ink-dim inline-flex items-center gap-1.5">
            Дараалал сурагч бүрд холилдоно ·{" "}
            <Check className="h-4 w-4" aria-hidden /> зөвхөн танд
          </p>
        )}
      </div>

      {/* Шалгалтын дэлгэцийн бодлогын карт (navy theme, санаатайгаар тогтмол харанхуй) */}
      <div className="rounded-2xl border border-line bg-brand-navy-soft p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-bright/15 text-base font-bold text-brand-soft">
            {order}
          </span>
          <span className="text-[11px] text-brand-soft/80">{points} оноо</span>
        </div>

        {/* Энэ бол багшийн засварлаж буй ганц бодлогын preview тул үргэлж
            "одоогийн" асуулт — зургийг eager+high priority-гоор ачаална,
            isStaffView=true тул alt дутуу бол багшид анхааруулга үзүүлнэ */}
        <ProblemFigure imageKey={imageKey} isCurrent isStaffView>
          <div className="text-lg leading-relaxed">
            {statementText?.trim() ? (
              <MathText>{statementText}</MathText>
            ) : (
              <span className="text-sm text-ink-dim">Бодлогын текст энд гарна…</span>
            )}
          </div>
        </ProblemFigure>

        {isChoice ? (
          // TEXT горим: үсэггүй, зөвхөн утга — шалгалтын дэлгэцтэй ижил загвар
          <div className="mt-5 space-y-2">
            {visible.map((c, ci) => (
              <div
                key={ci}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left ${
                  c.isCorrect
                    ? "border-success/50 bg-success/10"
                    : "border-line text-brand-soft/80"
                }`}
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    c.isCorrect ? "border-success/70" : "border-line"
                  }`}
                />
                <span className="flex-1">
                  <MathText>{c.text}</MathText>
                </span>
                {c.isCorrect && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <Check className="h-4 w-4 text-success" aria-label="Зөв хариу" />
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : format === "FILL_NUMBER" ? (
          <div className="mt-5 w-full max-w-xs rounded-xl border border-line px-4 py-3 text-sm text-ink-dim">
            Тоон хариулт — сурагч тоон гараар оруулна
          </div>
        ) : format === "OPEN" ? (
          <div className="mt-5 w-full max-w-xs rounded-xl border border-line px-4 py-3 text-sm text-ink-dim">
            Хариугаа бичнэ үү
          </div>
        ) : (
          <p className="mt-5 text-xs text-ink-dim">
            Сонголтын текстүүдийг оруулбал энд харагдана
          </p>
        )}
      </div>
    </div>
  );
}
