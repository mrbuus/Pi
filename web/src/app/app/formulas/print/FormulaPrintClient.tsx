"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { PrintMath } from "@/components/formulas/PrintMath";
import { useFormulaRequest } from "@/components/formulas/useFormulaRequest";
import type {
  FormulaSection,
  FormulaSummary,
} from "@/components/formulas/types";
import styles from "@/components/formulas/Print.module.css";
export default function FormulaPrintClient() {
  const params = useSearchParams(),
    section = params.get("section") ?? "";
  const catalog = useFormulaRequest<FormulaSummary[]>("/formulas?level=CORE"),
    sections = useFormulaRequest<FormulaSection[]>("/formulas/sections");
  const loading = catalog.loading || sections.loading;
  const groups = [...(sections.data ?? [])].sort((a, b) => a.order - b.order);
  const known = new Set(groups.map((s) => s.slug));
  const isUnfiled = (f: FormulaSummary) => !f.section || !known.has(f.section);
  const filtered = (catalog.data ?? []).filter(
    (f) =>
      f.level === "CORE" &&
      (!section ||
        (section === "unfiled" ? isUnfiled(f) : f.section === section)),
  );
  if ((catalog.data ?? []).some((f) => f.level === "CORE" && isUnfiled(f)))
    groups.push({
      slug: "unfiled",
      title: "Бусад томьёо",
      order: 99,
      count: 0,
      icon: null,
      description: null,
    });
  return (
    <div
      className={`${styles.printRoot} min-w-0 space-y-5 pb-6 [&_button]:min-h-11`}
    >
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button asChild variant="ghost">
          <Link href="/app/formulas">Томьёоны сан</Link>
        </Button>
        <Button
          onClick={() => window.print()}
          disabled={
            loading || !!catalog.error || !!sections.error || !filtered.length
          }
        >
          <Printer aria-hidden />
          Хэвлэх
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold">ЭЕШ-ийн гол томьёо</h1>
        <p className="mt-2 text-sm text-ink-dim">{filtered.length} томьёо</p>
      </div>
      <div className="print:hidden">
        <label
          htmlFor="print-section"
          className="mb-1 block text-sm font-semibold"
        >
          Бүлэг
        </label>
        <select
          id="print-section"
          value={section}
          className="min-h-12 max-w-full rounded-xl border border-line bg-panel px-3"
          onChange={(e) => {
            const url = new URL(window.location.href);
            if (e.target.value) url.searchParams.set("section", e.target.value);
            else url.searchParams.delete("section");
            window.history.replaceState(
              null,
              "",
              `${url.pathname}${url.search}`,
            );
          }}
        >
          <option value="">Бүх бүлэг</option>
          {section && !groups.some((s) => s.slug === section) && (
            <option value={section}>Бүлэг олдсонгүй</option>
          )}
          {groups.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <LoadingState />
      ) : catalog.error || sections.error ? (
        <ErrorState
          message="Хэвлэх томьёог ачаалж чадсангүй."
          onRetry={() => {
            if (catalog.error) catalog.retry();
            if (sections.error) sections.retry();
          }}
        />
      ) : !filtered.length ? (
        <EmptyState
          title="Хэвлэх томьёо олдсонгүй"
          hint="Өөр бүлэг сонгоод үзээрэй."
        />
      ) : (
        groups.map((group) => {
          const items = filtered
            .filter((f) =>
              group.slug === "unfiled"
                ? !f.section || !known.has(f.section)
                : f.section === group.slug,
            )
            .sort((a, b) => a.order - b.order);
          return (
            items.length > 0 && (
              <section key={group.slug} className="space-y-3">
                <h2 className="border-b-2 border-line pb-2 text-lg font-bold">
                  {group.title}
                </h2>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
                  {items.map((f) => (
                    <article
                      key={f.slug}
                      className="min-w-0 break-inside-avoid rounded-lg border border-line p-3"
                    >
                      <h3 className="text-sm font-semibold">{f.title}</h3>
                      <PrintMath latex={f.general ?? f.latex ?? ""} />
                    </article>
                  ))}
                </div>
              </section>
            )
          );
        })
      )}
    </div>
  );
}
