"use client";

import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ClipboardEvent, type KeyboardEvent, type ReactNode, type Ref,
} from "react";
import { ArrowRight, Check, ChevronDown, Delete, Info } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import {
  allows, displayTex, fromText, hintFor, isSymbolic, keyFromKeyboard, press, tokensOf, valueOf,
  type GeoKey, type GeoKind, type GeoOpts, type Tokens,
} from "./geoInput";

/* ============================================================================
 * Дүрс, биетийн хэмжээг бичих талбар + ГЕОМЕТРИЙН ГАР (гулсуургүй).
 *
 *   <GeoKeypadProvider>
 *     <GeoField label={…} name="a тал" value={a} onChange={…} min={0.1} max={100} />
 *   </GeoKeypadProvider>
 *
 * - Талбар нь <input> биш (role="textbox") — утсан дээр системийн гар ГАРАХГҮЙ,
 *   оронд нь доороос геометрийн гар (цифр, цэг, язгуур, бутархай, квадрат, π,
 *   градус, арилгах, цэвэрлэх, «Дараах»). Компьютерт физик гараар шууд бичнэ:
 *   «/» бутархай, «r» язгуур, «p» π, «^» квадрат, «d» градус.
 * - Утга LaTeX-ээр (2\sqrt{3}, \frac{3}{4}) харагдана, ойролцоо утга хажууд.
 * - Бичиж дуусаагүй/хязгаараас гарсан үед зураг сүүлийн зөв утгаараа үлдэж,
 *   доор нь тайван зөвлөмж гарна. Талбараас гарахад зөв утга руу буцна.
 * - Гаднаас утга өөрчлөгдвөл (зураг дээр чирэх, «Анхны хэмжээ») шинэчлэгдэнэ.
 * ========================================================================== */

interface FieldEntry {
  name: string;
  opts: GeoOpts;
  press: (k: GeoKey) => void;
  /** Талбараас гарах үед: дуусаагүй бичвэрийг зөв утга руу буцаана */
  leave: () => void;
}

interface Ctx {
  active: string | null;
  open: boolean;
  activate: (id: string, open?: boolean) => void;
  close: () => void;
  next: () => void;
  register: (id: string, e: FieldEntry) => () => void;
}

const GeoCtx = createContext<Ctx | null>(null);

const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
};

export function GeoKeypadProvider({ children, className = "contents" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const reg = useRef(new Map<string, FieldEntry>());
  const [state, setState] = useState<{ active: string | null; open: boolean }>({ active: null, open: false });
  const [padH, setPadH] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const cur = useRef(state);
  useEffect(() => {
    cur.current = state;
  });

  const fieldEls = () => [...(root.current?.querySelectorAll<HTMLElement>("[data-geo-field]") ?? [])];
  const elOf = (id: string | null) => fieldEls().find((e) => e.dataset.geoField === id) ?? null;

  const activate = useCallback((id: string, open?: boolean) => {
    const prev = cur.current;
    if (prev.active && prev.active !== id) reg.current.get(prev.active)?.leave();
    setState({ active: id, open: open ?? prev.open });
  }, []);

  const close = useCallback(() => {
    const prev = cur.current;
    if (prev.active) reg.current.get(prev.active)?.leave();
    setState({ active: null, open: false });
  }, []);

  const next = useCallback(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>("[data-geo-field]") ?? [])];
    const i = els.findIndex((e) => e.dataset.geoField === cur.current.active);
    const n = i >= 0 ? els[i + 1] : undefined;
    if (n) {
      n.focus({ preventScroll: true });
      activate(n.dataset.geoField!, true);
    } else {
      els[i]?.blur();
      close();
    }
  }, [activate, close]);

  const register = useCallback((id: string, e: FieldEntry) => {
    reg.current.set(id, e);
    return () => {
      reg.current.delete(id);
    };
  }, []);

  // Гадна дарах эсвэл фокус өөр газар шилжихэд хаана
  useEffect(() => {
    if (!state.active) return;
    const inside = (t: EventTarget | null) => t instanceof Element && !!t.closest("[data-geo-field],[data-geo-keypad]");
    const onDown = (e: PointerEvent) => !inside(e.target) && close();
    const onFocus = (e: FocusEvent) => !inside(e.target) && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("focusin", onFocus);
    };
  }, [state.active, close]);

  // Гар нээгдэхэд идэвхтэй талбарыг гарын дээр харагдуулна. Эхний frame-д гарын
  // өндрийг хэмжиж доор нь ижил өндөртэй зай нэмнэ, дараагийнх нь гүйлгэнэ.
  useEffect(() => {
    if (!state.open || !state.active) return;
    let id = requestAnimationFrame(() => {
      const els = fieldEls();
      const i = els.findIndex((e) => e.dataset.geoField === state.active);
      setIsLast(i === els.length - 1);
      const pr = pad.current?.getBoundingClientRect();
      const h = pr?.height ?? 0;
      setPadH(h);
      id = requestAnimationFrame(() => {
        id = requestAnimationFrame(() => {
          const el = els[i];
          if (!el) return;
          const r = el.getBoundingClientRect();
          // 1024px+ дээр гар зургийн баруун доод буланд — талбарыг халхлахгүй бол гүйлгэхгүй
          if (pr && (pr.left >= r.right || pr.right <= r.left)) return;
          const limit = window.innerHeight - h - 16;
          const delta = r.bottom > limit ? r.bottom - limit : r.top < 64 ? r.top - 80 : 0;
          if (!delta) return;
          const sp = scrollParent(el);
          if (sp) sp.scrollBy({ top: delta, behavior: "smooth" });
          else window.scrollBy({ top: delta, behavior: "smooth" });
        });
      });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.active]);

  useEffect(() => {
    if (!state.active) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.active, close]);

  const entry = state.active ? reg.current.get(state.active) : undefined;

  return (
    <GeoCtx.Provider value={{ active: state.active, open: state.open, activate, close, next, register }}>
      <div ref={root} className={className}>
        {children}
        {state.open && entry && (
          <>
            <div aria-hidden className="lg:hidden" style={{ height: padH }} />
            <GeoKeypad
              ref={pad}
              name={entry.name}
              opts={entry.opts}
              last={isLast}
              onKey={(k) => reg.current.get(state.active!)?.press(k)}
              onNext={next}
              onClose={() => {
                elOf(state.active)?.blur();
                close();
              }}
            />
          </>
        )}
      </div>
    </GeoCtx.Provider>
  );
}

/* ---------------------------------------------------------------- гар -- */

const KEY = "flex h-[52px] min-w-0 select-none items-center justify-center rounded-xl border text-[20px] transition-colors duration-[var(--dur-micro)] [touch-action:manipulation] disabled:opacity-35";

function GeoKeypad({
  ref,
  name,
  opts,
  last,
  onKey,
  onNext,
  onClose,
}: {
  ref: Ref<HTMLDivElement>;
  name: string;
  opts: GeoOpts;
  last: boolean;
  onKey: (k: GeoKey) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const btn = (k: GeoKey, label: ReactNode, aria: string, extra?: string) => (
    <button
      key={k}
      type="button"
      aria-label={aria}
      title={aria}
      disabled={!allows(k, opts)}
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => {
        onKey(k);
        try {
          navigator.vibrate?.(6);
        } catch {
          /* чичиргээгүй төхөөрөмж */
        }
      }}
      className={cn(KEY, "border-line bg-surface text-ink hover:bg-ink/[0.04] active:bg-brand-tint", extra)}
    >
      {label}
    </button>
  );
  const d = (n: string) => btn(n as GeoKey, <span className="font-medium tabular-nums">{n}</span>, n, "bg-bg text-[22px]");
  const m = (tex: string) => <MathText>{`$${tex}$`}</MathText>;
  const third = opts.kind === "angle" ? btn("deg", m("\\square^{\\circ}"), "Градус") : opts.signed ? btn("neg", m("\\pm"), "Хасах тэмдэг") : btn("deg", m("\\square^{\\circ}"), "Градус");

  return (
    <div
      ref={ref}
      data-geo-keypad
      role="group"
      aria-label={`Геометрийн гар — ${name}`}
      className="elev-3 fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-panel px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:w-[360px] lg:rounded-2xl lg:border"
    >
      <div className="mx-auto max-w-md">
        <div className="flex min-h-10 items-center justify-between gap-2 pl-1">
          <span className="cyrillic-tight min-w-0 truncate text-sm font-semibold text-ink">{name}</span>
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onClose}
            aria-label="Гарыг хаах"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink"
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {d("7")}
          {d("8")}
          {d("9")}
          {btn("sqrt", m("\\sqrt{\\square}"), "Квадрат язгуур")}
          {btn("back", <Delete className="h-5 w-5" aria-hidden />, "Арилгах")}
          {d("4")}
          {d("5")}
          {d("6")}
          {btn("frac", m("\\frac{\\square}{\\square}"), "Бутархай", "text-[22px]")}
          {btn("clear", <span className="cyrillic-tight text-[13px] font-semibold">Цэвэрлэх</span>, "Цэвэрлэх")}
          {d("1")}
          {d("2")}
          {d("3")}
          {btn("sq", m("\\square^{2}"), "Квадрат")}
          {btn("pi", m("\\pi"), "Пи")}
          {d("0")}
          {btn(".", <span className="text-[26px] leading-none">.</span>, "Аравтын цэг", "bg-bg")}
          {third}
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onNext}
            className={cn(KEY, "col-span-2 gap-1.5 border-brand-bright bg-brand-bright text-[16px] font-semibold text-on-brand")}
          >
            {last ? "Болсон" : "Дараах"}
            {last ? <Check className="h-5 w-5" aria-hidden /> : <ArrowRight className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- талбар -- */

const r4 = (v: number) => Number(v.toFixed(4));
const tolOf = (v: number) => 1e-3 * Math.max(1, Math.abs(v));

export interface GeoFieldProps {
  label: ReactNode;
  /** Дэлгэц уншигч ба гарын гарчиг */
  name: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  kind?: GeoKind;
  suffix?: ReactNode;
  className?: string;
}

export default function GeoField({ label, name, value, onChange, min, max, kind = "length", suffix, className }: GeoFieldProps) {
  const ctx = useContext(GeoCtx);
  const id = useId();
  const opts: GeoOpts = { kind, signed: min < 0 };
  const [tokens, setTokens] = useState<Tokens>(() => tokensOf(r4(value)));
  const [emitted, setEmitted] = useState(value);
  const [seen, setSeen] = useState(value);
  // Гаднаас өөрчлөгдсөн утга (чирэх, анхны хэмжээ) — render үеийн тохируулга
  if (seen !== value) {
    setSeen(value);
    if (Math.abs(value - emitted) > tolOf(value)) {
      setEmitted(value);
      setTokens(tokensOf(r4(value)));
    }
  }

  const v = valueOf(tokens, opts);
  const hint = hintFor(tokens, v, min, max, opts);

  const apply = (next: Tokens) => {
    if (next === tokens) return;
    setTokens(next);
    const nv = valueOf(next, opts);
    if (nv !== null && !hintFor(next, nv, min, max, opts)) {
      setEmitted(nv);
      if (Math.abs(nv - value) > 1e-12) onChange(nv);
    }
  };
  const keyPress = (k: GeoKey) => apply(press(tokens, k, opts));
  const leave = () => {
    if (hint) setTokens(tokensOf(r4(emitted)));
  };

  const live = useRef({ keyPress, leave, name, opts });
  useEffect(() => {
    live.current = { keyPress, leave, name, opts };
  });
  const register = ctx?.register;
  useEffect(
    () =>
      register?.(id, {
        get name() {
          return live.current.name;
        },
        get opts() {
          return live.current.opts;
        },
        press: (k) => live.current.keyPress(k),
        leave: () => live.current.leave(),
      }),
    [register, id],
  );

  const active = ctx?.active === id;
  const [focused, setFocused] = useState(false);
  const editing = active || (!ctx && focused);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (ctx) ctx.next();
      else e.currentTarget.blur();
      return;
    }
    const k = keyFromKeyboard(e.key);
    if (!k) return;
    e.preventDefault();
    if (!active) ctx?.activate(id);
    keyPress(k);
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    apply(fromText(text, opts));
  };

  const tex = displayTex(tokens);
  const showSuffix = suffix && !tokens.includes("deg");

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-sm text-ink-dim" aria-hidden>
          {label}
        </span>
        <div
          data-geo-field={id}
          role="textbox"
          tabIndex={0}
          aria-label={name}
          aria-invalid={hint ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          inputMode="none"
          onFocus={() => {
            setFocused(true);
            ctx?.activate(id);
          }}
          onBlur={() => {
            setFocused(false);
            if (!ctx) leave();
          }}
          onClick={() => ctx?.activate(id, true)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(
            "flex h-12 min-w-[6.5rem] max-w-[60%] shrink-0 cursor-text items-center justify-end gap-1.5 overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl border bg-bg px-3 text-lg text-ink transition-colors duration-[var(--dur-micro)] [scrollbar-width:none] [touch-action:manipulation]",
            editing ? "border-brand-bright" : hint ? "border-ink-dim/60" : "border-line hover:border-ink-dim/50",
          )}
        >
          {tex ? <MathText>{`$${tokens.includes("/") ? "\\displaystyle " : ""}${tex}$`}</MathText> : null}
          {editing && <span aria-hidden className="geo-caret -ml-1 inline-block h-6 w-0.5 shrink-0 rounded-full bg-brand" />}
          {v !== null && isSymbolic(tokens) && !hint && (
            <MathText className="text-sm text-ink-dim">{`$\\approx ${Number(v.toFixed(2))}$`}</MathText>
          )}
          {showSuffix && <span className="text-base text-ink-dim">{suffix}</span>}
        </div>
      </div>
      {hint && (
        <p id={`${id}-hint`} role="status" className="mt-1 flex items-center justify-end gap-1 text-sm text-ink-dim">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          {hint}
        </p>
      )}
      <style>{`@keyframes geo-blink{0%,45%{opacity:1}55%,100%{opacity:0}}.geo-caret{animation:geo-blink 1.05s step-end infinite}@media (prefers-reduced-motion:reduce){.geo-caret{animation:none}}`}</style>
    </div>
  );
}
