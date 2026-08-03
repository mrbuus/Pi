import { Clock } from "lucide-react";
import Link from "next/link";
import type { TestRow } from "./types";

/* ============================================================================
 * Тасарсан/дуусаагүй шалгалт руу шууд буцах зурвас.
 *
 * ЯАГААД: сурагч интернэт тасарсан эсвэл цонх санамсаргүй хаагдсанаас болж
 * "IN_PROGRESS" төлөвтэй сессестэй үлдэж болно. Тэр тест сэдвийн бүлэгт
 * далд (collapse хийгдсэн, эсвэл 2-р хуудсанд) байж болзошгүй тул доор
 * жагсаалтаас "хайх" шаардлагагүйгээр, ХАМГИЙН дээр том товчоор харуулна.
 * Зөвхөн сурагчийн харагдацад (багшид сесс гэж юм байхгүй).
 * ========================================================================== */
export default function ContinueBanner({ tests }: { tests: TestRow[] }) {
  const inProgress = tests.filter((t) => t.sessionStatus === "IN_PROGRESS");
  if (inProgress.length === 0) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <Clock size={28} className="shrink-0 text-warning" aria-hidden />
        <div>
          <p className="text-sm font-extrabold text-ink">
            {inProgress.length === 1
              ? "Дуусаагүй шалгалт байна"
              : `${inProgress.length} дуусаагүй шалгалт байна`}
          </p>
          <p className="truncate text-xs text-ink-dim">
            {inProgress
              .map((t) => t.title)
              .slice(0, 3)
              .join(" · ")}
            {inProgress.length > 3 ? "…" : ""} — таны хариултууд хадгалагдсан, үргэлжлүүлж болно
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        {inProgress.map((t) => (
          <Link
            key={t.id}
            href={`/app/tests/${t.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-warning px-4 text-sm font-bold text-on-warning transition hover:opacity-90"
          >
            Үргэлжлүүлэх{inProgress.length > 1 ? `: ${t.title}` : ""}
          </Link>
        ))}
      </div>
    </div>
  );
}
