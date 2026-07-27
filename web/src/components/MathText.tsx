"use client";

import katex from "katex";
import type { TrustContext } from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/**
 * Математик томьёотой текстийг рендерлэнэ.
 *
 * Khan Academy / Duolingo-тэй ижил зарчим: бодлогын текстийг LaTeX-ээр
 * тэмдэглэж хадгална, клиент талд KaTeX-ээр рендерлэнэ (MathJax-аас хурдан).
 *   - `$...$`   → мөр доторх томьёо (inline), ж: "Хэрэв $x^2 = 4$ бол…"
 *   - `$$...$$` → тусдаа мөрийн томьёо (display)
 *
 * `$` тэмдэгээр хуваахад тэгш индекс = энгийн текст, сондгой = LaTeX.
 *
 * АЮУЛГҮЙ БАЙДАЛ: LaTeX-ийг БАГШ бичдэг тул хагас-итгэмжлэгдсэн (semi-trusted)
 * эх сурвалж. `renderToString`-ийн гаралтыг `dangerouslySetInnerHTML`-ээр шууд
 * DOM-д оруулдаг тул KaTeX-ийн `trust`/`strict`/`maxSize`/`maxExpand` сонголтуудыг
 * доор ЭНД тодорхой зааж, аюултай командуудыг хаана (доорх тайлбарыг үзнэ үү).
 */

type Segment = { type: "text" | "inline" | "display"; value: string };

// Аравтын дээд индексийн (superscript) тэмдэгтүүд
const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺",
};

// Тэмдэгт мөрийг дээд индекс болгоно ("12" → "¹²", "-3" → "⁻³")
function toSuper(s: string): string {
  return s
    .split("")
    .map((ch) => SUP[ch] ?? ch)
    .join("");
}

/**
 * Эх дата эвдэхгүйгээр зэргийг (power) сэргээж харуулна.
 *
 * docx-оос текст болгон импортлоход дээд индекс (x²) алдагдаж "x 2" / "x2"
 * болсон. Энд зөвхөн **Латин ба математикийн ташуу үсгийн дараах** цифрийг
 * дээд индекс болгоно. Кириллийг ОРОЛЦУУЛАХГҮЙ тул "функцийн 2", "цэгүүд 2, 5"
 * мэт үг/тоонууд хэвээр үлдэнэ (зөвхөн x, y, f… хувьсагчийн дараах нь зэрэг).
 *
 * Зөвхөн харагдац дээр ажиллана — DB-д хадгалсан түүхий дата өөрчлөгдөхгүй.
 *
 * ЮУГ ЗӨВ ШИЙДДЭГ (баримтжуулсан жишээ — unit-test-style):
 *   "x2 + y2 = z2"     → "x² + y² = z²"      (үсэг + цифр, сул зайгүй)
 *   "x 2"              → "x ²"               (үсэг + сул зай + цифр)
 *   "a^2 + b^-3"       → "a² + b⁻³"          (caret тэмдэглэгээ, урьдчилж)
 *   "x^{12}"           → "x¹²"               (caret + олон оронтой)
 *   "функцийн 2 язгуур" → өөрчлөгдөхгүй       (Кирилл үсгийн дараах цифр)
 *
 * ЮУГ ШИЙДЭХГҮЙ / АЛДААТАЙ БОЛОХ БОЛОМЖТОЙ (мэдэгдэж буй хязгаарлалт):
 *   - "x2y2" (хувьсагч хооронд зай/тэмдэггүй) → зөвхөн эхний үсэг бүрийн
 *     ДАРААХ 1 цифрийг сольж, "x²y²" гарна — 2-оос дээш оронтой цифрийг
 *     (жш: "x23") бүгдийг нь биш, зөвхөн эхний цифрийг дээд индекс болгоно
 *     ("x²3"), учир нь regex нэг цифр л барьдаг.
 *   - Доод индекс (subscript, "x_1", "x1" гэдгийг доод индекс гэж тайлах
 *     шаардлагатай тохиолдол) огт дэмжигдээгүй — бүгд дээд индекс гэж үзнэ.
 *   - "2x" (тоо эхэндээ) — coefficient咲 хэлбэрийг хөндөхгүй, зөвхөн
 *     үсгийн ДАРАА ирсэн цифрийг л шилжүүлнэ.
 *   - Латин үсэг Кирилл үгийн төгсгөлд давхацвал (ж: "май2" — англи маягийн
 *     нэр/код) санамсаргүйгээр дээд индекс болох эрсдэлтэй хэвээр байна.
 *   - Эдгээр edge case-үүдийг бүрэн шийдэхийн тулд бодит NLP/tokenizer
 *     хэрэгтэй — энэ heuristic зөвхөн түгээмэл docx-import алдааг л засна.
 */
function normalizeMath(text: string): string {
  let out = text;
  // 1) Caret тэмдэглэгээ: "x^2", "x^{12}", "x^-3" → дээд индекс
  out = out.replace(/\^\{?([+-]?\d+)\}?/g, (_m, exp: string) => toSuper(exp));
  // 2) <Латин/математик-ташуу үсэг> [сул зай] <цифр> → үсэг + дээд_индекс
  //    (Кириллийг ОРОЛЦУУЛАХГҮЙ тул "функцийн 2" мэт үг хэвээр үлдэнэ)
  out = out.replace(
    /([a-zA-Z\u{1D400}-\u{1D7FF}])\s?(\d)/gu,
    (_m, letter: string, digit: string) => letter + (SUP[digit] ?? digit),
  );
  return out;
}

function parse(input: string): Segment[] {
  const segments: Segment[] = [];
  // Эхлээд $$...$$ display, дараа нь $...$ inline-г олно
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "display", value: match[1] });
    } else {
      segments.push({ type: "inline", value: match[2] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }
  return segments;
}

// Зөвхөн ЭНЭ хоёр команд trust шаарддаг боловч аюулгүй (зөвхөн холбоос
// нээдэг): \href, \url. Бусад бүх trust-шаардсан команд —
// \includegraphics (дурын URL-аас зураг татна → SSRF/tracking эрсдэл),
// \htmlClass, \htmlId, \htmlData (дурын HTML атрибут → CSS-ийн тусламжтай
// давхарга/overlay ашиглан клиентийг мэхлэх боломж), \htmlStyle
// (дурын inline CSS) — БҮГДИЙГ ХОРИГЛОНО (доор `context.command`-аар
// шүүхэд эдгээр нь `false`-д унана, өөрөөр хэлбэл дэмжигдэхгүй).
function isTrustedContext(context: TrustContext): boolean {
  if (context.command !== "\\href" && context.command !== "\\url") return false;
  // Зөвхөн http(s):// эхэлсэн холбоос — javascript:, data:, vbscript: гэх мэт
  // XSS-д ашиглагддаг protocol-уудыг хориглоно.
  return /^https?:/.test(context.url);
}

function katexOptions(displayMode: boolean): katex.KatexOptions {
  return {
    displayMode,
    throwOnError: false, // Алдаатай LaTeX бол throw хийхгүй, харин алдаатай хэсгийг өнгөөр тэмдэглэж харуулна
    // trust: НЭГ Ч ХЭЗЭЭ true болгож БОЛОХГҮЙ — багшийн бичсэн LaTeX
    // хагас-итгэмжлэгдсэн эх сурвалж тул зөвхөн дээрх whitelist-т байгаа
    // (https:// холбоос бүхий \href/\url) командыг л зөвшөөрнө.
    trust: isTrustedContext,
    // strict: "warn" — стандарт бус LaTeX-ийг (жш: unicode тэмдэгт math горимд)
    // дэмжинэ (хатуу алдаа болгож блоклохгүй) гэхдээ console.warn-аар анхааруулна.
    strict: "warn",
    // maxSize: 20 — хэрэглэгчийн зааж болох хэмжээс (\rule, \kern гэх мэт)-ийг
    // 20em-ээр хязгаарлана. Үгүй бол хэт том элемент зурж хуудсыг гацаах/эвдэх
    // боломжтой ("оношилгооны бөмбөг" маягийн бодлогын дата гэмтэх/дайрах эрсдэл).
    maxSize: 20,
    // maxExpand: 1000 — макро өргөтгөлийг (жш: рекурсив \def) хязгаарлаж,
    // санамсаргүй/санаатай "macro bomb"-оор хөтчийг царцаахаас сэргийлнэ.
    maxExpand: 1000,
    // output: "htmlAndMathml" — дэлгэцний уншигч (screen reader)-д зориулж
    // MathML-ийг HTML-ийн хамт гаргана (accessibility).
    output: "htmlAndMathml",
  };
}

// KaTeX-ийн `renderToString` нь харьцангуй хүнд үйлдэл (бүтэн LaTeX parse).
// 100 бодлоготой сан (library) жагсаалт scroll хийхэд ижил LaTeX-ийг дахин
// дахин parse хийхгүйн тулд (latex, displayMode) хослолоор кэшилнэ.
// Options (trust/strict/maxSize г.м.) программ даяар тогтмол тул түлхүүрд
// оруулах шаардлагагүй, зөвхөн displayMode нэмэгдэнэ (inline/display өөр HTML).
const renderCache = new Map<string, string>();
const RENDER_CACHE_MAX = 500; // Санах ойн алдагдлаас сэргийлж дээд хэмжээ тогтооно

function renderTex(tex: string, displayMode: boolean): string {
  const cacheKey = `${displayMode ? "d" : "i"}:${tex}`;
  const cached = renderCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let html: string;
  try {
    html = katex.renderToString(tex, katexOptions(displayMode));
  } catch {
    html = tex; // алдаа гарвал түүхий текстээр харуулна
  }

  if (renderCache.size >= RENDER_CACHE_MAX) {
    // Хамгийн эртний (LRU биш, гэхдээ Map insertion-order ашиглаж хамгийн
    // эхэнд нэмэгдсэн) бичлэгийг хасаж кэш хэт томроохоос сэргийлнэ.
    const oldestKey = renderCache.keys().next().value;
    if (oldestKey !== undefined) renderCache.delete(oldestKey);
  }
  renderCache.set(cacheKey, html);
  return html;
}

export default function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = useMemo(() => parse(children ?? ""), [children]);

  // segments өөрчлөгдөөгүй бол (жш: parent дахин render хийгдэхэд) энэ
  // .map-ийг дахин ажиллуулахгүй — доторх renderTex нь кэштэй ч гэсэн
  // Map.get дуудлагыг ч давтахгүй байх нь илүү хямд.
  const rendered = useMemo(
    () =>
      segments.map((seg, i) => {
        if (seg.type === "text") {
          // Энгийн текст хэсэгт зэргийн нормчлол хэрэглэнэ ($…$ LaTeX-д хэрэггүй)
          return { key: i, kind: "text" as const, value: normalizeMath(seg.value) };
        }
        return {
          key: i,
          kind: "html" as const,
          value: renderTex(seg.value, seg.type === "display"),
        };
      }),
    [segments],
  );

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {rendered.map((seg) =>
        seg.kind === "text" ? (
          <span key={seg.key}>{seg.value}</span>
        ) : (
          <span
            key={seg.key}
            // KaTeX-ийн гаргасан HTML-ийг шууд оруулна (найдвартай эх сурвалж:
            // trust/strict/maxSize/maxExpand-аар хязгаарласан KaTeX-ийн өөрийн гаралт)
            dangerouslySetInnerHTML={{ __html: seg.value }}
          />
        ),
      )}
    </span>
  );
}
