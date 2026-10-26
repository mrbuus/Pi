"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowLeft, ArrowRight, Delete, Play } from "lucide-react";
import type { MathfieldElement } from "mathlive";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";

/* ============================================================================
 * Хэрэглэгдэхүүний НИЙТЛЭГ математик оруулга (Бодогч, дараа нь График).
 *
 *   <MathInput ref={h} value={latex} onChange={(latex, plain) => …} onEnter={…} />
 *   <MathKeyboard target={h} onSubmit={…} />
 *
 * - MathLive (npm, CDN БИШ) зөвхөн клиентэд dynamic import. Бутархай нь жинхэнэ
 *   дээд/доод нүдтэй, курсор нүд хооронд шилжинэ.
 * - MathLive-ийн өөрийн виртуал гар УНТАРСАН; утасны системийн гар гарахгүй
 *   (inputmode=none) — оронд нь MathKeyboard. Компьютерт физик гараар бичнэ.
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
  --placeholder-color: var(--brand);
  --placeholder-opacity: 0.55;
  --text-font-family: inherit;
}
.pi-math-input math-field:focus, .pi-math-input math-field:focus-within { outline: none; }
.pi-math-input math-field::part(menu-toggle),
.pi-math-input math-field::part(virtual-keyboard-toggle) { display: none; }
.pi-math-input math-field::part(content) { padding: 2px 0; }
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
        <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-ink-dim/70">
          {placeholder}
        </span>
      )}
    </div>
  );
}

/* ---------- MathLive байхгүй үеийн энгийн бичвэр ---------- */

function plainOf(latex: string): string {
  return latex
    .replace(/\\frac\{#@\}\{#\?\}/g, "/")
    .replace(/#@\^\{2\}/g, "^2")
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

/* ============================================================================
 * Монгол математик гар (Photomath маяг): том товч, 3 хуудас
 * ========================================================================== */

export interface KeyDef {
  /** Товч дээрх LaTeX эсвэл lucide дүрс */
  label: string | ReactNode;
  /** Дэлгэц уншигчид */
  aria: string;
  /** Оруулах LaTeX (#0, #?, #@) */
  insert?: string;
  /** Гараар бичсэн мэт (хаалт) */
  typed?: string;
  /** MathLive тушаал */
  cmd?: string;
  /** Тод өнгөтэй (үйлдлийн тэмдэг) */
  tone?: "op" | "fn";
}

const k = (label: string, insert: string, aria: string, tone?: KeyDef["tone"]): KeyDef => ({ label, insert, aria, tone });
const t = (label: string, typed: string, aria: string, tone?: KeyDef["tone"]): KeyDef => ({ label, typed, aria, tone });

export const KEY_PAGES: { id: string; label: string; keys: KeyDef[] }[] = [
  {
    id: "123",
    label: "123",
    keys: [
      k("x", "x", "x"), k("x^{2}", "#@^{2}", "квадрат"), k("x^{n}", "#@^{#?}", "зэрэг"), k("7", "7", "7"), k("8", "8", "8"), k("9", "9", "9"), k("\\div", "\\div", "хуваах", "op"),
      t("(", "(", "нээх хаалт"), t(")", ")", "хаах хаалт"), k("\\frac{\\square}{\\square}", "\\frac{#@}{#?}", "бутархай"), k("4", "4", "4"), k("5", "5", "5"), k("6", "6", "6"), k("\\times", "\\times", "үржих", "op"),
      k("\\sqrt{\\square}", "\\sqrt{#0}", "квадрат язгуур"), k("|x|", "\\left|#0\\right|", "модуль"), k("\\pi", "\\pi", "пи"), k("1", "1", "1"), k("2", "2", "2"), k("3", "3", "3"), k("-", "-", "хасах", "op"),
      k("y", "y", "y"), k(",", ",", "таслал"), k(";", ";", "систем: тэгшитгэл тусгаарлах"), k("0", "0", "0"), k(".", ".", "аравтын цэг"), k("=", "=", "тэнцүү", "op"), k("+", "+", "нэмэх", "op"),
    ],
  },
  {
    id: "fx",
    label: "f(x)",
    keys: [
      k("\\sin", "\\sin\\left(#0\\right)", "синус", "fn"), k("\\cos", "\\cos\\left(#0\\right)", "косинус", "fn"), k("\\operatorname{tg}", "\\operatorname{tg}\\left(#0\\right)", "тангенс", "fn"), k("\\operatorname{ctg}", "\\operatorname{ctg}\\left(#0\\right)", "котангенс", "fn"),
      k("\\log_{\\square}", "\\log_{#?}\\left(#0\\right)", "логарифм", "fn"), k("\\ln", "\\ln\\left(#0\\right)", "натурал логарифм", "fn"), k("\\lg", "\\lg\\left(#0\\right)", "аравтын логарифм", "fn"),
      k("\\arcsin", "\\arcsin\\left(#0\\right)", "арксинус", "fn"), k("\\arccos", "\\arccos\\left(#0\\right)", "арккосинус", "fn"), k("\\operatorname{arctg}", "\\operatorname{arctg}\\left(#0\\right)", "арктангенс", "fn"),
      k("\\sqrt[n]{\\square}", "\\sqrt[#?]{#0}", "n зэргийн язгуур"), k("\\sqrt[3]{\\square}", "\\sqrt[3]{#0}", "куб язгуур"), k("e", "e", "e тоо"), k("n!", "!", "факториал"),
      k("<", "<", "бага", "op"), k(">", ">", "их", "op"), k("\\le", "\\le", "бага буюу тэнцүү", "op"), k("\\ge", "\\ge", "их буюу тэнцүү", "op"), k("^{\\circ}", "\\degree", "градус"), k("\\infty", "\\infty", "хязгааргүй"), k("C_{n}^{k}", "\\mathrm{C}_{#?}^{#?}", "хослол"),
      k("\\tfrac{d}{dx}", "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#0\\right)", "уламжлал", "fn"), k("\\textstyle\\int", "\\int #0\\,\\mathrm{d}x", "интеграл", "fn"), k("\\textstyle\\int_{a}^{b}", "\\int_{#?}^{#?} #0\\,\\mathrm{d}x", "тодорхой интеграл", "fn"),
      k("\\lim", "\\lim_{x\\to #?} #0", "хязгаар", "fn"), k("y=", "y=", "функц y тэнцүү"), k("x", "x", "x"), k("y", "y", "y"),
    ],
  },
  {
    id: "abc",
    label: "abc",
    keys: [
      ..."abcdkmn".split("").map((c) => k(c, c, c)),
      ..."pqrstuv".split("").map((c) => k(c, c, c)),
      k("w", "w", "w"), k("x", "x", "x"), k("y", "y", "y"), k("z", "z", "z"), t("(", "(", "нээх хаалт"), t(")", ")", "хаах хаалт"), k("=", "=", "тэнцүү", "op"),
      k("+", "+", "нэмэх", "op"), k("-", "-", "хасах", "op"), k("\\times", "\\times", "үржих", "op"), k("\\div", "\\div", "хуваах", "op"), k("x^{n}", "#@^{#?}", "зэрэг"), k(",", ",", "таслал"), k(";", ";", "систем: тэгшитгэл тусгаарлах"),
    ],
  },
];

const KEY_BASE =
  "flex min-h-12 min-w-0 select-none items-center justify-center rounded-xl border text-[17px] text-ink transition-colors duration-[var(--dur-micro)] [touch-action:manipulation] active:scale-[0.97] sm:min-h-[52px]";

/** Дарж байх хугацаанд давтагдах товч (⌫, ←, →) */
function RepeatButton({ onAct, aria, children }: { onAct: () => void; aria: string; children: ReactNode }) {
  const timer = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(timer.current.t);
    clearInterval(timer.current.i);
  };
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={aria}
      title={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        onAct();
        stop();
        timer.current.t = setTimeout(() => {
          timer.current.i = setInterval(onAct, 70);
        }, 420);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(e) => {
        if (e.detail === 0) onAct(); // гарнаас (Enter/Space)
      }}
      className={cn(KEY_BASE, "h-11 w-12 border-transparent text-ink-dim hover:bg-ink/5 hover:text-ink sm:h-11")}
    >
      {children}
    </button>
  );
}

export function MathKeyboard({
  target,
  onSubmit,
  submitLabel = "Бодох",
  submitDisabled,
  className,
}: {
  target: { current: MathInputHandle | null };
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  className?: string;
}) {
  const [page, setPage] = useState(0);
  const press = (key: KeyDef) => {
    const h = target.current;
    if (!h) return;
    if (key.cmd) h.command(key.cmd);
    else if (key.typed) h.typed(key.typed);
    else if (key.insert) h.insert(key.insert);
  };
  const keys = KEY_PAGES[page].keys;
  return (
    <div className={cn("space-y-2", className)} role="group" aria-label="Математик гар">
      <div className="flex items-center gap-1">
        <div role="tablist" aria-label="Гарын хуудас" className="flex min-w-0 flex-1 gap-1">
          {KEY_PAGES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === page}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setPage(i)}
              className={cn(
                "min-h-11 min-w-0 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors duration-[var(--dur-micro)] sm:flex-none sm:px-4",
                i === page ? "bg-brand-bright text-on-brand" : "text-ink-dim hover:bg-ink/5 hover:text-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <RepeatButton aria="Курсорыг зүүн тийш" onAct={() => target.current?.command("moveToPreviousChar")}>
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </RepeatButton>
        <RepeatButton aria="Курсорыг баруун тийш" onAct={() => target.current?.command("moveToNextChar")}>
          <ArrowRight className="h-5 w-5" aria-hidden />
        </RepeatButton>
        <RepeatButton aria="Арилгах" onAct={() => target.current?.command("deleteBackward")}>
          <Delete className="h-5 w-5" aria-hidden />
        </RepeatButton>
      </div>
      <div role="tabpanel" className="grid grid-cols-7 gap-1.5">
        {keys.map((key, i) => (
          <button
            key={`${page}-${i}`}
            type="button"
            aria-label={key.aria}
            title={key.aria}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => press(key)}
            className={cn(
              KEY_BASE,
              key.tone === "op"
                ? "border-line bg-brand-tint/60 hover:bg-brand-tint"
                : key.tone === "fn"
                  ? "border-line bg-bg text-[15px] hover:bg-ink/5"
                  : /^\d$|^\.$/.test(String(key.label))
                    ? "border-line bg-surface text-lg font-medium hover:bg-ink/5"
                    : "border-line bg-bg hover:bg-ink/5",
            )}
          >
            {typeof key.label === "string" ? <MathText>{`$${key.label}$`}</MathText> : key.label}
          </button>
        ))}
      </div>
      {onSubmit && (
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onSubmit}
          disabled={submitDisabled}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-bright text-base font-semibold text-on-brand transition-opacity duration-[var(--dur-micro)] hover:opacity-95 disabled:opacity-50"
        >
          <Play className="h-4 w-4" aria-hidden />
          {submitLabel}
        </button>
      )}
    </div>
  );
}
