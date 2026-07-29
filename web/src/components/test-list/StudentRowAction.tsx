import { Check, Hourglass, NotebookPen, Play } from "lucide-react";
import Link from "next/link";
import type { TestRow } from "./types";

/* ============================================================================
 * Сурагчийн нэг тестийн мөрөнд харагдах төлөв+үйлдэл: өгөөгүй / хийж эхэлсэн /
 * дуусcан + оноо. ӨНГӨӨӨС ГАДНА үргэлж дүрс+текстээр ялгана (улаан-ногоон
 * харааны бэрхшээлтэй ~8% хөвгүүдэд ч тодорхой байх учиртай).
 * ========================================================================== */
export default function StudentRowAction({ test }: { test: TestRow }) {
  const done = (test.results?.length ?? 0) > 0;

  if (done) {
    return (
      <Link
        href={`/app/tests/${test.id}`}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Өгсөн · {test.results![0].totalScore}/
        {test.results![0].maxScore}
      </Link>
    );
  }
  if (test.gradingMode === "MANUAL") {
    return (
      <span className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-line/30 px-3 py-1.5 text-xs text-ink-dim">
        <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" /> Багш дүгнэнэ
      </span>
    );
  }
  if (test.sessionStatus === "IN_PROGRESS") {
    return (
      <Link
        href={`/app/tests/${test.id}`}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-on-warning"
      >
        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" /> Үргэлжлүүлэх
      </Link>
    );
  }
  return (
    <Link
      href={`/app/tests/${test.id}`}
      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-on-brand"
    >
      <Play className="h-3.5 w-3.5" aria-hidden="true" /> Эхлэх
    </Link>
  );
}
