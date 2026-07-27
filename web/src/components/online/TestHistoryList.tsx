import { TestHistoryRow } from "./types";
import { formatDate } from "./format";
import { testTypeLabel } from "./selfState";

export default function TestHistoryList({ tests }: { tests: TestHistoryRow[] }) {
  if (tests.length === 0) {
    return <p className="text-sm text-ink-dim">Тест өгч байгаагүй байна.</p>;
  }
  return (
    <ul className="space-y-2">
      {tests.map((t) => {
        const pct = t.maxScore > 0 ? Math.round((t.totalScore / t.maxScore) * 100) : 0;
        return (
          <li
            key={`${t.testId}-${t.createdAt}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{t.title}</p>
              <p className="text-xs text-ink-dim">
                {testTypeLabel(t.type)} · {formatDate(t.createdAt)}
              </p>
            </div>
            <p className="shrink-0 font-bold text-ink">
              {t.totalScore}/{t.maxScore}{" "}
              <span className="text-sm font-normal text-ink-dim">({pct}%)</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
