"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { Box, Calculator, ChartSpline, Sigma, Triangle, type LucideIcon } from "lucide-react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { TOOL_KEYS, ToolsNavContext, setPending, type ToolKey } from "./hub";

/* ============================================================================
 * Хэрэглэгдэхүүний төв: 5 хэрэгслийн таб. Хэрэгсэл бүр тусдаа chunk —
 * зөвхөн нээсэн табынхаа кодыг татна (утас, удаан интернэт).
 * Таб нь хаягт (?t=graph) — линкээр хуваалцаж, буцах товч ажиллана.
 * ========================================================================== */

function ToolLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="order-1 h-[58vh] rounded-2xl skeleton lg:order-2" />
      <div className="order-2 space-y-3 lg:order-1">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

const TOOLS: Record<ToolKey, { label: string; short: string; icon: LucideIcon; C: ComponentType }> = {
  graph: { short: "График", label: "График", icon: ChartSpline, C: dynamic(() => import("../graph/GraphTool"), { ssr: false, loading: ToolLoading }) },
  plane: { short: "Дүрс", label: "Хавтгайн дүрс", icon: Triangle, C: dynamic(() => import("../plane/PlaneTool"), { ssr: false, loading: ToolLoading }) },
  solid: { short: "Биет", label: "Биет", icon: Box, C: dynamic(() => import("../solid/SolidTool"), { ssr: false, loading: ToolLoading }) },
  formula: { short: "Томьёо", label: "Томьёо", icon: Sigma, C: dynamic(() => import("../formula/FormulaTool"), { ssr: false, loading: ToolLoading }) },
  solve: { short: "Бодогч", label: "Бодогч", icon: Calculator, C: dynamic(() => import("../solve/SolveTool"), { ssr: false, loading: ToolLoading }) },
};

export function isToolKey(v: unknown): v is ToolKey {
  return typeof v === "string" && (TOOL_KEYS as string[]).includes(v);
}

export default function ToolsHub({ initialTab, basePath }: { initialTab?: string; basePath: string }) {
  const [tab, setTab] = useState<ToolKey>(isToolKey(initialTab) ? initialTab : "solve");
  // Нэг удаа нээсэн табыг DOM-д үлдээнэ — буцаж ороход оруулсан зүйл алдагдахгүй
  const [opened, setOpened] = useState<Set<ToolKey>>(() => new Set([isToolKey(initialTab) ? initialTab : "solve"]));
  const tabRefs = useRef<Partial<Record<ToolKey, HTMLButtonElement | null>>>({});

  const select = useCallback(
    (k: ToolKey) => {
      setTab(k);
      setOpened((s) => (s.has(k) ? s : new Set(s).add(k)));
      const url = `${basePath}?t=${k}`;
      if (location.pathname + location.search !== url) history.replaceState(null, "", url);
    },
    [basePath],
  );

  const nav = useMemo(
    () => ({
      go: (k: ToolKey, payload?: unknown) => {
        if (payload !== undefined) setPending(k, payload);
        select(k);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    }),
    [select],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TOOL_KEYS.indexOf(tab);
    const next = e.key === "ArrowRight" ? TOOL_KEYS[(i + 1) % TOOL_KEYS.length] : e.key === "ArrowLeft" ? TOOL_KEYS[(i + TOOL_KEYS.length - 1) % TOOL_KEYS.length] : null;
    if (!next) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <ToolsNavContext.Provider value={nav}>
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Хэрэглэгдэхүүн"
          onKeyDown={onKey}
          className="grid grid-cols-5 gap-1.5 sm:flex sm:gap-2"
        >
          {TOOL_KEYS.map((k) => {
            const { label, icon: Icon } = TOOLS[k];
            const on = k === tab;
            return (
              <button
                key={k}
                ref={(el) => {
                  tabRefs.current[k] = el;
                }}
                role="tab"
                id={`tool-tab-${k}`}
                aria-selected={on}
                aria-controls={`tool-panel-${k}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(k)}
                className={cn(
                  "inline-flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-semibold transition-colors duration-[var(--dur-micro)] sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3.5 sm:text-sm",
                  on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
                )}
              >
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                <span className="cyrillic-tight truncate sm:hidden">{TOOLS[k].short}</span>
                <span className="cyrillic-tight hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
        {TOOL_KEYS.filter((k) => opened.has(k)).map((k) => {
          const { C } = TOOLS[k];
          return (
            <div key={k} role="tabpanel" id={`tool-panel-${k}`} aria-labelledby={`tool-tab-${k}`} hidden={k !== tab}>
              <C />
            </div>
          );
        })}
      </div>
    </ToolsNavContext.Provider>
  );
}
