/* ============================================================================
 * Хэрэглэгдэхүүний зургийг SVG/PNG болгож татах.
 *
 * SVG дотор өнгийг `var(--ink)` гэх мэт токеноор бичдэг. Татсан файл
 * хуудаснаас салангид тул токен шийдэгдэхгүй — энд бодит өнгөөр солино.
 * «Хэвлэх» горимд (анхдагч) цагаан дэвсгэр, хар зураас — тест, ажлын хуудсанд.
 * ========================================================================== */

/** Хэвлэх өнгө: сурах бичгийн хар-саарал, тодотгол нь логоны хөх */
const PRINT_VARS: Record<string, string> = {
  "--bg": "#FFFFFF",
  "--surface": "#FFFFFF",
  "--bg-panel": "#FFFFFF",
  "--ink": "#111111",
  "--ink-dim": "#555555",
  "--line": "#C8C8C8",
  "--brand": "#1D4ED8",
  "--brand-bright": "#2563EB",
  "--brand-soft": "#1E3A8A",
  "--brand-tint": "#DCE6FB",
  "--logo": "#273F74",
  "--success": "#1E7D34",
  "--error": "#B3261E",
  "--warning": "#8A5A00",
  "--info": "#0B5FA8",
  "--teal": "#0F766E",
  "--violet": "#6D28D9",
  "--fuchsia": "#A21CAF",
  "--sky": "#0369A1",
  "--rose": "#BE123C",
};

export interface ExportOptions {
  /** true (анхдагч): цагаан дэвсгэр, хэвлэх өнгө; false: дэлгэцийн өнгө */
  print?: boolean;
}

/** SVG-г бие даасан мөр болгоно: токеныг шийдэж, дэвсгэр нэмнэ */
export function svgToString(svg: SVGSVGElement, opts: ExportOptions = {}): string {
  const print = opts.print ?? true;
  const css = getComputedStyle(svg);
  const resolve = (name: string, fallback?: string): string => {
    if (print && PRINT_VARS[name]) return PRINT_VARS[name];
    const v = css.getPropertyValue(name).trim();
    return v || fallback?.trim() || "#000";
  };
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export-skip]").forEach((el) => el.remove());
  const box = svg.viewBox.baseVal;
  const w = box && box.width ? box.width : svg.clientWidth;
  const h = box && box.height ? box.height : svg.clientHeight;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.round(w)));
  clone.setAttribute("height", String(Math.round(h)));
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", String(box?.x ?? 0));
  bg.setAttribute("y", String(box?.y ?? 0));
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", print ? "#FFFFFF" : resolve("--surface"));
  clone.insertBefore(bg, clone.firstChild);
  let text = new XMLSerializer().serializeToString(clone);
  // var(--x) ба var(--x, fallback) хоёуланг солино
  text = text.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_m, name: string, fb?: string) => resolve(name, fb));
  // color-mix(in srgb, #… N%, transparent) нь зарим зураг уншигчид ойлгогддоггүй тул хэвээр нь үлдээнэ
  return `<?xml version="1.0" encoding="UTF-8"?>\n${text}`;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadSvg(svg: SVGSVGElement, name: string, opts?: ExportOptions) {
  saveBlob(new Blob([svgToString(svg, opts)], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
}

/** PNG — анхдагчаар 3 дахин нягт (хэвлэхэд тод) */
export async function downloadPng(svg: SVGSVGElement, name: string, opts: ExportOptions & { scale?: number } = {}) {
  const str = svgToString(svg, opts);
  const box = svg.viewBox.baseVal;
  const w = box && box.width ? box.width : svg.clientWidth;
  const h = box && box.height ? box.height : svg.clientHeight;
  const scale = opts.scale ?? Math.max(2, Math.min(4, 2400 / Math.max(w, h)));
  const img = new Image();
  img.decoding = "async";
  const url = URL.createObjectURL(new Blob([str], { type: "image/svg+xml;charset=utf-8" }));
  try {
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error("Зургийг бэлтгэж чадсангүй"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Зургийг бэлтгэж чадсангүй");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    if (!blob) throw new Error("Зургийг бэлтгэж чадсангүй");
    saveBlob(blob, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- Төлөв хадгалах (хувийн хөтөч, хоосон storage үед ч ажиллана) ---------- */

export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`pi-tools:${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const isObj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
    if (isObj(fallback)) return isObj(parsed) ? { ...fallback, ...parsed } : fallback;
    return Array.isArray(fallback) === Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem(`pi-tools:${key}`, JSON.stringify(value));
  } catch {
    /* хувийн горим, дүүрсэн storage — зүгээр алгасна */
  }
}
