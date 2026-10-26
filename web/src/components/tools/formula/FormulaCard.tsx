"use client";

import { memo, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Copy, Eye, Lightbulb, ListPlus, Play, Presentation, TriangleAlert, Target } from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import { Badge } from "@/components/ui/kit/badge";
import { cn } from "@/lib/cn";
import { conditionMath, displayMath, type SheetFormula } from "./formulaSheet.ts";

/** LaTeX-ийг санах ойд хуулна (хуучин хөтөчид textarea-аар) */
export async function copyLatex(latex: string) {
  try {
    await navigator.clipboard.writeText(latex);
    toast.success("LaTeX хуулагдлаа");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = latex;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) toast.success("LaTeX хуулагдлаа");
      else throw new Error("copy");
    } catch {
      toast.error("Хуулж чадсангүй, томьёог гараар сонгоно уу");
    }
  }
}

const actionCls =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-sm font-medium text-ink-dim transition-colors duration-[var(--dur-micro)] hover:text-ink";

interface Props {
  f: SheetFormula;
  sectionName?: string;
  inBasket: boolean;
  onToggleBasket: (slug: string) => void;
  onProject: (slug: string) => void;
  onWidget?: (widget: string) => void;
  loggedIn: boolean;
}

function FormulaCardImpl({ f, sectionName, inBasket, onToggleBasket, onProject, onWidget, loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4" aria-labelledby={`${detailsId}-t`}>
      <header className="flex flex-wrap items-start gap-2">
        <h3 id={`${detailsId}-t`} className="min-w-0 flex-1 text-base font-semibold text-ink cyrillic-heading">
          {f.title}
        </h3>
        <div className="flex flex-wrap gap-1">
          {sectionName && <Badge>{sectionName}</Badge>}
          <Badge tone="brand">{f.grade}-р анги</Badge>
          {f.level === "EXTRA" && <Badge tone="info">Нэмэлт</Badge>}
        </div>
      </header>

      <div className="mt-2 min-w-0 max-w-full overflow-x-auto py-1 text-lg text-ink [&_.katex-display]:!my-1 [&_.katex-display]:!text-left">
        <MathText>{displayMath(f.latex)}</MathText>
      </div>

      {f.conditions.length > 0 && (
        <div className="mt-1 text-sm text-ink-dim">
          <span className="font-medium text-ink">Нөхцөл</span>
          {/* Нөхцөл бүр тусдаа мөрөнд, урт бол хэвтээ гүйлгэнэ: томьёо дундуураа тасарч овоорохгүй */}
          {f.conditions.map((c, i) => (
            <div key={i} className="min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <MathText>{conditionMath(c)}</MathText>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={cn(actionCls, inBasket && "border-brand-bright/50 bg-brand-bright/12 text-brand-soft")}
          aria-pressed={inBasket}
          onClick={() => onToggleBasket(f.slug)}
          title={inBasket ? "Миний хуудаснаас хасах" : "Миний хуудсанд нэмэх"}
        >
          {inBasket ? <Check className="h-4 w-4" aria-hidden /> : <ListPlus className="h-4 w-4" aria-hidden />}
          <span>Хуудсанд</span>
        </button>
        <button type="button" className={actionCls} onClick={() => copyLatex(f.latex)} aria-label="LaTeX хуулах" title="LaTeX хуулах">
          <Copy className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">LaTeX</span>
        </button>
        <button type="button" className={actionCls} onClick={() => onProject(f.slug)} aria-label="Томруулж харах" title="Томруулж харах">
          <Presentation className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Томруулах</span>
        </button>
        {f.widget && onWidget && (
          <button type="button" className={actionCls} onClick={() => onWidget(f.widget as string)} aria-label="Хөдөлгөөнтөөр харах" title="Хөдөлгөөнтөөр харах">
            <Play className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Хөдөлгөөнт</span>
          </button>
        )}
        {loggedIn && (
          <Link href={`/app/formulas/${f.slug}`} className={actionCls} aria-label="Дэлгэрэнгүй хуудас" title="Дэлгэрэнгүй хуудас">
            <ArrowUpRight className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Дэлгэрэнгүй</span>
          </Link>
        )}
        <button
          type="button"
          className={cn(actionCls, "ml-auto")}
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
        >
          <span>Тайлбар</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-[var(--dur-base)]", open && "rotate-180")} aria-hidden />
        </button>
      </div>

      {open && (
        <div id={detailsId} className="mt-3 space-y-3 border-t border-line pt-3 text-sm text-ink">
          {f.explanation && <MathText className="block text-ink">{f.explanation}</MathText>}
          {f.general && (
            <Block title="Ерөнхий хэлбэр">
              <div className="overflow-x-auto [&_.katex-display]:!my-1 [&_.katex-display]:!text-left">
                <MathText>{displayMath(f.general)}</MathText>
              </div>
            </Block>
          )}
          {f.variants && f.variants.length > 0 && (
            <Block title="Хувилбарууд">
              <ul className="space-y-1">
                {f.variants.map((v, i) => (
                  <li key={i} className="overflow-x-auto">
                    {v.label && <span className="text-ink-dim">{v.label}: </span>}
                    <MathText>{conditionMath(v.latex)}</MathText>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {f.mnemonic && (
            <Block title="Санах арга" icon={Lightbulb}>
              <MathText>{f.mnemonic}</MathText>
            </Block>
          )}
          {f.examples.length > 0 && (
            <Block title="Жишээ">
              <ol className="space-y-2">
                {f.examples.map((e, i) => (
                  <Example key={i} n={i + 1} problem={e.problem} steps={e.steps} answer={e.answer} />
                ))}
              </ol>
            </Block>
          )}
          {f.commonMistakes.length > 0 && (
            <Block title="Түгээмэл алдаа" icon={TriangleAlert}>
              <ul className="list-disc space-y-1 pl-5">
                {f.commonMistakes.map((m, i) => (
                  <li key={i}>
                    <MathText>{m}</MathText>
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {f.eeshTip && (
            <Block title="ЭЕШ-ийн зөвлөгөө" icon={Target}>
              <MathText>{f.eeshTip}</MathText>
            </Block>
          )}
        </div>
      )}
    </article>
  );
}

export const FormulaCard = memo(FormulaCardImpl);

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof Lightbulb; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-dim">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {title}
      </h4>
      {children}
    </section>
  );
}

function Example({ n, problem, steps, answer }: { n: number; problem: string; steps: string[]; answer: string }) {
  const [show, setShow] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-bg p-3">
      <div className="flex gap-2">
        <span className="font-semibold text-ink-dim">{n}.</span>
        <MathText className="min-w-0 flex-1">{problem}</MathText>
      </div>
      {show ? (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          {steps.map((s, i) => (
            <MathText key={i} className="block">
              {s}
            </MathText>
          ))}
          {answer && (
            <p className="font-semibold">
              Хариу: <MathText>{answer}</MathText>
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShow(true)}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-brand hover:underline"
        >
          <Eye className="h-4 w-4" aria-hidden />
          Бодолт харах
        </button>
      )}
    </li>
  );
}
