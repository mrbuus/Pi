import Link from "next/link";
import type { TestRow } from "./types";

/* ============================================================================
 * Багшийн харагдацад нэг тестийн мөрөнд харуулах нэмэлт мэдээлэл: хэдэн
 * сурагч өгсөн (TestResult нь testId+studentId дээр @@unique тул
 * _count.results = ДАВХАРДААГҮЙ сурагчийн тоо), мөн дүн рүү шууд холбоос.
 *
 * ДУНДАЖ ОНОО: /tests жагсаалтын API нь одоогоор нийт оноог (totalScore/
 * maxScore) буцаадаггүй, зөвхөн тоог (_count) буцаадаг тул энд найдвартай
 * тооцоолж чадахгүй — жагсаалт бүрд /tests/:id/results дуудвал N+1 асуулга
 * үүсгэж гүйцэтгэлд сөрөг нөлөөтэй тул орхив. Backend дунджийг шууд буцаах
 * болвол энд харуулж болно.
 * ========================================================================== */
export default function TeacherRowMeta({ test }: { test: TestRow }) {
  const takenCount = test._count.results;
  return (
    <div className="flex shrink-0 items-center gap-3">
      {typeof takenCount === "number" && (
        <span
          title="Өгсөн сурагчийн тоо"
          className="hidden items-center gap-1 text-xs text-ink-dim sm:inline-flex"
        >
          <span aria-hidden="true">👥</span> {takenCount} сурагч
        </span>
      )}
      <Link
        href={`/app/tests/${test.id}/results`}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand"
      >
        Дүн харах
      </Link>
    </div>
  );
}
