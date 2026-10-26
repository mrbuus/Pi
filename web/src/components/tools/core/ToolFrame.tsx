"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { downloadPng, downloadSvg } from "./export";

/* ============================================================================
 * Хэрэгсэл бүрийн нийтлэг хүрээ: удирдлагын самбар + зургийн талбай.
 *   - Утсан дээр: зураг дээр, удирдлага доор (зураг эхэлж харагдана)
 *   - 1024px+: удирдлага зүүнд (340px), зураг баруунд
 *   - «Дүүрэн дэлгэц» — проектороор хичээл заахад. Fullscreen API байхгүй
 *     төхөөрөмжид (iPhone Safari) CSS-ээр дэлгэц дүүргэнэ
 *   - «Зураг» / «SVG» — svgRef-ийн зургийг цагаан дэвсгэртэй татна
 * ========================================================================== */

interface Props {
  /** Зургийн хэсгийн SVG — татахад ашиглана. Өгөхгүй бол татах товч гарахгүй */
  svgRef?: RefObject<SVGSVGElement | null>;
  /** Татах файлын нэр (латинаар) */
  fileName?: string;
  /** Удирдлага, оролт */
  controls: ReactNode;
  /** Зураг / үндсэн талбай */
  children: ReactNode;
  /** Зургийн дээд мөрөнд нэмэлт товч (томруулах г.м.) */
  toolbar?: ReactNode;
  /** Зургийн доорх мөр (утгын хүснэгт, үр дүн г.м.) */
  footer?: ReactNode;
  /** Удирдлагын самбарын өргөн (1024px+) */
  wide?: boolean;
}

export default function ToolFrame({ svgRef, fileName = "pimath", controls, children, toolbar, footer, wide }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull((f) => (f && root.current?.dataset.native === "1" ? false : f));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const exitFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (root.current) root.current.dataset.native = "0";
    setFull(false);
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exitFull();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, exitFull]);

  const enterFull = async () => {
    const el = root.current;
    if (!el) return;
    setFull(true);
    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        el.dataset.native = "1";
      } catch {
        el.dataset.native = "0";
      }
    }
  };

  const save = async (kind: "png" | "svg") => {
    const svg = svgRef?.current;
    if (!svg) return;
    try {
      setBusy(true);
      if (kind === "svg") downloadSvg(svg, fileName);
      else await downloadPng(svg, fileName);
    } catch {
      toast.error("Зургийг татаж чадсангүй, дахин оролдоно уу");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={root}
      className={cn(
        "grid gap-4 bg-bg",
        wide ? "lg:grid-cols-[400px_minmax(0,1fr)]" : "lg:grid-cols-[340px_minmax(0,1fr)]",
        full && "fixed inset-0 z-[60] overflow-auto p-3 sm:p-4 lg:grid-cols-[300px_minmax(0,1fr)]",
      )}
    >
      <section
        aria-label="Зураг"
        className={cn(
          "order-1 flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:order-2",
          full ? "min-h-[calc(100dvh-2rem)]" : "min-h-[58vh] lg:min-h-[calc(100dvh-13rem)]",
        )}
      >
        <div className="flex min-h-12 items-center gap-1 border-b border-line px-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">{toolbar}</div>
          {svgRef && (
            <>
              <Button variant="ghost" size="sm" onClick={() => save("png")} disabled={busy} aria-label="Зургийг PNG-ээр татах">
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Зураг</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => save("svg")} disabled={busy} className="hidden sm:inline-flex" aria-label="Зургийг SVG-ээр татах">
                SVG
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={full ? exitFull : enterFull}
            aria-label={full ? "Дүүрэн дэлгэцээс гарах" : "Дүүрэн дэлгэц"}
            aria-pressed={full}
          >
            {full ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">{children}</div>
        {footer && <div className="border-t border-line">{footer}</div>}
      </section>
      <aside aria-label="Тохиргоо" className="order-2 min-w-0 space-y-4 lg:order-1">
        {controls}
      </aside>
    </div>
  );
}

/** Удирдлагын самбарын нэг хэсэг */
export function Panel({ title, children, className, action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Сонголтын товчлуурын бүлэг (radiogroup) — горим, биет сонгох г.м. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors duration-[var(--dur-micro)]",
              on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Тоон оролт + гулсуур (хэмжээ өгөх) */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  slider = true,
  suffix,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  slider?: boolean;
  suffix?: ReactNode;
}) {
  const [text, setText] = useState(String(value));
  // Гаднаас утга өөрчлөгдвөл бичвэрийг шинэчилнэ (effect-гүй, render үеийн тохируулга)
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }
  const commit = (s: string) => {
    const v = parseFloat(s.replace(",", "."));
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
    else setText(String(value));
  };
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-dim">{label}</span>
        <span className="flex items-center gap-1">
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
            className="h-10 w-20 rounded-lg border border-line bg-bg px-2 text-right text-sm tabular-nums text-ink"
            aria-label={typeof label === "string" ? label : undefined}
          />
          {suffix && <span className="text-sm text-ink-dim">{suffix}</span>}
        </span>
      </div>
      {slider && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="mt-1 h-8 w-full accent-[var(--brand-bright)]"
          aria-label={typeof label === "string" ? `${label} гулсуур` : undefined}
        />
      )}
    </div>
  );
}

/** Асаах/унтраах жижиг товч (давхарга харуулах) */
export function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "min-h-10 rounded-xl border px-3 text-sm font-medium transition-colors duration-[var(--dur-micro)]",
        on ? "border-brand-bright/50 bg-brand-bright/12 text-brand-soft" : "border-line bg-surface text-ink-dim hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
