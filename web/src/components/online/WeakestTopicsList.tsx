import { Dot } from "@/components/ui/Meta";
import { WeakTagRow } from "./types";

export default function WeakestTopicsList({ tags }: { tags: WeakTagRow[] }) {
  const weakest = tags.slice(0, 8);
  if (weakest.length === 0) {
    return <p className="text-sm text-ink-dim">Одоогоор дата хангалтгүй байна.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {weakest.map((t) => (
        <li
          key={t.tag}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
          title={`${t.attempts} бодлого`}
        >
          <span className="font-semibold text-ink">{t.tag}</span>
          <Dot />
          <span className="text-ink-dim">{t.successRate}%</span>
        </li>
      ))}
    </ul>
  );
}
