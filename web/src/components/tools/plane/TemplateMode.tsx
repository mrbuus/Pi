"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { CircleAlert, EyeOff } from "lucide-react";
import MathText from "@/components/MathText";
import InfoHint from "@/components/ui/InfoHint";
import { cn } from "@/lib/cn";
import ToolFrame, { Panel, Segmented, Toggle } from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import Field from "./Field";
import FigureSvg, { fitPrims, primsBox, useMedia, useSize, type View } from "./FigureSvg";
import Results from "./Results";
import { applyDrag, settlePose } from "./drag";
import type { Pt } from "./geom";
import { buildShape, DEFAULT_OPTS, DEFAULT_PARAMS, type Opts, type Params, type ShapeKind, type TriKind, type Vertex } from "./shapes";

/* ============================================================================
 * «Загвар» горим: дүрсийг хэмжээгээр нь зөв масштабтай зурна + тооцоо.
 * Утсан дээрх дараалал: зураг → гол үр дүн → дүрс → хэмжээ → нэмэлт шугам.
 * Зураг дээрх цагираг цэгийг чирж хэмжээг шууд өөрчилж болно.
 * ========================================================================== */

const SHAPES: { value: ShapeKind; label: string }[] = [
  { value: "triangle", label: "Гурвалжин" },
  { value: "rectangle", label: "Тэгш өнцөгт" },
  { value: "square", label: "Квадрат" },
  { value: "parallelogram", label: "Параллелограмм" },
  { value: "rhombus", label: "Ромб" },
  { value: "trapezoid", label: "Трапец" },
  { value: "polygon", label: "Зөв олон өнцөгт" },
  { value: "circle", label: "Тойрог" },
];

const TRI_KINDS: { value: TriKind; label: string; title: string }[] = [
  { value: "sss", label: "3 тал", title: "Гурван талаар" },
  { value: "sas", label: "2 тал, өнцөг", title: "Хоёр тал ба тэдгээрийн хоорондох өнцгөөр" },
  { value: "asa", label: "Өнцөг, тал, өнцөг", title: "Хоёр өнцөг ба тэдгээрийн хоорондох талаар" },
  { value: "aas", label: "2 өнцөг, тал", title: "Хоёр өнцөг ба нэг өнцгийн эсрэг талаар" },
  { value: "ssa", label: "2 тал, эсрэг өнцөг", title: "Хоёр тал ба нэг талын эсрэг өнцгөөр" },
  { value: "right", label: "Тэгш өнцөгт", title: "Хоёр катетаар" },
  { value: "iso", label: "Адил хажуут", title: "Суурь ба хажуу талаар" },
  { value: "equi", label: "Зөв", title: "Талаар" },
];

const M = (tex: string, rest?: string) => (
  <span>
    <MathText>{`$${tex}$`}</MathText>
    {rest ? ` ${rest}` : ""}
  </span>
);

interface Saved {
  p: Params;
  o: Opts;
}

interface Drag {
  id: string;
  pointer: number;
  view: View;
}

export default function TemplateMode({ modeSwitch }: { modeSwitch: ReactNode }) {
  const [st, setSt] = useState<Saved>(() => {
    const s = loadState<Saved>("plane-template", { p: DEFAULT_PARAMS, o: DEFAULT_OPTS });
    return { p: { ...DEFAULT_PARAMS, ...s.p }, o: { ...DEFAULT_OPTS, ...s.o } };
  });
  useEffect(() => saveState("plane-template", st), [st]);
  const { p, o } = st;
  /** Чирсэн гурвалжны байрлал — оролтоор өөрчилбөл стандарт байрлал руу буцна */
  const [pose, setPose] = useState<Pt[] | null>(null);
  const setP = (x: Partial<Params>) => {
    setPose(null);
    setSt((s) => ({ ...s, p: { ...s.p, ...x } }));
  };
  const setO = (x: Partial<Opts>) => setSt((s) => ({ ...s, o: { ...s.o, ...x } }));

  const svgRef = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const lg = useMedia("(min-width: 1024px)");
  const fontSize = lg ? (Math.min(w, h) > 700 ? 21 : 18) : 16;
  const pad = Math.round(fontSize * 2.6);

  const built = useMemo(() => buildShape(p, o, pose ?? undefined), [p, o, pose]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const fitted = useMemo(() => (built.ok ? fitPrims(built.prims, w, h, pad) : { s: 1, ox: 0, oy: 0 }), [built, w, h, pad]);
  const view = drag ? drag.view : fitted;

  /** Утсан дээр зургийн өндрийг дүрсийн хэлбэрт тааруулна (өргөн дүрсэд хоосон зай үлдээхгүй) */
  const phoneH = useMemo(() => {
    if (!built.ok) return 280;
    const b = primsBox(built.prims);
    const bw = Math.max(b.maxX - b.minX, 1e-6), bh = Math.max(b.maxY - b.minY, 1e-6);
    return Math.round((bh / bw) * Math.max(120, w - 2 * pad) + 2 * pad);
  }, [built, w, pad]);

  /* ---------- Чирэх ---------- */
  const toWorld = (e: { clientX: number; clientY: number }, v: View): Pt => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    const sx = ((e.clientX - r.left) / r.width) * w, sy = ((e.clientY - r.top) / r.height) * h;
    return { x: (sx - v.ox) / v.s, y: (v.oy - sy) / v.s };
  };
  const triVerts = (): Pt[] | undefined => (built.ok && p.shape === "triangle" ? (pose ?? built.handles.map((x) => x.p)) : undefined);

  const onHandleDown = (id: string) => (e: RPointerEvent<SVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    setDrag({ id, pointer: e.pointerId, view: fitted });
  };
  const onHandleMove = (e: RPointerEvent<SVGElement>) => {
    if (!drag || drag.pointer !== e.pointerId) return;
    const r = applyDrag(p, drag.id, toWorld(e, drag.view), triVerts());
    if (!r) return;
    setSt((s) => ({ ...s, p: r.p }));
    setPose(r.pose ?? null);
  };
  const onHandleUp = (e: RPointerEvent<SVGElement>) => {
    if (!drag || drag.pointer !== e.pointerId) return;
    setDrag(null);
    if (pose && built.ok && built.tri) setPose(settlePose(built.tri, pose));
  };

  const handles =
    built.ok && !o.exam ? (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {built.handles.map((hd) => {
          const x = view.ox + hd.p.x * view.s, y = view.oy - hd.p.y * view.s;
          const on = drag?.id === hd.id;
          return (
            <g
              key={hd.id}
              className="pointer-events-auto cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onPointerDown={onHandleDown(hd.id)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
            >
              <title>Чирж хэмжээг өөрчилнө</title>
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <circle cx={x} cy={y} r={on ? 9 : 7} fill="var(--surface)" fillOpacity={0.6} stroke="var(--brand)" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
    ) : null;

  /* ---------- Удирдлага ---------- */
  const num = (key: keyof Params, label: ReactNode, name: string, min: number, max: number, step = 0.5, suffix?: ReactNode) => (
    <Field key={key} label={label} name={name} value={p[key] as number} onChange={(v) => setP({ [key]: v } as Partial<Params>)} min={min} max={max} step={step} suffix={suffix} />
  );
  const deg = M("^\\circ");
  const tog = (key: keyof Opts, label: ReactNode) => (
    <Toggle key={key} on={o[key] as boolean} onChange={(v) => setO({ [key]: v } as Partial<Opts>)}>
      {label}
    </Toggle>
  );

  const sizeFields = (): ReactNode => {
    switch (p.shape) {
      case "triangle": {
        const fields: Record<TriKind, ReactNode[]> = {
          sss: [num("a", M("a=BC"), "a тал", 0.1, 100), num("b", M("b=CA"), "b тал", 0.1, 100), num("c", M("c=AB"), "c тал", 0.1, 100)],
          sas: [num("b", M("b=CA"), "b тал", 0.1, 100), num("c", M("c=AB"), "c тал", 0.1, 100), num("A", M("\\angle A"), "A өнцөг", 1, 179, 1, deg)],
          asa: [num("B", M("\\angle B"), "B өнцөг", 1, 178, 1, deg), num("a", M("a=BC"), "a тал", 0.1, 100), num("C", M("\\angle C"), "C өнцөг", 1, 178, 1, deg)],
          aas: [num("A", M("\\angle A"), "A өнцөг", 1, 178, 1, deg), num("B", M("\\angle B"), "B өнцөг", 1, 178, 1, deg), num("a", M("a=BC"), "a тал", 0.1, 100)],
          ssa: [num("a", M("a=BC"), "a тал", 0.1, 100), num("b", M("b=CA"), "b тал", 0.1, 100), num("A", M("\\angle A"), "A өнцөг", 1, 179, 1, deg)],
          right: [num("a", M("a", "катет"), "a катет", 0.1, 100), num("b", M("b", "катет"), "b катет", 0.1, 100)],
          iso: [num("a", M("a", "суурь"), "Суурь", 0.1, 100), num("b", M("b", "хажуу тал"), "Хажуу тал", 0.1, 100)],
          equi: [num("a", M("a", "тал"), "Тал", 0.1, 100)],
        };
        return (
          <>
            <Segmented label="Гурвалжин байгуулах арга" value={p.triKind} onChange={(v) => setP({ triKind: v, ssaAlt: false })} options={TRI_KINDS} />
            <div className="space-y-2">{fields[p.triKind]}</div>
            {built.ok && built.hasAlt && (
              <Toggle on={p.ssaAlt} onChange={(v) => setP({ ssaAlt: v })}>
                Хоёр дахь шийд
              </Toggle>
            )}
          </>
        );
      }
      case "rectangle":
        return [num("rw", M("a=AB"), "a тал", 0.1, 100), num("rh", M("b=BC"), "b тал", 0.1, 100)];
      case "square":
        return num("sq", M("a", "тал"), "Тал", 0.1, 100);
      case "parallelogram":
        return [num("pa", M("a=AB"), "a тал", 0.1, 100), num("pb", M("b=AD"), "b тал", 0.1, 100), num("palpha", M("\\alpha=\\angle A"), "A өнцөг", 1, 179, 1, deg)];
      case "rhombus":
        return (
          <>
            <Segmented label="Ромбыг юугаар" value={p.rhKind} onChange={(v) => setP({ rhKind: v })} options={[{ value: "angle", label: "Тал, өнцөг" }, { value: "diag", label: "Диагоналиуд" }]} />
            {p.rhKind === "angle"
              ? [num("rha", M("a", "тал"), "Тал", 0.1, 100), num("rhAlpha", M("\\alpha=\\angle A"), "A өнцөг", 1, 179, 1, deg)]
              : [num("d1", M("d_1=AC"), "Нэг диагональ", 0.1, 100), num("d2", M("d_2=BD"), "Нөгөө диагональ", 0.1, 100)]}
          </>
        );
      case "trapezoid":
        return (
          <>
            <Segmented
              label="Трапецын төрөл"
              value={p.trKind}
              onChange={(v) => setP({ trKind: v })}
              options={[{ value: "iso", label: "Адил хажуут" }, { value: "right", label: "Тэгш өнцөгт" }, { value: "legs", label: "4 талаар" }]}
            />
            {num("ta", M("a=AD", "доод суурь"), "Доод суурь", 0.1, 100)}
            {num("tb", M("b=BC", "дээд суурь"), "Дээд суурь", 0.1, 100)}
            {p.trKind === "legs"
              ? [num("tc", M("c=AB"), "c хажуу тал", 0.1, 100), num("td", M("d=CD"), "d хажуу тал", 0.1, 100)]
              : num("th", M("h", "өндөр"), "Өндөр", 0.1, 100)}
          </>
        );
      case "polygon":
        return [num("n", M("n", "өнцгийн тоо"), "Өнцгийн тоо", 3, 12, 1), num("pside", M("a", "тал"), "Тал", 0.1, 100)];
      case "circle": {
        const anyTh = o.cChord || o.cSector || o.cSegment || o.cCentral || o.cInscribed;
        return (
          <>
            <Segmented label="Хэмжээ" value={p.rAsD ? "d" : "r"} onChange={(v) => setP({ rAsD: v === "d" })} options={[{ value: "r", label: "Радиус" }, { value: "d", label: "Диаметр" }]} />
            {num("r", p.rAsD ? M("d", "диаметр") : M("r", "радиус"), p.rAsD ? "Диаметр" : "Радиус", 0.1, 100)}
            {anyTh && num("theta", M("\\theta", "төв өнцөг"), "Төв өнцөг", 1, 359, 1, deg)}
            {o.cTangentExt && num("tanD", M("d=OP", "төвөөс цэг хүртэл"), "Төвөөс цэг хүртэлх зай", 0.1, 200)}
          </>
        );
      }
    }
  };

  const extras = (): ReactNode => {
    switch (p.shape) {
      case "triangle":
        return (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-dim">Аль оройгоос</span>
              <Segmented<Vertex>
                label="Аль оройгоос"
                value={o.from}
                onChange={(v) => setO({ from: v })}
                options={[{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "all", label: "Бүгд" }]}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tog("height", "Өндөр")}
              {tog("median", "Медиан")}
              {tog("bisector", "Биссектрис")}
              {tog("perpBis", "Дунд перпендикуляр")}
              {tog("midline", "Дунд шугам")}
              {tog("incircle", "Багтсан тойрог")}
              {tog("circumcircle", "Багтаасан тойрог")}
            </div>
            <div className="flex items-center gap-1 pt-1 text-sm text-ink-dim">
              Гайхамшигт цэгүүд
              <InfoHint label="Цэгүүдийн тайлбар">
                <MathText>{"Ортоцентр $H$ — өндрүүдийн огтлолцол, барицентр $G$ — медиануудын огтлолцол, инцентр $I$ — биссектрисуудын огтлолцол (багтсан тойргийн төв), цирцумцентр $O$ — дунд перпендикуляруудын огтлолцол (багтаасан тойргийн төв). Эйлерийн шулуун $O$, $G$, $H$-ийг дайрна"}</MathText>
              </InfoHint>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tog("orthoC", M("H", "ортоцентр"))}
              {tog("centroidC", M("G", "барицентр"))}
              {tog("inC", M("I", "инцентр"))}
              {tog("circumC", M("O", "цирцумцентр"))}
              {tog("euler", "Эйлерийн шулуун")}
            </div>
          </>
        );
      case "rectangle":
      case "square":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("diagonals", "Диагональ")}
            {tog("qCircles", p.shape === "square" ? "Багтсан, багтаасан тойрог" : "Багтаасан тойрог")}
          </div>
        );
      case "parallelogram":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("diagonals", "Диагональ")}
            {tog("qHeight", "Өндөр")}
          </div>
        );
      case "rhombus":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("diagonals", "Диагональ")}
            {tog("qHeight", "Өндөр")}
            {tog("qCircles", "Багтсан тойрог")}
          </div>
        );
      case "trapezoid":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("diagonals", "Диагональ")}
            {tog("qHeight", "Өндөр")}
            {tog("midline", "Дундаж шугам")}
          </div>
        );
      case "polygon":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("pR", M("R", "радиус"))}
            {tog("pr", M("r", "апофем"))}
            {tog("pOut", "Багтаасан тойрог")}
            {tog("pIn", "Багтсан тойрог")}
            {tog("pDiag", "Диагоналиуд")}
            {tog("pCentral", "Төв өнцөг")}
          </div>
        );
      case "circle":
        return (
          <div className="flex flex-wrap gap-1.5">
            {tog("cRadius", "Радиус")}
            {tog("cDiameter", "Диаметр")}
            {tog("cChord", "Хөвч")}
            {tog("cCentral", "Төв өнцөг")}
            {tog("cInscribed", "Тойргийн өнцөг")}
            {tog("cSector", "Сектор")}
            {tog("cSegment", "Сегмент")}
            {tog("cTangent", "Шүргэгч")}
            {tog("cTangentExt", "Гадна цэгээс шүргэгч")}
          </div>
        );
    }
  };

  const controls = (
    <>
      <Panel title="Дүрс">
        <Segmented label="Дүрс сонгох" value={p.shape} onChange={(v) => setP({ shape: v })} options={SHAPES} />
      </Panel>
      <Panel
        title="Хэмжээ"
        action={
          built.ok && built.handles.length > 0 ? (
            <InfoHint label="Зураг дээр чирэх">Зураг дээрх цагираг цэгийг чирж хэмжээг шууд өөрчилж болно</InfoHint>
          ) : undefined
        }
      >
        <div className="space-y-3">{sizeFields()}</div>
      </Panel>
      <Panel title={p.shape === "circle" ? "Тойргийн элемент" : "Нэмэлт шугам"}>
        <div className="space-y-2">{extras()}</div>
      </Panel>
      <Panel title="Шошго">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {tog("vertexNames", "Оройн нэр")}
            {tog("marks", "Тэнцүү ба тэгш өнцгийн тэмдэг")}
            {tog("fill", "Зөөлөн будах")}
          </div>
          <div className="space-y-1">
            <span className="text-sm text-ink-dim">Талын шошго</span>
            <Segmented label="Талын шошго" value={o.sideLabels} onChange={(v) => setO({ sideLabels: v })} options={[{ value: "none", label: "Үгүй" }, { value: "value", label: "Урт" }, { value: "letter", label: "Үсэг" }]} />
          </div>
          <div className="space-y-1">
            <span className="text-sm text-ink-dim">Өнцгийн шошго</span>
            <Segmented label="Өнцгийн шошго" value={o.angleLabels} onChange={(v) => setO({ angleLabels: v })} options={[{ value: "none", label: "Үгүй" }, { value: "value", label: "Градус" }, { value: "letter", label: "Үсэг" }]} />
          </div>
          <div className="space-y-1">
            <span className="text-sm text-ink-dim">Нэгж</span>
            <Segmented label="Нэгж" value={o.unit || "none"} onChange={(v) => setO({ unit: v === "none" ? "" : "см" })} options={[{ value: "none", label: "Нэгжгүй" }, { value: "см", label: "см" }]} />
          </div>
        </div>
      </Panel>
    </>
  );

  const toolbar = (
    <>
      {modeSwitch}
      <button
        type="button"
        aria-pressed={o.exam}
        onClick={() => setO({ exam: !o.exam })}
        title="Тестэд зориулж: зурган дээр тоо биш үсэг үлдээнэ"
        aria-label="Тестэд зориулж — зурган дээр тоог нууж үсэг үлдээх"
        className={cn(
          "inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium transition-colors duration-[var(--dur-micro)]",
          o.exam ? "border-brand-bright/50 bg-brand-bright/12 text-brand-soft" : "border-line bg-surface text-ink-dim hover:text-ink",
        )}
      >
        <EyeOff className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Тестэд зориулж</span>
      </button>
    </>
  );

  const footer = built.ok ? <Results metrics={built.metrics} note={built.note} /> : null;

  return (
    <ToolFrame svgRef={built.ok ? svgRef : undefined} fileName={`pimath-${p.shape}`} controls={controls} toolbar={toolbar} footer={footer}>
      {/* утсан дээр өндрийг тогтооно; 1024px+ дээр хүрээ өөрөө дүүргэнэ */}
      <div aria-hidden className="lg:hidden" style={{ height: `clamp(44vh, ${phoneH}px, 60vh)` }} />
      <div ref={box} className="absolute inset-0">
        {built.ok ? (
          <>
            <FigureSvg prims={built.prims} view={view} w={w} h={h} svgRef={svgRef} fontSize={fontSize} aria-label={SHAPES.find((s) => s.value === p.shape)?.label} />
            {handles}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <CircleAlert className="h-8 w-8 text-ink-dim" aria-hidden />
            <p className="text-base font-semibold text-ink">
              {p.shape === "triangle" ? "Ийм гурвалжин байхгүй" : p.shape === "trapezoid" ? "Ийм трапец байгуулах боломжгүй" : "Утгаа шалгана уу"}
            </p>
            <p className="max-w-sm text-sm text-ink-dim">{built.reason}</p>
            {built.tex && <MathText className="text-sm text-ink">{`$${built.tex}$`}</MathText>}
          </div>
        )}
      </div>
    </ToolFrame>
  );
}
