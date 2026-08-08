"use client";

import katex from "katex";
import type { TrustContext } from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

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

/**
 * Зэргийг (power) илрүүлэх ЦОРЫН ГАНЦ дүрэм.
 *
 * Хоёр хэлбэрийг нэг дор барина, зүүнээс баруун тийш нэг удаа гүйнэ:
 *   • caret тэмдэглэгээ:  x^2 · x^{12} · b^-3
 *   • docx-оос алдагдсан: x2 · x 2   (үсэг, сонголтоор сул зай, цифр)
 *
 * Нэг regex болгосон шалтгаан: өмнө нь хоёр тусдаа `.replace()` дараалан
 * ажилладаг байсан. Эхнийх нь гаралт руугаа хоёр дахийг нь оруулж болзошгүй
 * (давхар боловсруулалт). Нэг гүйлтэд тухайн хэсгийг НЭГ л удаа хөрвүүлнэ.
 *
 * Кирилл үсгийг ЗОРИУДААР оруулаагүй — «функцийн 2», «цэгүүд 2, 5» мэт
 * жирийн монгол бичвэр зэрэг болж хувирахгүй.
 */
const POWER_RE = /([a-zA-Z\u{1D400}-\u{1D7FF}])(?:\^\{?([+-]?\d+)\}?|\s?(\d))/gu;

/**
 * ХЭМЖЭЭНИЙ тэмдэглэгээ — «100x100», «200 x 200», «24x24».
 *
 * Эдгээр нь математик БИШ: сургалтын номын цуврал нэр («100x100», «200x200»,
 * «300x300») бөгөөд UI даяар харагдана. POWER_RE-ийн хувьд «100x100» нь
 * «x» хувьсагчийн дараа «1» цифр ирсэн мэт харагдаж, «100x¹00» болж эвдэрдэг
 * байсан (энэ алдаа unicode хувилбарт ч байсан).
 *
 * Тиймээс нормчлохын ӨМНӨ ийм хэсгийг түр далдалж, дараа нь буцааж тавина.
 * Далдлах тэмдэг нь Private Use Area (U+E000) — жинхэнэ бичвэрт хэзээ ч
 * таарахгүй, мөн удирдлагын тэмдэгт биш тул логд ч аюулгүй.
 */
const DIMENSION_RE = /\d+\s*[xх]\s*\d+/gi;
const DIM_MARK = "\uE000";

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
 * ⚠️ 2026-08-08-нд ГАРАЛТ ӨӨРЧЛӨГДСӨН. Өмнө нь unicode дээд индекс тэмдэгт
 *    (x², y³) гаргадаг байсан. Эзэн тэдгээрийг хатуу хориглосон
 *    (STATUS.md §3.1: «π, ² гэх мэт энгийн тэмдэгт ХЭЗЭЭ Ч болохгүй —
 *    маш хүндэтгэлгүй, муухай, заваан харагдаж байна»).
 *
 *    Одоо LaTeX гаргаж, KaTeX-ээр ЖИНХЭНЭ зэрэг болгож зурна. Ялгаа нь:
 *    unicode «²» бол фонтод байгаа бэлэн глиф — хэмжээ, өндөр нь фонтоос
 *    хамаарч, суурь үсэгтэйгээ зохицдоггүй. KaTeX-ийн зэрэг нь суурийн
 *    хэмжээнээс тооцоологдож, математикийн бичлэгийн дүрмээр байрлана.
 *
 * ЮУГ ЗӨВ ШИЙДДЭГ (баримтжуулсан жишээ — unit-test-style):
 *   "x2 + y2 = z2"     → "$x^{2}$ + $y^{2}$ = $z^{2}$"   (үсэг + цифр)
 *   "x 2"              → "$x^{2}$"                        (үсэг + сул зай + цифр)
 *   "a^2 + b^-3"       → "$a^{2}$ + $b^{-3}$"             (caret тэмдэглэгээ)
 *   "x^{12}"           → "$x^{12}$"                       (caret + олон оронтой)
 *   "функцийн 2 язгуур" → өөрчлөгдөхгүй                    (Кирилл үсгийн дараах цифр)
 *
 *   "100x100 ном"      → өөрчлөгдөхгүй                    (номын цувралын нэр)
 *   "2x + 3 = 0"       → өөрчлөгдөхгүй                    (коэффициент)
 *
 * ЮУГ ШИЙДЭХГҮЙ / АЛДААТАЙ БОЛОХ БОЛОМЖТОЙ (мэдэгдэж буй хязгаарлалт):
 *   - "x23" гэх мэт 2-оос дээш оронтой зэрэг → зөвхөн эхний цифрийг авна
 *     ("$x^{2}$3"), учир нь regex-ийн энгийн салаа нэг цифр барьдаг.
 *     (caret хэлбэр "x^{23}" бол зөв ажиллана.)
 *   - Доод индекс (subscript) огт дэмжигдээгүй — бүгд дээд индекс гэж үзнэ.
 *   - Латин үсэг Кирилл үгийн төгсгөлд давхацвал (ж: "май2" — англи маягийн
 *     нэр/код) санамсаргүйгээр зэрэг болох эрсдэлтэй хэвээр.
 *   - Эдгээр edge case-үүдийг бүрэн шийдэхийн тулд бодит tokenizer хэрэгтэй —
 *     энэ heuristic зөвхөн түгээмэл docx-import алдааг л засна.
 *
 * ⚠️ ЛОГИКИЙГ ЗАСВАЛ ШАЛГА: тестийн багц нь
 *    web/src/components/MathText.powers.test.mjs — `node` -ээр шууд ажиллана.
 */
function normalizeMath(text: string): string {
  // 1) Номын цувралын нэр мэт хэмжээний тэмдэглэгээг түр далдална.
  const dims: string[] = [];
  const masked = text.replace(DIMENSION_RE, (m) => {
    dims.push(m);
    return DIM_MARK;
  });

  // 2) Зэргийг LaTeX болгоно.
  const powered = masked.replace(
    POWER_RE,
    (_m, base: string, caretExp?: string, bareDigit?: string) =>
      `$${base}^{${caretExp ?? bareDigit ?? ""}}$`,
  );

  // 3) Далдалсныг эх хэвээр нь буцаана.
  let i = 0;
  return powered.replace(new RegExp(DIM_MARK, "g"), () => dims[i++] ?? "");
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

/**
 * ХОЁР ШАТТАЙ задлалт.
 *
 * 1-р шат — `parse()` нь аль хэдийн `$…$`-д бичигдсэн LaTeX-ийг ялгана.
 * 2-р шат — үлдсэн ЭНГИЙН ТЕКСТ хэсэгт `normalizeMath()` ажиллаж, docx-оос
 *            алдагдсан зэргийг `$x^{2}$` болгоно. Тэр гаралтыг ДАХИН задалж
 *            жинхэнэ LaTeX хэсэг болгоно.
 *
 * Яагаад бүх оролтод шууд `normalizeMath` ажиллуулж болохгүй вэ: тэгвэл
 * ХЭДИЙН зөв бичигдсэн LaTeX эвдэрнэ. `\sqrt2`, `\alpha_1`, `\frac{a}{2}`
 * зэрэг дотор «үсэг + цифр» хэв маяг байгаа тул `\sqrt^{2}` гэх мэт утгагүй
 * зүйл болно. Тиймээс нормчлол ЗӨВХӨН математикийн ГАДНАХ текстэд хүрнэ.
 */
function parseWithPowers(input: string): Segment[] {
  return parse(input).flatMap((seg) => {
    if (seg.type !== "text") return [seg];
    const fixed = normalizeMath(seg.value);
    // Юу ч өөрчлөгдөөгүй бол дахин задлах шаардлагагүй (түгээмэл тохиолдол).
    return fixed === seg.value ? [seg] : parse(fixed);
  });
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

// Баше дараалан KaTeX алдаа логийг нэмээд дүрэмжүүлэх (зөвхөн dev горим / teacher view)
interface TexRenderError {
  latex: string;
  error: string;
  displayMode: boolean;
}
const texErrors: TexRenderError[] = [];

type TexRenderResult = { html: string; error?: string };

// Cэтгэл кэш: буцаалын төлөв сольсон (html + error flag)
type CacheEntry = TexRenderResult;
const renderCacheTyped = renderCache as unknown as Map<string, CacheEntry>;

function renderTex(tex: string, displayMode: boolean): TexRenderResult {
  const cacheKey = `${displayMode ? "d" : "i"}:${tex}`;
  const cached = renderCacheTyped.get(cacheKey);
  if (cached !== undefined) return cached;

  let result: TexRenderResult;
  try {
    const html = katex.renderToString(tex, katexOptions(displayMode));
    result = { html };
  } catch (err) {
    // Алдаа гарвал модулийн түвшний логт нэмэнэ (teacher view-д дүрэмжүүлэхийн тулд)
    const errorMsg = err instanceof Error ? err.message : String(err);
    texErrors.push({
      latex: tex,
      error: errorMsg,
      displayMode,
    });
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error(`KaTeX render error: "${errorMsg}" for LaTeX: "${tex}"`);
    }
    result = { html: tex, error: errorMsg }; // алдаа гарвал түүхий текстээр, гэхдээ error flag
  }

  if (renderCacheTyped.size >= RENDER_CACHE_MAX) {
    // Хамгийн эртний (LRU биш, гэхдээ Map insertion-order ашиглаж хамгийн
    // эхэнд нэмэгдсэн) бичлэгийг хасаж кэш хэт томроохоос сэргийлнэ.
    const oldestKey = renderCacheTyped.keys().next().value;
    if (oldestKey !== undefined) renderCacheTyped.delete(oldestKey);
  }
  renderCacheTyped.set(cacheKey, result);
  return result;
}

// Moduel түвшний функц: багшийн харагдацдаа алдаа байгаа эсэхийг шалга
export function hasTeXErrors(): boolean {
  return texErrors.length > 0;
}

// Модулийн түвшний алдаа авах (dev / admin tools-д зориулав)
export function getTeXErrors(): TexRenderError[] {
  return [...texErrors];
}

export default function MathText({
  children,
  className,
  showErrorInTeacherView = false,
}: {
  children: string;
  className?: string;
  /**
   * Багшийн урьдчилан харах (preview) горимд LaTeX алдаа байвал
   * анхааруулга үзүүлэх эсэх. Default false — сурагчид техник алдаа харахгүй,
   * гаж л компонент ишүүлэхгүй (текст эсвэл үгүй юмнээ).
   */
  showErrorInTeacherView?: boolean;
}) {
  const segments = useMemo(() => parseWithPowers(children ?? ""), [children]);

  // segments өөрчлөгдөөгүй бол (жш: parent дахин render хийгдэхэд) энэ
  // .map-ийг дахин ажиллуулахгүй — доторх renderTex нь кэштэй ч гэсэн
  // Map.get дуудлагыг ч давтахгүй байх нь илүү хямд.
  const rendered = useMemo(
    () =>
      segments.map((seg, i) => {
        if (seg.type === "text") {
          // Зэргийн нормчлол parseWithPowers дотор аль хэдийн хийгдсэн —
          // энд үлдсэн нь ЖИНХЭНЭ энгийн текст, хөрвүүлэх зүйлгүй.
          return { key: i, kind: "text" as const, value: seg.value, error: undefined };
        }
        const texResult = renderTex(seg.value, seg.type === "display");
        return {
          key: i,
          kind: "html" as const,
          value: texResult.html,
          error: texResult.error,
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
          <span key={seg.key}>
            {/* Багшийн урьдчилан харах дотор алдаа байвал анхааруулга харуулна */}
            {showErrorInTeacherView && seg.error && (
              <span
                className="inline-flex items-center gap-1 bg-warning/15 px-1.5 py-0.5 rounded text-warning text-xs font-medium"
                role="alert"
              >
                <AlertTriangle size={12} className="shrink-0" aria-hidden />
                LaTeX алдаа
              </span>
            )}
            {/* KaTeX-ийн гаргасан HTML-ийг шууд оруулна (найдвартай эх сурвалж:
                trust/strict/maxSize/maxExpand-аар хязгаарласан KaTeX-ийн өөрийн гаралт) */}
            <span dangerouslySetInnerHTML={{ __html: seg.value }} />
          </span>
        ),
      )}
    </span>
  );
}
