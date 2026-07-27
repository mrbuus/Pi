import TestRowItem from "./TestRowItem";
import { bookColor, type GroupRow } from "./types";

export default function TopicGroup({
  topic,
  rows,
  expanded,
  isTeacher,
  onToggle,
}: {
  topic: string;
  rows: GroupRow[];
  expanded: boolean;
  isTeacher: boolean;
  onToggle: () => void;
}) {
  const doneCount = rows.filter((r) => (r.row.results?.length ?? 0) > 0).length;
  // Номын өнгө — сэдвийн бүх тест нэг номд харьяалагддаг (Шийдвэр В)
  const book = bookColor(rows[0]?.row.chapter?.book?.code);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-surface ${book ? `border-l-4 ${book.bar}` : ""}`}
    >
      {/* Сэдвийн толгой — дарж задлана */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-line/10"
      >
        <span
          aria-hidden="true"
          className={`text-xs text-ink-dim transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="min-w-0 flex-1 truncate font-bold text-ink">{topic}</span>
        {book && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${book.chip}`}>
            {book.key}
          </span>
        )}
        {!isTeacher && doneCount > 0 && (
          <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-xs text-success">
            {doneCount}/{rows.length} өгсөн
          </span>
        )}
        <span className="shrink-0 text-xs text-ink-dim">{rows.length} тест</span>
      </button>

      {/* Тестүүд — 1,2,3… дарааллаараа */}
      {expanded && (
        <div className="border-t border-line">
          {rows.map(({ row: t, num }) => (
            <TestRowItem key={t.id} test={t} num={num} isTeacher={isTeacher} />
          ))}
        </div>
      )}
    </div>
  );
}
