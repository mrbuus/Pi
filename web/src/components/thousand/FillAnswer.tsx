import { splitFillAnswer } from "./format";

/** Нөхөх бодлогын хариуг [a]=3 [b]=5 гэх мэт нүдээр харуулна. */
export default function FillAnswer({
  statement,
  value,
  tone = "neutral",
}: {
  statement: string | null | undefined;
  value: unknown;
  tone?: "neutral" | "success" | "error";
}) {
  const cells = splitFillAnswer(statement, value);
  if (!cells) return <span className="text-ink-dim">Хариулаагүй</span>;
  const box =
    tone === "success"
      ? "border-success/40 bg-success/10"
      : tone === "error"
        ? "border-error/40 bg-error/10"
        : "border-line bg-panel";
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {cells.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-sm">
          {c.letter && <span className="font-mono text-ink-dim">{c.letter}</span>}
          <span className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border px-1.5 font-semibold text-ink ${box}`}>
            {c.value || " "}
          </span>
        </span>
      ))}
    </span>
  );
}
