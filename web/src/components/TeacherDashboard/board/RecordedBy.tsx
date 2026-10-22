"use client";

import { BookCheck, UserRoundCheck, type LucideIcon } from "lucide-react";
import { recordedAtLabel, type RecordedBy, type Recorder } from "./lib";

/** Нэг мөрөнд хэт олон нэр бичихгүй — үлдсэнийг «+2» */
const MAX_NAMES = 3;

function Group({ icon: Icon, label, list, date }: { icon: LucideIcon; label: string; list: Recorder[]; date: string }) {
  if (!list.length) return null;
  const shown = list.slice(0, MAX_NAMES);
  const rest = list.length - shown.length;
  const full = list.map((r) => `${r.name}${r.at ? ` ${recordedAtLabel(r.at, date)}` : ""} (${r.count} сурагч)`).join(", ");
  return (
    <li className="flex min-w-0 items-start gap-1.5" title={`${label}: ${full}`}>
      <Icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0">
        <span>{label}: </span>
        {shown.map((r, i) => (
          <span key={r.id} className="whitespace-nowrap">
            {i > 0 && ", "}
            <b className="font-semibold text-ink">{r.name}</b>
            {r.at && <span className="tabular-nums"> {recordedAtLabel(r.at, date)}</span>}
          </span>
        ))}
        {rest > 0 && <span className="whitespace-nowrap">, +{rest}</span>}
      </span>
    </li>
  );
}

/**
 * Хэн ирц авсан, хэн даалгавар шалгасан (эзэн 2026-10-22): «Ирц: Б. Марал-Эрдэнэ 15:32»,
 * «Даалгавар: …» — сүүлд тэмдэглэсэн багш эхэнд, олон багш байж болно. Тэмдэглэгээгүй бол юу ч зурахгүй.
 */
export default function RecordedByLine({ data, date, homework }: { data: RecordedBy | null; date: string; homework: boolean }) {
  if (!data || (!data.attendance.length && !(homework && data.homework.length))) return null;
  return (
    <ul aria-label="Хэн тэмдэглэсэн" className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-ink-dim">
      <Group icon={UserRoundCheck} label="Ирц" list={data.attendance} date={date} />
      {homework && <Group icon={BookCheck} label="Даалгавар" list={data.homework} date={date} />}
    </ul>
  );
}
