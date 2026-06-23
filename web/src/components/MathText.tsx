"use client";

import katex from "katex";
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

function renderTex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return tex; // алдаа гарвал түүхий текстээр харуулна
  }
}

export default function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = useMemo(() => parse(children ?? ""), [children]);

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        // Энгийн текст хэсэгт зэргийн нормчлол хэрэглэнэ ($…$ LaTeX-д хэрэггүй)
        if (seg.type === "text")
          return <span key={i}>{normalizeMath(seg.value)}</span>;
        const html = renderTex(seg.value, seg.type === "display");
        return (
          <span
            key={i}
            // KaTeX-ийн гаргасан HTML-ийг шууд оруулна (найдвартай эх сурвалж)
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}
