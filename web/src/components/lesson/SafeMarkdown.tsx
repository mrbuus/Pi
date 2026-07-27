"use client";

import { Fragment, type ReactNode } from "react";
import MathText from "@/components/MathText";

/**
 * TheoryBlock.content-ийг (багшийн бичсэн markdown) АЮУЛГҮЙ рендерлэнэ.
 *
 * АЮУЛГҮЙ БАЙДАЛ (SECURITY CRITICAL): энэ бол сурагч бүрд харагдах багшийн
 * бичвэр — хагас-итгэмжлэгдсэн (semi-trusted) эх сурвалж. Иймд:
 *
 *   1) ХЭЗЭЭ Ч `dangerouslySetInnerHTML`-ээр markdown→HTML хөрвүүлээгүй.
 *      Энд бичсэн parser нь markdown-ыг ШУУД REACT ELEMENT мод болгодог —
 *      `<script>`, `<img onerror>`, `<a href="javascript:">` мэт дурын HTML
 *      огт дамжуулах зам (raw-HTML passthrough) байхгүй тул stored-XSS
 *      боломжгүй. Гадаад markdown сан (react-markdown, marked г.м.) нэмээгүй —
 *      package.json-д алга байсан бөгөөд шинэ dependency нэмэхээс илүү, энгийн
 *      дэд олонлог (heading/bold/italic/list/link/code/blockquote) хатуу гараар
 *      бичих нь аудитлахад хамгийн хялбар бөгөөд rehype-sanitize зэрэг нэмэлт
 *      сангийн тохиргоо алдах эрсдэлээс сэргийлнэ.
 *   2) Холбоос (`[text](url)`) — ЗӨВХӨН http(s):// эхэлсэн URL зөвшөөрнө.
 *      `javascript:`, `data:`, `vbscript:` гэх мэт protocol-ыг энгийн текст
 *      болгож үлдээнэ (холбоос болгохгүй) — MathText-ийн `\href`/`\url`
 *      trust-шалгалттай ижил зарчим.
 *   3) Математик ($...$ / $$...$$) — аль хэдийн хатуулаг тохиргоотой
 *      (trust/strict/maxSize/maxExpand) <MathText>-ээр дамжуулна, KaTeX-ийг
 *      дахин бичээгүй.
 *   4) Зураг (imageKeys) энэ компонентод ОРОХГҮЙ — тусад нь TheoryImages
 *      компонент fileUrl()-ээр рендерлэнэ (доор ашиглагдана), markdown доторх
 *      `![]()` зурган синтакс энд санаатайгаар ДЭМЖИГДЭЭГҮЙ (зөвшөөрөгдөөгүй
 *      эх сурвалжаас зураг ачаалахаас сэргийлнэ).
 */

// ---- Inline parse (нэг мөр доторх bold/italic/code/link/text) --------------

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "link"; value: string; href: string };

// Зөвхөн http(s) холбоосыг "холбоос" болгоно — бусдыг энгийн текстээр үлдээнэ
function isSafeHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Дараалал чухал: холбоос → bold(**) → italic(*/_) → inline code(`) → энгийн текст
  const regex =
    /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ kind: "text", value: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      // [text](href)
      const href = match[2];
      if (isSafeHref(href)) {
        tokens.push({ kind: "link", value: match[1], href });
      } else {
        // Аюулгүй бус protocol — холбоос болгохгүй, харагдах текстийг л үлдээнэ
        tokens.push({ kind: "text", value: match[1] });
      }
    } else if (match[3] !== undefined || match[4] !== undefined) {
      tokens.push({ kind: "bold", value: match[3] ?? match[4] });
    } else if (match[5] !== undefined || match[6] !== undefined) {
      tokens.push({ kind: "italic", value: match[5] ?? match[6] });
    } else if (match[7] !== undefined) {
      tokens.push({ kind: "code", value: match[7] });
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    tokens.push({ kind: "text", value: text.slice(last) });
  }
  return tokens;
}

function renderInline(text: string, keyPrefix: string): ReactNode {
  const tokens = parseInline(text);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (tok.kind) {
      case "bold":
        return (
          <strong key={key}>
            <MathText>{tok.value}</MathText>
          </strong>
        );
      case "italic":
        return (
          <em key={key}>
            <MathText>{tok.value}</MathText>
          </em>
        );
      case "code":
        // Inline code-ийг MathText-ээр дамжуулахгүй — товруу LaTeX/код
        // хольж эвдэхээс сэргийлж, монофонт текстээр шууд харуулна.
        return (
          <code
            key={key}
            className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {tok.value}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={tok.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-brand underline underline-offset-2 hover:text-brand-bright"
          >
            {tok.value}
          </a>
        );
      case "text":
      default:
        return <MathText key={key}>{tok.value}</MathText>;
    }
  });
}

// ---- Block parse (мөр бүрийг heading/list/blockquote/paragraph болгоно) ----

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "hr" }
  | { kind: "p"; text: string };

function parseBlocks(markdown: string): Block[] {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let paragraphBuf: string[] = [];

  function flushParagraph() {
    if (paragraphBuf.length > 0) {
      blocks.push({ kind: "p", text: paragraphBuf.join(" ").trim() });
      paragraphBuf = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    paragraphBuf.push(trimmed);
    i++;
  }
  flushParagraph();
  return blocks;
}

export default function SafeMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        const key = `b-${idx}`;
        switch (block.kind) {
          case "heading": {
            const cls =
              block.level === 1
                ? "text-xl font-extrabold"
                : block.level === 2
                  ? "text-lg font-bold"
                  : "text-base font-bold";
            const Tag = (`h${block.level + 1}` as unknown) as "h2" | "h3" | "h4";
            return (
              <Tag key={key} className={`mt-5 mb-2 first:mt-0 ${cls}`}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case "ul":
            return (
              <ul key={key} className="my-3 list-disc space-y-1 pl-5 text-[16px]">
                {block.items.map((item, i2) => (
                  <li key={`${key}-${i2}`}>{renderInline(item, `${key}-${i2}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-3 list-decimal space-y-1 pl-5 text-[16px]">
                {block.items.map((item, i2) => (
                  <li key={`${key}-${i2}`}>{renderInline(item, `${key}-${i2}`)}</li>
                ))}
              </ol>
            );
          case "blockquote":
            return (
              <blockquote
                key={key}
                className="my-3 border-l-4 border-brand-bright/40 pl-4 text-ink-dim italic"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="my-5 border-line" />;
          case "p":
          default:
            return (
              <p key={key} className="my-3 text-[16px] leading-[1.6] first:mt-0">
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}

export function TheoryImages({
  urls,
  alt,
}: {
  urls: string[];
  alt: string;
}) {
  if (urls.length === 0) return null;
  return (
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      {urls.map((url, i) => (
        <Fragment key={url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={urls.length > 1 ? `${alt} — зураг ${i + 1}` : alt}
            className="w-full rounded-xl border border-line object-contain"
            loading="lazy"
          />
        </Fragment>
      ))}
    </div>
  );
}
