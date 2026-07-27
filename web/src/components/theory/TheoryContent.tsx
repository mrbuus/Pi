import { useMemo } from "react";
import MathText from "@/components/MathText";
import { fileUrl } from "@/lib/api";

/**
 * Онолын блокийн markdown-г СУРАГЧИД ХАРАГДАХТАЙ ЯГ АДИЛААР рендерлэнэ.
 *
 * Багш theory-editor дээр бичсэн зүйлээ энэ компонентоор урьдчилан харна
 * (LIVE PREVIEW), сурагчийн хичээлийн дэлгэц ч ЯГ ЭНЭ компонентыг ашиглах
 * ёстой — өөр parser бичвэл хоёр тал ондоо харагдах эрсдэлтэй тул шинэ
 * theory-с харах дэлгэц зохиох агент ЭНД байгаа TheoryContent-ийг import
 * хийж ашиглана уу (дахин бичихгүй).
 *
 * Дэмждэг markdown дэд олонлог (тестийн зорилготой heavy math ихтэй тул
 * зориудаар ЖИЖИГ, ойлгомжтой тэмдэглэгээ л сонгосон):
 *   # / ## / ### гарчиг
 *   **тод** текст
 *   - эсвэл * жагсаалт (unordered), 1. 2. 3. дугаарласан жагсаалт (ordered)
 *   ![тайлбар](зурагKey) — тусдаа мөр дээр бичигдсэн зураг (upload товч
 *     үүнийг автоматаар оруулдаг — гараар бичихдээ мөрийн эхэн/төгсгөлд
 *     өөр текст байхгүй байх ёстой)
 *   $...$ / $$...$$ — MathText-ээр рендерлэгдэх LaTeX (KaTeX)
 *
 * Үлдсэн бүх мөр энгийн параграф гэж үзэгдэнэ (хоосон мөрөөр тусгаарлана).
 */

const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+\.\s+(.*)$/;
const BOLD_RE = /\*\*(.+?)\*\*/g;

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; alt: string; imageKey: string }
  | { type: "paragraph"; text: string };

function parseMarkdown(md: string): Block[] {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length > 0) {
      blocks.push({ type: "paragraph", text: paraBuf.join("\n") });
      paraBuf = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushPara();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i++;
      continue;
    }

    const image = IMAGE_LINE_RE.exec(trimmed);
    if (image) {
      flushPara();
      blocks.push({ type: "image", alt: image[1], imageKey: image[2] });
      i++;
      continue;
    }

    const ol = OL_RE.exec(line);
    const ul = UL_RE.exec(line);
    if (ol || ul) {
      flushPara();
      const ordered = !!ol;
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const om = OL_RE.exec(l);
        const um = UL_RE.exec(l);
        if (ordered && om) {
          items.push(om[1]);
          i++;
          continue;
        }
        if (!ordered && um) {
          items.push(um[1]);
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    paraBuf.push(line);
    i++;
  }
  flushPara();
  return blocks;
}

// **тод** ба $math$-ыг хосолсон нэг мөр текстийг рендерлэнэ
function InlineText({ text }: { text: string }) {
  const parts: { bold: boolean; text: string }[] = [];
  let last = 0;
  // matchAll нь дамжуулсан regex-ийн lastIndex-ийг ӨӨРЧЛӨХГҮЙ (дотооддоо
  // хуулбар үүсгэдэг) тул модуль-түвшний BOLD_RE-г хэд хэдэн компонент зэрэг
  // render хийхэд ч аюулгүй — .exec()-ийн g-flag lastIndex мутаци шиг race
  // condition-той биш.
  for (const m of text.matchAll(BOLD_RE)) {
    const index = m.index ?? 0;
    if (index > last) parts.push({ bold: false, text: text.slice(last, index) });
    parts.push({ bold: true, text: m[1] });
    last = index + m[0].length;
  }
  if (last < text.length) parts.push({ bold: false, text: text.slice(last) });
  if (parts.length === 0) return null;

  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <strong key={i}>
            <MathText>{p.text}</MathText>
          </strong>
        ) : (
          <MathText key={i}>{p.text}</MathText>
        ),
      )}
    </>
  );
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: "mt-5 mb-2 text-xl font-extrabold text-ink first:mt-0",
  2: "mt-4 mb-2 text-lg font-bold text-ink first:mt-0",
  3: "mt-3 mb-1.5 text-base font-bold text-ink first:mt-0",
};

export default function TheoryContent({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  if (!markdown?.trim()) return null;

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const Tag = (b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4") as
            | "h2"
            | "h3"
            | "h4";
          return (
            <Tag key={i} className={HEADING_CLASS[b.level]}>
              <InlineText text={b.text} />
            </Tag>
          );
        }
        if (b.type === "list") {
          const ListTag = b.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={i}
              className={`my-2 ml-5 space-y-1 text-ink ${
                b.ordered ? "list-decimal" : "list-disc"
              }`}
            >
              {b.items.map((item, j) => (
                <li key={j}>
                  <InlineText text={item} />
                </li>
              ))}
            </ListTag>
          );
        }
        if (b.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={fileUrl(b.imageKey)}
              alt={b.alt}
              className="my-3 max-w-full rounded-lg border border-line"
            />
          );
        }
        return (
          <p key={i} className="my-2 text-ink" style={{ whiteSpace: "pre-wrap" }}>
            <InlineText text={b.text} />
          </p>
        );
      })}
    </div>
  );
}

// --- Зургийн markdown мөрийг удирдах туслах функцууд ---
// Editor-т upload товч ашиглан ![alt](key) мөрийг оруулах/хасахад хэрэглэнэ,
// ингэснээр агуулга (content) БОЛОН imageKeys массив хоёр АЛЬ ХОЁУЛАА
// нэг эх сурвалжийн (upload event) дараа зэрэг шинэчлэгдэж, синк хэвээр үлдэнэ.

export function extractImageAlt(content: string, imageKey: string): string {
  const lines = (content ?? "").split("\n");
  for (const line of lines) {
    const m = IMAGE_LINE_RE.exec(line.trim());
    if (m && m[2] === imageKey) return m[1];
  }
  return "";
}

export function insertImageMarkdown(
  content: string,
  alt: string,
  imageKey: string,
): string {
  const trimmed = (content ?? "").replace(/\s+$/, "");
  const line = `![${alt}](${imageKey})`;
  return trimmed ? `${trimmed}\n\n${line}\n` : `${line}\n`;
}

export function removeImageMarkdown(content: string, imageKey: string): string {
  const kept = (content ?? "")
    .split("\n")
    .filter((line) => {
      const m = IMAGE_LINE_RE.exec(line.trim());
      return !(m && m[2] === imageKey);
    })
    .join("\n");
  // Зураг хассанаас үүссэн 2-оос дээш дараалсан хоосон мөрийг цэвэрлэнэ
  return kept.replace(/\n{3,}/g, "\n\n");
}
