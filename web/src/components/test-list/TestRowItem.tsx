import { Dot, Meta } from "@/components/ui/Meta";
import StudentRowAction from "./StudentRowAction";
import TeacherRowMeta from "./TeacherRowMeta";
import type { TestRow } from "./types";

export default function TestRowItem({
  test,
  num,
  isTeacher,
}: {
  test: TestRow;
  num: number | null;
  isTeacher: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-sm font-bold text-brand-soft">
        {num ?? <Dot />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-ink">
          {num !== null ? `Тест ${num}` : test.title}
          {/* А/Б хувилбар — багшид ХОЁУЛАНГ нь тодорхой пилл-ээр ялгаж
              харуулна (Дутагдал §1: сурагчид ЗӨВХӨН нэгийг харна). */}
          {test.variantLabel && isTeacher && (
            <span className="rounded-full bg-info/15 px-2 py-0.5 text-[11px] font-bold text-info">
              Хувилбар {test.variantLabel}
            </span>
          )}
        </p>
        <p className="text-xs text-ink-dim">
          <Meta
            items={[
              `${test._count.problems} бодлого`,
              test.timeLimitMin ? `${test.timeLimitMin} мин` : null,
            ]}
          />
        </p>
      </div>
      {isTeacher ? <TeacherRowMeta test={test} /> : <StudentRowAction test={test} />}
    </div>
  );
}
