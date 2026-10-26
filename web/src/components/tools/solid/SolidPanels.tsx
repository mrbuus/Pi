"use client";

import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ChevronDown, Play, RotateCcw } from "lucide-react";
import MathText from "@/components/MathText";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { NumberField, Panel, Segmented, Toggle } from "../core/ToolFrame";
import { MEASURE_GROUPS, MEASURE_KINDS, type MeasureKind, type MeasureResult } from "./angles.ts";
import { answerParts, decTex, exactTex, keyMeasures, measureSteps, type AnswerParts, type Measure } from "./measure.ts";
import { PRESETS, type Proj, type View } from "./project.ts";
import type { PointRef, SectionInfo } from "./section.ts";
import { SOLIDS, buildSolid, defaultParams, sanitizeParams, solidInfo, type AnnoGroup, type Params, type SolidKind, type SolidModel } from "./solids.ts";
import { measureOptions, paramsOf, pointOptions, refKey, type HiddenMode, type Mode, type PointOption, type SolidState } from "./state.ts";

/* ============================================================================
 * Биетийн удирдлага ба үр дүн — KaTeX (MathText)-тэй бүх хэсэг энд.
 * SolidTool (зураг) эхэлж ачаалагдаж зураг шууд гарна, энэ файл тусдаа
 * chunk-аар зэрэгцэн ачаалагдана (KaTeX ~76KB gzip зургийг саатуулахгүй).
 * ========================================================================== */

export interface PanelCtx {
  st: SolidState;
  setSt: Dispatch<SetStateAction<SolidState>>;
  model: SolidModel;
  params: Params;
  ms: Measure[];
  /** Үзүүлж буй горим (бөмбөрцөгт «Өнцөг, зай» байхгүй) */
  mode: Mode;
  secInfo: SectionInfo | null;
  planeError: string | null;
  how: "tilt" | "points";
  secRefs: PointRef[];
  netOk: boolean;
  measureRes: MeasureResult | null;
  measureRefs: PointRef[];
  reduced: boolean;
}

const tex = (s: string) => `$${s}$`;
const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const GROUP_NAME: Record<AnnoGroup, string> = {
  height: "Өндөр",
  apothem: "Апофем",
  diag: "Диагональ",
  radius: "Радиус",
};

const PROJS: { value: Proj; label: string }[] = [
  { value: "persp", label: "Перспектив" },
  { value: "ortho", label: "Параллель" },
  { value: "oblique", label: "Ташуу" },
];

const HIDDEN: { value: HiddenMode; label: string }[] = [
  { value: "dash", label: "Тасархай" },
  { value: "hide", label: "Нуух" },
  { value: "show", label: "Бүтэн" },
];

const VIEW_BUTTONS: { key: keyof typeof PRESETS; label: string }[] = [
  { key: "front", label: "Урд" },
  { key: "top", label: "Дээрээс" },
  { key: "side", label: "Хажуугаас" },
  { key: "iso", label: "Изометр" },
  { key: "default", label: "Анхны" },
];

/* ================================================== үр дүн (зургийн доор) == */

interface CardData {
  key: string;
  label: string;
  sym: string;
  parts: AnswerParts;
}

function ResultCard({ label, sym, parts }: Omit<CardData, "key">) {
  // Урт тэмдэг (S_{\text{бүтэн}})-ийг картад давтахгүй — нэр нь дээр бичигдсэн, утга нь богино үлдэнэ
  const lhs = /\\text|\\times/.test(sym) ? "" : sym;
  const main = parts.exact ? (lhs ? `${lhs}=${parts.exact}` : parts.exact) : `${lhs}\\approx ${parts.approx ?? ""}`;
  return (
    <div className="h-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2">
      <div className="truncate text-xs text-ink-dim">{label}</div>
      <div className="overflow-x-auto whitespace-nowrap py-0.5 text-[1.05rem] text-ink [scrollbar-width:none]">
        <MathText>{tex(main)}</MathText>
      </div>
      {parts.exact && parts.approx && (
        <div className="text-xs text-ink-dim">
          <MathText>{tex(`\\approx ${parts.approx}`)}</MathText>
        </div>
      )}
    </div>
  );
}

const cardOf = (m: Measure, label = m.name): CardData => ({ key: m.sym, label, sym: m.sym, parts: answerParts(m.value, m.pi) });

/** Өнцгийн утга градусаар: 216^\circ, үгүй бол \approx 185.2^\circ */
function degParts(deg: number): AnswerParts {
  const e = exactTex(deg);
  if (e && !/\\sqrt/.test(e)) return { exact: `${e}^\\circ`, approx: /\\frac/.test(e) ? `${decTex(deg, 2)}^\\circ` : null };
  return { exact: null, approx: `${decTex(deg, 2)}^\\circ` };
}

function Steps({ m }: { m: Measure }) {
  const s = measureSteps(m);
  return (
    <li className="min-w-0">
      <div className="text-xs text-ink-dim">{m.name}</div>
      <div className="overflow-x-auto text-sm text-ink [scrollbar-width:thin]">
        <MathText>{tex(s.formula)}</MathText>
        {s.subst && (
          <div>
            <MathText>{tex(s.subst)}</MathText>
          </div>
        )}
      </div>
      {s.approx && (
        <div className="text-xs text-ink-dim">
          <MathText>{tex(s.approx)}</MathText>
        </div>
      )}
    </li>
  );
}

export function SolidResults({ ctx }: { ctx: PanelCtx }) {
  const { model, params, ms, mode, secInfo, planeError, measureRes } = ctx;
  const [open, setOpen] = useState(false);
  const kind = model.kind;
  const info = solidInfo(kind);
  const cards: CardData[] = [];
  let message: string | null = null;
  const details: ReactNode[] = [];

  if (mode === "section") {
    if (planeError) message = planeError;
    else if (!secInfo) message = "Хавтгай биетийг огтлохгүй байна";
    else {
      cards.push({ key: "sec", label: `Огтлол: ${secInfo.name.toLowerCase()}`, sym: "S_{\\text{огт}}", parts: secInfo.parts });
    }
    for (const m of keyMeasures(ms, cards.length ? 3 : 4)) cards.push(cardOf(m));
  } else if (mode === "net") {
    if (!ctx.netOk) message = "Бөмбөрцгийн гадаргууг хавтгайд дэлгэх боломжгүй";
    const S = ms.find((m) => m.sym.startsWith("S_{\\text{бүтэн") || m.sym === "S");
    if (S && ctx.netOk) cards.push({ ...cardOf(S, "Дэлгээсийн талбай"), sym: "S" });
    if (kind === "cone" && ctx.netOk) {
      const l = Math.hypot(params.r, params.h);
      cards.push({ key: "phi", label: "Секторын өнцөг", sym: "\\varphi", parts: degParts((params.r / l) * 360) });
      details.push(
        <li key="phi" className="text-sm text-ink">
          <MathText>{tex(`\\varphi=\\frac{r}{l}\\cdot 360^\\circ`)}</MathText>
        </li>,
      );
    }
    if (kind === "cylinder" && ctx.netOk) {
      const w = answerParts(2 * Math.PI * params.r, true).exact ?? decTex(2 * Math.PI * params.r);
      const hh = exactTex(params.h) ?? decTex(params.h);
      cards.push({ key: "rect", label: "Хажуугийн тэгш өнцөгт", sym: "2\\pi r\\times h", parts: { exact: `${w}\\times ${hh}`, approx: null } });
    }
    const L = ms.find((m) => m.sym === "S_{\\text{хажуу}}");
    if (L && ctx.netOk && cards.length < 3) cards.push(cardOf(L));
  } else if (mode === "measure" && measureRes) {
    if (measureRes.error) message = measureRes.error;
    else {
      const k = measureRes.kind;
      const angleLabel = "Өнцөг";
      if (measureRes.angle && k !== "dp") cards.push({ key: "ang", label: angleLabel, sym: "\\varphi", parts: { exact: measureRes.angle.exact, approx: measureRes.angle.approx?.replace(/^\\approx\s*/, "") ?? null } });
      if (measureRes.dist) {
        const dl = "Зай";
        cards.push({ key: "dist", label: dl, sym: "d", parts: { exact: measureRes.dist.exact, approx: measureRes.dist.approx?.replace(/^\\approx\s*/, "") ?? null } });
      }
      if (measureRes.note) message = measureRes.note;
      const a = measureRes.angle;
      if (a && k !== "dp") {
        const tr = (v: number) => exactTex(v) ?? `\\approx ${decTex(v, 3)}`;
        details.push(
          <li key="trig" className="space-y-1 text-sm text-ink">
            <div className="text-xs text-ink-dim">Тригонометр утга (сорилын хариутай тулгахад)</div>
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <MathText>{tex(`\\sin\\varphi=${tr(a.sin)}`)}</MathText>
            </div>
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <MathText>{tex(`\\cos\\varphi=${tr(a.cos)}`)}</MathText>
            </div>
            {a.cos > 1e-12 && (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <MathText>{tex(`\\operatorname{tg}\\varphi=${tr(a.sin / a.cos)}`)}</MathText>
              </div>
            )}
          </li>,
        );
      }
      const how =
        k === "lp"
          ? "Хавтгайгаас хол төгсгөлөөс перпендикуляр буулгаж, шулууныг хавтгайд проекцлоно. Өнцөг нь шулуун ба проекцийн хооронд"
          : k === "pp"
            ? "Огтлолцлын шулуунд хоёр хавтгай дотор перпендикуляр татна. Өнцөг нь тэдгээрийн хооронд"
            : k === "ll"
              ? "Огтлолцдоггүй бол нэг шулууныг нөгөөгийн цэгээр параллель зөөнө. Зай нь нийтлэг перпендикулярын урт"
              : "Цэгээс хавтгайд перпендикуляр буулгана. Зай нь перпендикулярын урт";
      details.push(
        <li key="how" className="text-sm text-ink-dim">
          {how}
        </li>,
      );
    }
    for (const m of keyMeasures(ms, Math.max(0, 4 - cards.length)).slice(0, 2)) cards.push(cardOf(m));
  } else {
    for (const m of keyMeasures(ms)) cards.push(cardOf(m));
  }

  return (
    <div className="space-y-2 px-3 py-3">
      {message && <p className="px-1 text-sm text-ink-dim">{message}</p>}
      {cards.length > 0 && (
        <div className={cn("grid gap-2", cards.length === 1 ? "grid-cols-1" : "grid-cols-2", cards.length === 3 && "lg:grid-cols-3", cards.length >= 4 && "lg:grid-cols-4")}>
          {cards.map((c, i) => (
            // сондгой тоотой бол эхний (гол) картыг бүтэн мөрөөр — өнчин карт үлдэхгүй
            <div key={c.key} className={cn("min-w-0", i === 0 && cards.length % 2 === 1 && cards.length > 1 && "col-span-2 lg:col-span-1")}>
              <ResultCard label={c.label} sym={c.sym} parts={c.parts} />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-brand-soft hover:bg-bg"
      >
        {open ? "Хураах" : "Дэлгэрэнгүй"}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-[var(--dur-base)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="space-y-3 px-1 pb-1">
          {details}
          {mode === "section" && secInfo && (
            <li className="text-sm text-ink">
              <span className="text-ink-dim">Огтлолын хэлбэр: </span>
              {secInfo.name}
            </li>
          )}
          {ms.map((m) => (
            <Steps key={m.sym} m={m} />
          ))}
          {info.curved && mode === "section" && secInfo?.curvedEdge && !secInfo.parts.exact && (
            <li className="text-xs text-ink-dim">Муруй огтлолын талбайг нарийн тороор ойролцоолсон</li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ================================================== удирдлага == */

/** Хураагддаг хэсэг (тохиргоо их тул) */
function Fold({ title, children, defaultOpen = false, action }: { title: string; children: ReactNode; defaultOpen?: boolean; action?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 flex-1 items-center justify-between gap-2 px-4 text-left text-sm font-semibold text-ink"
        >
          {title}
          <ChevronDown className={cn("h-4 w-4 text-ink-dim transition-transform duration-[var(--dur-base)]", open && "rotate-180")} aria-hidden />
        </button>
        {action}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function SolidControls({ ctx }: { ctx: PanelCtx }) {
  const { st, setSt, model, params, mode, how, secRefs, measureRefs, reduced } = ctx;
  const kind = st.kind;
  const info = solidInfo(kind);
  const isSphere = kind === "sphere";
  const sec = st.section;
  const inSection = mode === "section";
  const inNet = mode === "net";
  const inMeasure = mode === "measure";
  const [slot, setSlot] = useState(0);
  const [mSlot, setMSlot] = useState(0);

  const patch = (p: Partial<SolidState>) => setSt((s) => ({ ...s, ...p }));
  const patchSec = (p: Partial<SolidState["section"]>) => setSt((s) => ({ ...s, section: { ...s.section, ...p } }));
  const setView = (p: Partial<View>) => setSt((s) => ({ ...s, view: { ...s.view, ...p } }));

  const setKind = (k: SolidKind) => {
    setSlot(0);
    setMSlot(0);
    setSt((s) => ({ ...s, kind: k, section: { ...s.section, pts: [] }, measure: { ...s.measure, pts: [] }, netT: 0, mode: k === "sphere" && s.mode === "measure" ? "solid" : s.mode }));
  };
  const setParam = (key: string, v: number) =>
    setSt((s) => {
      const cur = paramsOf(s);
      return { ...s, params: { ...s.params, [s.kind]: sanitizeParams(s.kind, { ...cur, [key]: v }) } };
    });
  const setMode = (m: Mode) =>
    setSt((s) => {
      if (m === s.mode) return s;
      const view = m === "net" ? { ...s.view, ...PRESETS.top } : s.mode === "net" ? { ...s.view, ...PRESETS.default } : s.view;
      return { ...s, mode: m, view };
    });
  const setSecRef = (i: number, r: PointRef) => {
    const next = secRefs.slice();
    next[i] = r;
    patchSec({ pts: next });
  };
  const setMeasureKind = (k: MeasureKind) => {
    setMSlot(0);
    setSt((s) => ({ ...s, measure: { kind: k, pts: [] } }));
  };
  const setMeasureRef = (i: number, r: PointRef) => {
    const next = measureRefs.slice();
    next[i] = r;
    setSt((s) => ({ ...s, measure: { ...s.measure, pts: next } }));
  };

  // ---- дэлгээсийг нугалах анимац ----
  const foldRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(foldRaf.current), []);
  const playFold = () => {
    cancelAnimationFrame(foldRaf.current);
    const from = st.netT;
    const to = from < 0.5 ? 1 : 0;
    if (reduced) return patch({ netT: to });
    const start = performance.now();
    const dur = 1400 * Math.abs(to - from) + 200;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      patch({ netT: from + (to - from) * e });
      if (k < 1) foldRaf.current = requestAnimationFrame(tick);
    };
    foldRaf.current = requestAnimationFrame(tick);
  };

  const visibleParams = info.params.filter((p) => !p.when || p.when(params));
  const modes: { value: Mode; label: string }[] = [
    { value: "solid", label: "Биет" },
    { value: "section", label: "Огтлол" },
    { value: "net", label: "Дэлгээс" },
    ...(isSphere ? [] : [{ value: "measure" as Mode, label: "Өнцөг, зай" }]),
  ];

  return (
    <>
      <Panel title="Биет">
        <label className="sr-only" htmlFor="solid-kind">Биет сонгох</label>
        <select
          id="solid-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as SolidKind)}
          className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm font-medium text-ink"
        >
          {SOLIDS.map((s) => (
            <option key={s.kind} value={s.kind}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="mt-3 space-y-2">
          {visibleParams.map((p) => (
            <NumberField
              key={`${kind}-${p.key}`}
              label={<MathText>{`${p.name} ${tex(p.tex)}`}</MathText>}
              value={round(params[p.key] ?? p.def, 3)}
              min={p.min}
              max={p.max}
              step={p.step}
              onChange={(v) => setParam(p.key, v)}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {kind === "gpyramid" && (
            <>
              <Button variant="outline" size="sm" className="min-h-11" onClick={() => setSt((s) => ({ ...s, params: { ...s.params, gpyramid: sanitizeParams("gpyramid", { ...paramsOf(s), dx: 0, dz: 0 }) } }))}>
                Орой төвийн дээр
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => {
                  const A = buildSolid("gpyramid", { ...params, dx: 0, dz: 0 }).points.A;
                  setSt((s) => ({ ...s, params: { ...s.params, gpyramid: sanitizeParams("gpyramid", { ...paramsOf(s), dx: round(A[0], 4), dz: round(A[2], 4) }) } }));
                }}
              >
                <MathText>{`Орой ${tex("A")}-гийн дээр`}</MathText>
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setSt((s) => ({ ...s, params: { ...s.params, [s.kind]: defaultParams(s.kind) } }))}>
            Анхны хэмжээ
          </Button>
        </div>
      </Panel>

      <Panel title="Горим">
        <Segmented value={mode} onChange={setMode} options={modes} label="Горим" className="grid grid-cols-2 sm:flex" />

        {inSection && (
          <div className="mt-4 space-y-3">
            {!isSphere && (
              <Segmented
                value={how}
                onChange={(v) => patchSec({ how: v })}
                options={[
                  { value: "tilt", label: "Өндөр ба налуу" },
                  { value: "points", label: "Гурван цэг" },
                ]}
                label="Хавтгай тодорхойлох арга"
              />
            )}
            {how === "tilt" ? (
              <div className="space-y-2">
                <NumberField label="Өндөр" value={round(sec.y * model.H)} min={0} max={round(model.H, 3)} step={round(model.H / 100, 4) || 0.01} onChange={(v) => patchSec({ y: model.H > 0 ? clamp(v / model.H, 0, 1) : 0 })} />
                <NumberField label={<MathText>{`Налуу ${tex("\\alpha")}`}</MathText>} value={round(sec.tilt, 1)} min={0} max={90} step={1} suffix={<MathText>{tex("^\\circ")}</MathText>} onChange={(v) => patchSec({ tilt: v })} />
                {sec.tilt > 0 && (
                  <NumberField label="Налуугийн чиглэл" value={round(((sec.turn % 360) + 360) % 360, 0)} min={0} max={360} step={5} suffix={<MathText>{tex("^\\circ")}</MathText>} onChange={(v) => patchSec({ turn: v })} />
                )}
                <NumberField label="Тэнхлэгээс шилжих" value={round(sec.shift * model.span)} min={-round(model.span, 3)} max={round(model.span, 3)} step={round(model.span / 50, 4) || 0.01} onChange={(v) => patchSec({ shift: model.span > 0 ? clamp(v / model.span, -1, 1) : 0 })} />
              </div>
            ) : (
              <RefPicker groups={[{ name: "Хавтгайн гурван цэг", count: 3 }]} refs={secRefs} options={pointOptions(model)} slot={slot} setSlot={setSlot} setRef={setSecRef} />
            )}
            <div className="flex flex-wrap gap-1.5">
              <Toggle on={sec.cutAway} onChange={(v) => patchSec({ cutAway: v })}>Дээд хэсгийг авах</Toggle>
              {sec.cutAway && <Toggle on={sec.flip} onChange={(v) => patchSec({ flip: v })}>Нөгөө хэсэг</Toggle>}
              <Toggle on={sec.showPlane} onChange={(v) => patchSec({ showPlane: v })}>Хавтгай</Toggle>
            </div>
          </div>
        )}

        {inNet && ctx.netOk && (
          <div className="mt-4 space-y-2">
            <NumberField label="Нугалалт" value={round(st.netT, 2)} min={0} max={1} step={0.01} onChange={(v) => patch({ netT: v })} />
            <Button variant="secondary" size="sm" className="min-h-11" onClick={playFold}>
              {st.netT < 0.5 ? <Play className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              {st.netT < 0.5 ? "Нугалах" : "Дэлгэх"}
            </Button>
          </div>
        )}

        {inMeasure && (
          <div className="mt-4 space-y-3">
            <Segmented value={st.measure.kind} onChange={setMeasureKind} options={MEASURE_KINDS} label="Юуг хэмжих" className="grid grid-cols-2" />
            <RefPicker groups={MEASURE_GROUPS[st.measure.kind]} refs={measureRefs} options={measureOptions(model)} slot={mSlot} setSlot={setMSlot} setRef={setMeasureRef} />
          </div>
        )}
      </Panel>

      <Fold
        title="Харагдац"
        action={
          <InfoHint label="Харагдацын тайлбар">
            Зургийг хулгана эсвэл хуруугаар чирж эргүүлнэ, хоёр хуруугаар чимхэж томруулна. «Ташуу» нь сурах бичгийн кабинет проекц: урд нүүр жинхэнэ хэлбэрээрээ, гүн 45 градусаар хагас урттай. «Тестэд» нь тоог нууж, цагаан дэвсгэр дээр хар зураасаар зурна
          </InfoHint>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {VIEW_BUTTONS.map((b) => (
            <Button key={b.key} variant="outline" size="sm" className="min-h-11" onClick={() => setView({ ...PRESETS[b.key] })}>
              {b.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          <Segmented value={st.view.proj} onChange={(v) => setView({ proj: v })} options={PROJS} label="Проекц" />
          <NumberField label="Томруулалт" value={round(st.view.zoom, 2)} min={0.4} max={3} step={0.05} onChange={(v) => setView({ zoom: v })} />
          {!inNet && (
            <div>
              <div className="mb-1.5 text-sm text-ink-dim">Нуугдсан ирмэг</div>
              <Segmented value={st.hidden} onChange={(v) => patch({ hidden: v })} options={HIDDEN} label="Нуугдсан ирмэг" />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={st.test} onChange={(v) => patch({ test: v })}>Тестэд зориулж</Toggle>
            <Toggle on={st.labels} onChange={(v) => patch({ labels: v })}>Оройн нэр</Toggle>
            <Toggle on={st.dims} onChange={(v) => patch({ dims: v })}>Хэмжээс</Toggle>
            {st.dims && !st.test && <Toggle on={st.numbers} onChange={(v) => patch({ numbers: v })}>Тоогоор</Toggle>}
            {!inNet &&
              !inMeasure &&
              model.groups.map((g) => (
                <Toggle key={g} on={st.groups[g]} onChange={(v) => setSt((s) => ({ ...s, groups: { ...s.groups, [g]: v } }))}>
                  {g === "radius" && model.curved && model.curved !== "sphere" ? "Радиус, байгуулагч" : GROUP_NAME[g]}
                </Toggle>
              ))}
          </div>
        </div>
      </Fold>
    </>
  );
}

/* ---------------------------------------------- цэг сонгох -- */

const refTex = (r: PointRef | undefined) => (!r ? "?" : "name" in r ? r.name : `${r.a}${r.b}`);

/**
 * Цэгүүдийг бүлгээр сонгоно: «Шулуун: A C_1», «Хавтгай: A B C».
 * Нүдийг дараад, доорх оройг дарна — дараагийн нүд рүү автоматаар шилжинэ.
 */
function RefPicker({
  groups,
  refs,
  options,
  slot,
  setSlot,
  setRef,
}: {
  groups: { name: string; count: number }[];
  refs: PointRef[];
  options: PointOption[];
  slot: number;
  setSlot: (i: number) => void;
  setRef: (i: number, r: PointRef) => void;
}) {
  const total = groups.reduce((s, g) => s + g.count, 0);
  const cur = slot < total ? refs[slot] : undefined;
  const vertices = options.filter((o) => "name" in o.ref);
  const segments = options.filter((o) => !("name" in o.ref));
  const pick = (r: PointRef) => {
    const prev = refs[slot];
    const next: PointRef = "name" in r ? r : { ...r, t: prev && !("name" in prev) ? prev.t : 0.5 };
    setRef(slot, next);
    if ("name" in r) setSlot((slot + 1) % total);
  };
  const chip = (o: PointOption) => {
    const on = !!cur && refKey(cur) === o.key;
    return (
      <button
        key={o.key}
        type="button"
        onClick={() => pick(o.ref)}
        aria-pressed={on}
        className={cn(
          "min-h-11 min-w-11 rounded-lg border px-2 text-sm transition-colors duration-[var(--dur-micro)]",
          on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink hover:bg-bg",
        )}
      >
        <MathText>{tex(o.label)}</MathText>
      </button>
    );
  };
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((s, g) => s + g.count, 0));
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {groups.map((g, gi) => {
          const start = starts[gi];
          return (
            <div key={g.name} role="radiogroup" aria-label={g.name} className="flex items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-ink-dim">{g.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: g.count }, (_, k) => {
                  const i = start + k;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={slot === i}
                      aria-label={`${g.name}, ${k + 1}-р цэг`}
                      onClick={() => setSlot(i)}
                      className={cn(
                        "min-h-11 min-w-12 rounded-xl border px-2 text-sm",
                        slot === i ? "border-brand-bright bg-brand-bright/12 text-brand-soft" : "border-line bg-surface text-ink",
                      )}
                    >
                      <MathText>{tex(refTex(refs[i]))}</MathText>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div>
        <div className="mb-1.5 text-xs text-ink-dim">Цэг</div>
        <div className="flex flex-wrap gap-1.5">{vertices.map(chip)}</div>
      </div>
      {segments.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs text-ink-dim">
            Ирмэг дээрх цэг (дундаж г.м.)
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="flex flex-wrap gap-1.5 pt-1">{segments.map(chip)}</div>
        </details>
      )}
      {cur && !("name" in cur) && (
        <NumberField
          label={<MathText>{`Байрлал ${tex(`${cur.a}\\to ${cur.b}`)}`}</MathText>}
          value={round(cur.t, 3)}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => setRef(slot, { ...cur, t: v })}
        />
      )}
    </div>
  );
}
