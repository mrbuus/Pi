"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import MathText from "@/components/MathText";
import { conditionMath, displayMath, type SheetFormula } from "./formulaSheet.ts";
import css from "./print.module.css";

export type PrintDetail = "formula" | "conditions" | "full";

export interface PrintOpts {
  title: string;
  detail: PrintDetail;
  columns: 1 | 2;
  nameLine: boolean;
}

export const DEFAULT_PRINT: PrintOpts = { title: "Томьёоны хуудас", detail: "conditions", columns: 2, nameLine: false };

/**
 * Хэвлэх хуудас: body-д шууд залгагдана, @media print-д бусад бүхнийг нууна.
 * Зурагдсаны дараа window.print(), хэвлэлт дуусахад (afterprint) onDone.
 */
export default function PrintSheet({ formulas, opts, onDone }: { formulas: SheetFormula[]; opts: PrintOpts; onDone: () => void }) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    // KaTeX зурагдаж дуусах хүртэл нэг кадр хүлээнэ
    const id = window.setTimeout(() => window.print(), 120);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("afterprint", after);
    };
  }, [onDone]);

  return createPortal(
    <div className={css.printRoot}>
      <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
      <header className={css.head}>
        <h1 className={css.title}>{opts.title.trim() || DEFAULT_PRINT.title}</h1>
        {opts.nameLine && (
          <div className={css.nameLine}>
            <span className={css.field}>Нэр:</span>
            <span className={css.field}>Анги:</span>
            <span className={css.field}>Огноо:</span>
          </div>
        )}
      </header>
      <ol className={`${css.list} ${opts.columns === 2 ? css.cols2 : ""}`}>
        {formulas.map((f, i) => (
          <li key={f.slug} className={css.item}>
            <div className={css.itemTitle}>
              {i + 1}. {f.title}
            </div>
            <div className={css.math}>
              <MathText>{displayMath(f.latex)}</MathText>
            </div>
            {opts.detail !== "formula" && f.conditions.length > 0 && (
              <div className={css.small}>
                Нөхцөл:{" "}
                {f.conditions.map((c, k) => (
                  <span key={k}>
                    {k > 0 && ", "}
                    <MathText>{conditionMath(c)}</MathText>
                  </span>
                ))}
              </div>
            )}
            {opts.detail === "full" && f.explanation && (
              <div className={css.small}>
                <MathText>{f.explanation}</MathText>
              </div>
            )}
            {opts.detail === "full" && f.mnemonic && (
              <div className={css.small}>
                Санах арга: <MathText>{f.mnemonic}</MathText>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className={css.foot}>pimath.mn</div>
    </div>,
    document.body,
  );
}
