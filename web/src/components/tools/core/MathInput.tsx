"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { MathfieldElement } from "mathlive";
import { cn } from "@/lib/cn";

/* ============================================================================
 * Хэрэглэгдэхүүний НИЙТЛЭГ математик оруулга (Бодогч, дараа нь График).
 *
 *   <MathInput ref={h} value={latex} onChange={(latex, plain) => …} onEnter={…} />
 *   <MathKeyboard field={h} onEnter={…} />        (core/MathKeyboard.tsx)
 *
 * - MathLive (npm, CDN БИШ) зөвхөн клиентэд dynamic import. Бутархай нь жинхэнэ
 *   дээд/доод нүдтэй, курсор нүд хооронд шилжинэ.
 * - MathLive-ийн өөрийн виртуал гар УНТАРСАН; утасны системийн гар гарахгүй
 *   (inputmode=none) — оронд нь MathKeyboard. Компьютерт физик гараар бичнэ.
 * - Хоосон нүд (бутархай, зэрэг, язгуур) тасархай хүрээтэй, курсор нүдэнд очно.
 * - Фонт: KaTeX-ийн фонт (MathText аль хэдийн ачаалдаг), дуу байхгүй.
 * - MathLive ачаалагдаагүй/алдаа гарвал энгийн бичвэрийн талбар (plain=true).
 * ========================================================================== */

export interface MathInputHandle {
  /** LaTeX оруулна: #0 — сонголт/хоосон нүд, #? — хоосон нүд, #@ — өмнөх тэмдэгт */
  insert: (latex: string) => void;
  /** Гараар бичсэн мэт (хаалт хос болно) */
  typed: (text: string) => void;
  /** MathLive тушаал: moveToPreviousChar, moveToNextChar, deleteBackward … */
  command: (cmd: string) => void;
  clear: () => void;
  focus: () => void;
  getValue: () => string;
  setValue: (latex: string) => void;
}

/** «sqrt» → √, «pi» → π, «<=» → ≤ … (MathLive-ийн өгөгдмөл жагсаалтын оронд — гэнэтийн хувиргалтгүй) */
const SHORTCUTS: Record<string, string> = {
  sqrt: "\\sqrt{#?}",
  cbrt: "\\sqrt[3]{#?}",
  pi: "\\pi",
  inf: "\\infty",
  infty: "\\infty",
  "<=": "\\le",
  ">=": "\\ge",
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\operatorname{tg}",
  tg: "\\operatorname{tg}",
  cot: "\\operatorname{ctg}",
  ctg: "\\operatorname{ctg}",
  arcsin: "\\arcsin",
  arccos: "\\arccos",
  arctg: "\\operatorname{arctg}",
  arctan: "\\operatorname{arctg}",
  arcctg: "\\operatorname{arcctg}",
  ln: "\\ln",
  lg: "\\lg",
  log: "\\log_{#?}",
  abs: "\\left|#?\\right|",
};

let configured = false;
async function loadMathLive(): Promise<typeof MathfieldElement> {
  const ml = await import("mathlive");
  const M = ml.MathfieldElement;
  if (!configured) {
    M.fontsDirectory = null;
    M.soundsDirectory = null;
    M.keypressSound = null;
    M.plonkSound = null;
    configured = true;
  }
  return M;
}

const FIELD_CSS = `
.pi-math-input math-field {
  display: block; width: 100%; min-height: 3rem; padding: 0.5rem 0.25rem;
  font-size: var(--pi-math-size, 26px); color: var(--ink); background: transparent;
  border: 0; outline: none; box-shadow: none;
  --caret-color: var(--brand);
  --selection-background-color: var(--brand-tint);
  --selection-color: var(--ink);
  --contains-highlight-background-color: transparent;
  --primary: var(--brand);
  --smart-fence-color: var(--ink-dim);
  --smart-fence-opacity: 0.6;
  --placeholder-color: var(--ink-dim);
  --placeholder-opacity: 0.7;
  --text-font-family: inherit;
}
.pi-math-input math-field:focus, .pi-math-input math-field:focus-within { outline: none; }
.pi-math-input math-field::part(menu-toggle),
.pi-math-input math-field::part(virtual-keyboard-toggle) { display: none; }
.pi-math-input math-field::part(content) { padding: 2px 0; }
.pi-math-input math-field::part(placeholder) { color: var(--ink-dim); }
`;

interface Props {
  ref?: Ref<MathInputHandle>;
  /** LaTeX (эсвэл plain горимд энгийн бичвэр) */
  value: string;
  onChange: (value: string, plain: boolean) => void;
  onEnter?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Томьёоны хэмжээ (px) */
  size?: number;
}

export default function MathInput({ ref, value, onChange, onEnter, onFocus, placeholder, ariaLabel, className, size = 26 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldElement | null>(null);
  const plainRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "plain">("loading");
  const cb = useRef({ onChange, onEnter, onFocus });
  useEffect(() => {
    cb.current = { onChange, onEnter, onFocus };
  });
  const initial = useRef(value);

  useEffect(() => {
    let alive = true;
    let mf: MathfieldElement | null = null;
    loadMathLive()
      .then((M) => {
        if (!alive || !host.current) return;
        mf = new M();
        mf.setAttribute("aria-label", ariaLabel);
        mf.setAttribute("math-virtual-keyboard-policy", "manual");
        const m0 = mf;
        m0.addEventListener(
          "mount",
          () => {
            try {
              m0.menuItems = [];
            } catch {
              /* цэс үлдсэн ч ажиллагаанд нөлөөгүй */
            }
          },
          { once: true },
        );
        host.current.appendChild(mf);
        // Тохиргоог суусны дараа (зарим нь суугаагүй үед алдаа өгдөг); нэг нь бүтэлгүйтвэл бусад нь үйлчилнэ
        const el = mf;
        const opts: (() => void)[] = [
          () => (el.mathVirtualKeyboardPolicy = "manual"),
          () => (el.defaultMode = "math"),
          () => (el.smartMode = false),
          () => (el.smartFence = true),
          () => (el.letterShapeStyle = "tex"),
          () => (el.popoverPolicy = "off"),
          () => (el.environmentPopoverPolicy = "off"),
          () => (el.inlineShortcuts = SHORTCUTS),
          () => (el.inlineShortcutTimeout = 0),
          () => (el.menuItems = []),
        ];
        for (const o of opts) {
          try {
            o();
          } catch {
            /* өгөгдмөл хэвээр */
          }
        }
        el.value = initial.current;
        el.addEventListener("input", () => cb.current.onChange(el.value, false));
        el.addEventListener("focusin", () => cb.current.onFocus?.());
        el.addEventListener(
          "keydown",
          (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              cb.current.onEnter?.();
            }
          },
          { capture: true },
        );
        // Утсан дээр системийн гар гарахгүй (MathLive өөрөө тавьдаг ч баталгаажуулна)
        const sink = () => el.shadowRoot?.querySelector('[part="keyboard-sink"]')?.setAttribute("inputmode", "none");
        sink();
        el.addEventListener("focusin", sink);
        mfRef.current = mf;
        setState("ready");
      })
      .catch(() => {
        if (alive) setState("plain");
      });
    return () => {
      alive = false;
      mf?.remove();
      mfRef.current = null;
    };
    // ariaLabel өөрчлөгдөхөд элементийг дахин үүсгэхгүй
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Гаднаас утга солигдвол (жишээ, түүх, цэвэрлэх) талбарт тавина
  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== value) mf.setValue(value, { silenceNotifications: true });
  }, [value, state]);

  useImperativeHandle(
    ref,
    () => ({
      insert: (latex) => {
        const mf = mfRef.current;
        if (mf) {
          mf.insert(latex, { format: "latex", selectionMode: "placeholder", focus: true });
          cb.current.onChange(mf.value, false);
          return;
        }
        const el = plainRef.current;
        if (el) plainInsert(el, plainOf(latex), (v) => cb.current.onChange(v, true));
      },
      typed: (text) => {
        const mf = mfRef.current;
        if (mf) {
          mf.executeCommand(["typedText", text, { focus: true, feedback: false, simulateKeystroke: true }]);
          cb.current.onChange(mf.value, false);
          return;
        }
        const el = plainRef.current;
        if (el) plainInsert(el, text, (v) => cb.current.onChange(v, true));
      },
      command: (cmd) => {
        const mf = mfRef.current;
        if (mf) {
          mf.executeCommand(cmd as never);
          mf.focus();
          cb.current.onChange(mf.value, false);
          return;
        }
        const el = plainRef.current;
        if (!el) return;
        const s = el.selectionStart ?? el.value.length;
        if (cmd === "deleteBackward" && s > 0) {
          const v = el.value.slice(0, s - 1) + el.value.slice(el.selectionEnd ?? s);
          cb.current.onChange(v, true);
          requestAnimationFrame(() => el.setSelectionRange(s - 1, s - 1));
        } else if (cmd === "moveToPreviousChar") el.setSelectionRange(Math.max(0, s - 1), Math.max(0, s - 1));
        else if (cmd === "moveToNextChar") el.setSelectionRange(s + 1, s + 1);
        el.focus();
      },
      clear: () => {
        const mf = mfRef.current;
        if (mf) {
          mf.setValue("", { silenceNotifications: true });
          mf.focus();
        }
        cb.current.onChange("", !mf);
      },
      focus: () => (mfRef.current ?? plainRef.current)?.focus(),
      getValue: () => mfRef.current?.value ?? plainRef.current?.value ?? "",
      setValue: (latex) => {
        const mf = mfRef.current;
        if (mf) mf.setValue(latex, { silenceNotifications: true });
        cb.current.onChange(latex, !mf);
      },
    }),
    [],
  );

  const empty = !value.trim();
  return (
    <div className={cn("pi-math-input relative min-w-0", className)} style={{ ["--pi-math-size" as string]: `${size}px` }}>
      <style>{FIELD_CSS}</style>
      {state === "plain" ? (
        <input
          ref={plainRef}
          value={value}
          onChange={(e) => onChange(e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter?.();
            }
          }}
          onFocus={onFocus}
          aria-label={ariaLabel}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 w-full bg-transparent px-1 font-mono text-lg text-ink outline-none"
        />
      ) : (
        <div ref={host} className="min-h-12" />
      )}
      {state === "loading" && <div aria-hidden className="absolute inset-y-2 left-1 w-40 rounded-md skeleton" />}
      {state !== "loading" && empty && placeholder && (
        <span aria-hidden className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 border-b-2 border-dotted border-ink-dim/45 pb-0.5 text-lg text-ink-dim/80">
          {placeholder}
        </span>
      )}
    </div>
  );
}

/* ---------- MathLive байхгүй үеийн энгийн бичвэр ---------- */

function plainOf(latex: string): string {
  return latex
    .replace(/\\left\(#0\\right\)\^\{\\prime\}/g, "(")
    .replace(/\\left\(#0\\right\)/g, "(")
    .replace(/\\left\[#0\\right\]/g, "(")
    .replace(/\\log_\{10\}\\left\(#0\\right\)/g, "lg(")
    .replace(/\\log_\{2\}\\left\(#0\\right\)/g, "log_2(")
    .replace(/\\(exp|sin\^\{2\}|cos\^\{2\})\\left\(#0\\right\)/g, (_, f: string) => `${f.replace(/\^\{2\}/, "^2")}(`)
    .replace(/\\frac\{\\pi\}\{#\?\}/g, "pi/")
    .replace(/#\?\\frac\{#\?\}\{#\?\}/g, "")
    .replace(/#@!/g, "!")
    .replace(/#@\\degree/g, "°")
    .replace(/\\%/g, "/100")
    .replace(/\\lfloor #0\\rfloor/g, "floor(")
    .replace(/\\frac\{#@\}\{#\?\}/g, "/")
    .replace(/#@\^\{([23])\}/g, "^$1")
    .replace(/#@\^\{#\?\}/g, "^")
    .replace(/\\sqrt\[3\]\{#0\}/g, "cbrt(")
    .replace(/\\sqrt\[#\?\]\{#0\}/g, "root(")
    .replace(/\\sqrt\{#0\}/g, "sqrt(")
    .replace(/\\left\|#0\\right\|/g, "|")
    .replace(/\\operatorname\{([a-z]+)\}\\left\(#0\\right\)/g, "$1(")
    .replace(/\\(sin|cos|ln|lg|arcsin|arccos)\\left\(#0\\right\)/g, "$1(")
    .replace(/\\log_\{#\?\}\\left\(#0\\right\)/g, "log_")
    .replace(/\\mathrm\{C\}_\{#\?\}\^\{#\?\}/g, "C(")
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\le/g, "<=")
    .replace(/\\ge/g, ">=")
    .replace(/\\pi/g, "pi")
    .replace(/\\infty/g, "inf")
    .replace(/\\degree/g, "°")
    .replace(/#[0?@]/g, "")
    .replace(/\\/g, "");
}

function plainInsert(el: HTMLInputElement, text: string, set: (v: string) => void) {
  const s0 = el.selectionStart ?? el.value.length, s1 = el.selectionEnd ?? el.value.length;
  const v = el.value.slice(0, s0) + text + el.value.slice(s1);
  set(v);
  const pos = s0 + text.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}
