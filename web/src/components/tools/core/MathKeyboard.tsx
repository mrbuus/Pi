"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CornerDownLeft, Delete, History } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import type { MathInputHandle } from "./MathInput";

/* ============================================================================
 * Хэрэглэгдэхүүний МАТЕМАТИК ГАР — Photomath-ын тооцоолуурын хэв маяг.
 * Бодогч ба График хоёул ашиглана.
 *
 *   <MathKeyboard field={inputRef} onEnter={…} onHistory={…} degrees onDegrees={…} />
 *
 * - Дээд мөр: abc, түүх, ←, →, ↵, ⌫ (⌫ ба сумыг дарж байхад давтана)
 * - 4 ангилал: «+ − × ÷», «f(x) e log ln», «sin cos tg ctg», «d/dx ∫» (lim ховор тул төгсгөлд)
 * - Цэгтэй товчийг УДААН дарвал (350мс) дээр нь нэмэлт сонголт гарна:
 *   хуруугаа гулсуулж сонгоно, эсвэл гараа өргөөд дарна.
 * - Товч бүр дарахад фокусыг математик талбараас авахгүй (pointerdown
 *   preventDefault) — утсан дээр системийн гар гарахгүй.
 * - Оруулах LaTeX нь solve/latex.ts-ийн ойлгодог хэлбэр л (дэмжихгүйг тавихгүй).
 * ========================================================================== */

export interface KeyDef {
  /** Товч дээрх LaTeX (MathText-ээр) */
  tex?: string;
  /** Энгийн бичвэр шошго (rad, abc г.м.) */
  text?: string;
  /** Дэлгэц уншигчид */
  aria: string;
  /** Оруулах LaTeX: #0 — сонголт/хоосон нүд, #? — хоосон нүд, #@ — өмнөх хэсэг */
  insert?: string;
  /** Гараар бичсэн мэт (хаалт хос болно) */
  typed?: string;
  /** Тоо (саарал дэвсгэр) */
  num?: boolean;
  /** Удаан дарахад гарах сонголтууд (эхнийх нь товч өөрөө) */
  alts?: KeyDef[];
  /** Тусгай үйлдэл (градус/радиан сэлгэгч) */
  special?: "angle";
  /** Урт шошго — жижиг үсгээр */
  small?: boolean;
}

const k = (tex: string, insert: string, aria: string, extra: Partial<KeyDef> = {}): KeyDef => ({ tex, insert, aria, ...extra });
const n = (d: string): KeyDef => ({ tex: d, insert: d, aria: d, num: true });

/* ---------- Үндсэн хуудас (+ − × ÷) ---------- */
const PAREN = k("(\\square)", "\\left(#0\\right)", "хаалт", {
  alts: [
    k("(\\square)", "\\left(#0\\right)", "хаалт"),
    { tex: "(", typed: "(", aria: "нээх хаалт" },
    { tex: ")", typed: ")", aria: "хаах хаалт" },
    k("[\\square]", "\\left[#0\\right]", "дөрвөлжин хаалт"),
    k("|\\square|", "\\left|#0\\right|", "модуль"),
  ],
});
const GT = k(">", ">", "их", {
  alts: [k(">", ">", "их"), k("\\ge", "\\ge", "их буюу тэнцүү"), k("<", "<", "бага"), k("\\le", "\\le", "бага буюу тэнцүү")],
});
const FRAC = k("\\frac{\\square}{\\square}", "\\frac{#@}{#?}", "бутархай", {
  alts: [k("\\frac{\\square}{\\square}", "\\frac{#@}{#?}", "бутархай"), k("\\square\\tfrac{\\square}{\\square}", "#?\\frac{#?}{#?}", "холимог бутархай")],
});
const SQRT = k("\\sqrt{\\square}", "\\sqrt{#0}", "квадрат язгуур", {
  alts: [k("\\sqrt{\\square}", "\\sqrt{#0}", "квадрат язгуур"), k("\\sqrt[3]{\\square}", "\\sqrt[3]{#0}", "куб язгуур"), k("\\sqrt[n]{\\square}", "\\sqrt[#?]{#0}", "n зэргийн язгуур")],
});
const SQUARE = k("\\square^{2}", "#@^{2}", "квадрат", {
  alts: [k("\\square^{2}", "#@^{2}", "квадрат"), k("\\square^{3}", "#@^{3}", "куб"), k("\\square^{n}", "#@^{#?}", "зэрэг")],
});
const XVAR = k("x", "x", "x", {
  alts: ["x", "y", "z", "a", "b", "n"].map((c) => k(c, c, c)),
});
const PI = k("\\pi", "\\pi", "пи", {
  alts: [k("\\pi", "\\pi", "пи"), k("e", "e", "e тоо"), k("\\infty", "\\infty", "хязгааргүй")],
});

const BASIC: KeyDef[] = [
  PAREN, GT, n("7"), n("8"), n("9"), k("\\div", "\\div", "хуваах"),
  FRAC, SQRT, n("4"), n("5"), n("6"), k("\\times", "\\times", "үржих"),
  SQUARE, XVAR, n("1"), n("2"), n("3"), k("-", "-", "хасах"),
  PI, k("\\%", "\\%", "хувь"), n("0"), k(",", ",", "аравтын таслал", { num: true }), k("=", "=", "тэнцүү"), k("+", "+", "нэмэх"),
];

/* ---------- f(x) e log ln ---------- */
const FX: KeyDef[] = [
  k("|\\square|", "\\left|#0\\right|", "модуль"), k("y=", "y=", "функц y тэнцүү"), k("\\log_{10}", "\\log_{10}\\left(#0\\right)", "аравтын логарифм"),
  k("\\log_{2}", "\\log_{2}\\left(#0\\right)", "хоёрын суурьтай логарифм"), k("\\log_{\\square}", "\\log_{#?}\\left(#0\\right)", "логарифм"), k("\\square!", "#@!", "факториал"),
  k("f(x)=", "f\\left(x\\right)=", "функц f(x) тэнцүү", { small: true }), k("e", "e", "e тоо"), k("\\ln", "\\ln\\left(#0\\right)", "натурал логарифм"),
  k("\\lg", "\\lg\\left(#0\\right)", "lg логарифм"), k("\\exp", "\\exp\\left(#0\\right)", "экспонент"), k("C_{n}^{k}", "\\mathrm{C}_{#?}^{#?}", "хэсэглэл"),
  k("e^{\\square}", "e^{#?}", "e-ийн зэрэг"), k("\\lfloor\\square\\rfloor", "\\lfloor #0\\rfloor", "бүхэл хэсэг"), k(";", ";", "систем: тэгшитгэл тусгаарлах"),
  k("\\operatorname{sign}", "\\operatorname{sign}\\left(#0\\right)", "тэмдэг функц"), k("\\infty", "\\infty", "хязгааргүй"), k("A_{n}^{k}", "\\mathrm{A}_{#?}^{#?}", "байрлал"),
  k("x", "x", "x"), k("y", "y", "y"), k("<", "<", "бага"), k(">", ">", "их"), k("\\le", "\\le", "бага буюу тэнцүү"), k("\\ge", "\\ge", "их буюу тэнцүү"),
];

/* ---------- sin cos tg ctg ---------- */
const fn = (name: string, aria: string) => k(name, `${name}\\left(#0\\right)`, aria);
const TRIG: KeyDef[] = [
  { aria: "Өнцгийн нэгж", special: "angle" }, fn("\\sin", "синус"), fn("\\cos", "косинус"), fn("\\operatorname{tg}", "тангенс"), fn("\\operatorname{ctg}", "котангенс"),
  k("\\square^{\\circ}", "#@\\degree", "градус"), fn("\\arcsin", "арксинус"), fn("\\arccos", "арккосинус"), fn("\\operatorname{arctg}", "арктангенс"), fn("\\operatorname{arcctg}", "арккотангенс"),
  k("\\pi", "\\pi", "пи"), k("\\frac{\\pi}{\\square}", "\\frac{\\pi}{#?}", "пи хуваах"), k("\\sin^{2}", "\\sin^{2}\\left(#0\\right)", "синусын квадрат"), k("\\cos^{2}", "\\cos^{2}\\left(#0\\right)", "косинусын квадрат"), XVAR,
  PAREN, SQRT, FRAC, SQUARE, k("=", "=", "тэнцүү"),
];

/* ---------- d/dx ∫ (хязгаар ховор хэрэглэгддэг тул төгсгөлд — эзэн 2026-10-27) ---------- */
const CALC: KeyDef[] = [
  k("\\tfrac{d}{dx}\\square", "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#0\\right)", "уламжлал"), k("(\\square)'", "\\left(#0\\right)^{\\prime}", "уламжлал зураасаар"),
  k("\\textstyle\\int\\square\\,dx", "\\int #0\\,\\mathrm{d}x", "интеграл"), k("\\textstyle\\int_{a}^{b}\\square\\,dx", "\\int_{#?}^{#?}#0\\,\\mathrm{d}x", "тодорхой интеграл"), k("\\tfrac{d^{2}}{dx^{2}}\\square", "\\frac{\\mathrm{d}^2}{\\mathrm{d}x^2}\\left(#0\\right)", "хоёрдугаар уламжлал"),
  XVAR, SQUARE, SQRT, FRAC, k("e", "e", "e тоо"),
  k("\\pi", "\\pi", "пи"), k("\\infty", "\\infty", "хязгааргүй"), k("\\lim\\limits_{x\\to\\square}", "\\lim_{x\\to#?}#0", "хязгаар"), PAREN, k("=", "=", "тэнцүү"),
];

/* ---------- abc ---------- */
const ABC: KeyDef[] = [..."abcdefghijklmnopqrstuvwxyz".split("").map((c) => k(c, c, c)), { tex: "(", typed: "(", aria: "нээх хаалт" }, { tex: ")", typed: ")", aria: "хаах хаалт" }];

interface Page {
  id: string;
  /** Хоёр мөр шошго (LaTeX) */
  top: string;
  bottom: string;
  aria: string;
  cols: number;
  keys: KeyDef[];
}

export const KEYBOARD_PAGES: Page[] = [
  { id: "basic", top: "+\\ \\ -", bottom: "\\times\\ \\ \\div", aria: "Үндсэн", cols: 6, keys: BASIC },
  { id: "fx", top: "f(x)\\ \\ e", bottom: "\\log\\ \\ \\ln", aria: "Функц, логарифм", cols: 6, keys: FX },
  { id: "trig", top: "\\sin\\ \\cos", bottom: "\\operatorname{tg}\\ \\operatorname{ctg}", aria: "Тригонометр", cols: 5, keys: TRIG },
  { id: "calc", top: "\\tfrac{d}{dx}", bottom: "\\textstyle\\int\\,dx", aria: "Уламжлал, интеграл", cols: 5, keys: CALC },
];
const ABC_PAGE: Page = { id: "abc", top: "", bottom: "", aria: "Үсэг", cols: 7, keys: ABC };

const KEY_H = "h-[52px] sm:h-14";

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
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.detail === 0) onAct(); // гарнаас (Enter/Space)
      }}
      className="flex h-11 min-w-11 flex-1 select-none items-center justify-center rounded-xl text-ink transition-colors duration-[var(--dur-micro)] [touch-action:manipulation] hover:bg-ink/5 active:bg-ink/10"
    >
      {children}
    </button>
  );
}

function TopButton({ onClick, aria, children, pressed }: { onClick: () => void; aria: string; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={aria}
      title={aria}
      aria-pressed={pressed}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-11 min-w-11 flex-1 select-none items-center justify-center rounded-xl text-ink transition-colors duration-[var(--dur-micro)] [touch-action:manipulation] hover:bg-ink/5 active:bg-ink/10",
        pressed && "text-brand",
      )}
    >
      {children}
    </button>
  );
}

const keyLabel = (key: KeyDef, cls?: string) =>
  key.text ? <span className={cn("text-base font-medium", cls)}>{key.text}</span> : key.tex ? <MathText className={cls}>{`$${key.tex}$`}</MathText> : null;

interface Pop {
  key: KeyDef;
  left: number;
  top: number;
  active: number;
  /** Хуруу өргөсөн — дарж сонгох горим */
  tap: boolean;
}

export interface MathKeyboardProps {
  field: { current: MathInputHandle | null };
  /** ↵ товч */
  onEnter?: () => void;
  /** Түүхийн товч (байхгүй бол харуулахгүй) */
  onHistory?: () => void;
  historyActive?: boolean;
  /** Градус горим (sin cos хуудсанд сэлгэгч) */
  degrees?: boolean;
  onDegrees?: (v: boolean) => void;
  className?: string;
}

export default function MathKeyboard({ field, onEnter, onHistory, historyActive, degrees = false, onDegrees, className }: MathKeyboardProps) {
  const [page, setPage] = useState(0);
  const [abc, setAbc] = useState(false);
  const [pop, setPop] = useState<Pop | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const hold = useRef<{ t?: ReturnType<typeof setTimeout>; fired: boolean }>({ fired: false });

  useEffect(() => () => clearTimeout(hold.current.t), []);

  const press = (key: KeyDef) => {
    const h = field.current;
    if (!h) return;
    if (key.typed) h.typed(key.typed);
    else if (key.insert) h.insert(key.insert);
    try {
      navigator.vibrate?.(6);
    } catch {
      /* чичиргээгүй төхөөрөмж */
    }
  };

  const openPop = (key: KeyDef, el: HTMLElement, tap: boolean) => {
    const r = root.current?.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!r || !key.alts) return;
    const w = key.alts.length * 56 + 8;
    const left = Math.min(Math.max(4, b.left - r.left + b.width / 2 - w / 2), r.width - w - 4);
    setPop({ key, left, top: b.top - r.top - 60, active: tap ? -1 : 0, tap });
  };

  const choose = (alt: KeyDef) => {
    setPop(null);
    press(alt);
  };

  const altAt = (x: number, y: number): number => {
    const el = document.elementFromPoint(x, y)?.closest("[data-alt]");
    return el ? Number(el.getAttribute("data-alt")) : -1;
  };

  const onKeyDown = (key: KeyDef) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!key.alts) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* хуучин хөтөч */
    }
    hold.current.fired = false;
    clearTimeout(hold.current.t);
    hold.current.t = setTimeout(() => {
      hold.current.fired = true;
      openPop(key, el, false);
    }, 350);
  };

  const onKeyMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!pop || pop.tap) return;
    const i = altAt(e.clientX, e.clientY);
    if (i >= 0 && i !== pop.active) setPop({ ...pop, active: i });
  };

  const onKeyUp = (e: PointerEvent<HTMLButtonElement>) => {
    clearTimeout(hold.current.t);
    if (!pop || pop.tap) return;
    const i = altAt(e.clientX, e.clientY);
    if (i >= 0 && pop.key.alts?.[i]) choose(pop.key.alts[i]);
    else setPop({ ...pop, tap: true, active: -1 }); // гараа өргөсөн — дарж сонгоно
  };

  const onKeyClick = (key: KeyDef) => () => {
    if (hold.current.fired) {
      hold.current.fired = false;
      return;
    }
    if (key.special === "angle") return onDegrees?.(!degrees);
    press(key);
  };

  const onKeyKeys = (key: KeyDef) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (key.alts && (e.key === "ArrowUp" || e.key === "ContextMenu")) {
      e.preventDefault();
      openPop(key, e.currentTarget, true);
    }
  };

  const cur = abc ? ABC_PAGE : KEYBOARD_PAGES[page];

  return (
    <div ref={root} className={cn("relative select-none", className)} role="group" aria-label="Математик гар">
      {/* ---------- дээд мөр ---------- */}
      <div className="flex items-center gap-0.5 px-1 pb-1">
        <TopButton onClick={() => { setAbc((v) => !v); setPop(null); }} aria={abc ? "Тоон гар" : "Латин үсэг"} pressed={abc}>
          <span className="text-[15px] font-semibold">{abc ? "123" : "abc"}</span>
        </TopButton>
        {onHistory && (
          <TopButton onClick={onHistory} aria="Түүх" pressed={historyActive}>
            <History className="h-5 w-5" aria-hidden />
          </TopButton>
        )}
        <RepeatButton aria="Курсорыг зүүн тийш" onAct={() => field.current?.command("moveToPreviousChar")}>
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </RepeatButton>
        <RepeatButton aria="Курсорыг баруун тийш" onAct={() => field.current?.command("moveToNextChar")}>
          <ArrowRight className="h-5 w-5" aria-hidden />
        </RepeatButton>
        {onEnter && (
          <TopButton onClick={onEnter} aria="Бодолтыг харах">
            <CornerDownLeft className="h-5 w-5" aria-hidden />
          </TopButton>
        )}
        <RepeatButton aria="Арилгах" onAct={() => field.current?.command("deleteBackward")}>
          <Delete className="h-5 w-5" aria-hidden />
        </RepeatButton>
      </div>

      {/* ---------- ангилал ---------- */}
      {!abc && (
        <div role="tablist" aria-label="Гарын хуудас" className="flex gap-1.5 px-1.5 pb-2">
          {KEYBOARD_PAGES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={p.aria}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => { setPage(i); setPop(null); }}
              className={cn(
                "flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-full border text-[12.5px] leading-[1.15] transition-colors duration-[var(--dur-micro)] [touch-action:manipulation]",
                i === page ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink hover:bg-ink/5",
              )}
            >
              <MathText className="whitespace-nowrap">{`$${p.top}$`}</MathText>
              <MathText className="whitespace-nowrap">{`$${p.bottom}$`}</MathText>
            </button>
          ))}
        </div>
      )}

      {/* ---------- товчнууд ---------- */}
      <div
        role="tabpanel"
        aria-label={cur.aria}
        className="grid gap-px overflow-hidden border-y border-line bg-line sm:rounded-xl sm:border"
        style={{ gridTemplateColumns: `repeat(${cur.cols}, minmax(0, 1fr))` } as CSSProperties}
      >
        {cur.keys.map((key, i) =>
          key.special === "angle" ? (
            <button
              key={`${cur.id}-${i}`}
              type="button"
              aria-label={degrees ? "Өнцгийн нэгж: градус. Радиан болгох" : "Өнцгийн нэгж: радиан. Градус болгох"}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onDegrees?.(!degrees)}
              className={cn(KEY_H, "flex min-w-0 flex-col items-center justify-center gap-0.5 bg-surface text-xs font-semibold text-ink [touch-action:manipulation] active:bg-brand-tint")}
            >
              <span className={cn("rounded px-1.5", !degrees ? "bg-brand-bright text-on-brand" : "text-ink-dim")}>rad</span>
              <span className={cn("rounded px-1.5", degrees ? "bg-brand-bright text-on-brand" : "text-ink-dim")}>deg</span>
            </button>
          ) : (
            <button
              key={`${cur.id}-${i}`}
              type="button"
              aria-label={key.alts ? `${key.aria} (удаан дарвал сонголт)` : key.aria}
              title={key.aria}
              onPointerDown={onKeyDown(key)}
              onPointerMove={key.alts ? onKeyMove : undefined}
              onPointerUp={key.alts ? onKeyUp : undefined}
              onPointerCancel={() => clearTimeout(hold.current.t)}
              onContextMenu={(e) => e.preventDefault()}
              onClick={onKeyClick(key)}
              onKeyDown={onKeyKeys(key)}
              className={cn(
                KEY_H,
                "relative flex min-w-0 items-center justify-center overflow-hidden text-[19px] text-ink transition-colors duration-[var(--dur-micro)] [-webkit-touch-callout:none] active:bg-brand-tint",
                key.alts ? "[touch-action:none]" : "[touch-action:manipulation]",
                key.num ? "bg-ink/[0.05] text-[22px] hover:bg-ink/[0.09]" : "bg-surface hover:bg-ink/[0.04]",
                cur.id === "trig" || cur.id === "calc" || cur.id === "fx" ? "text-[16px]" : "",
                key.small && "text-[13.5px]",
              )}
            >
              {keyLabel(key)}
              {key.alts && <span aria-hidden className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-brand" />}
            </button>
          ),
        )}
      </div>

      {/* ---------- удаан дарсан үеийн сонголт ---------- */}
      {pop?.key.alts && (
        <>
          {pop.tap && <div className="fixed inset-0 z-40" onPointerDown={(e) => { e.preventDefault(); setPop(null); }} aria-hidden />}
          <div
            role="menu"
            aria-label={pop.key.aria}
            className="elev-3 enter-pop absolute z-50 flex gap-1 rounded-2xl border border-line bg-surface p-1"
            style={{ left: pop.left, top: pop.top }}
            onKeyDown={(e) => e.key === "Escape" && setPop(null)}
          >
            {pop.key.alts.map((alt, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                data-alt={i}
                aria-label={alt.aria}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(alt)}
                className={cn(
                  "flex h-[52px] w-14 items-center justify-center rounded-xl text-[18px] text-ink [touch-action:manipulation]",
                  i === pop.active ? "bg-brand-tint" : "hover:bg-ink/5",
                )}
              >
                {keyLabel(alt)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
