"use client";

import { ArrowRightLeft, ChevronDown, DoorOpen, ExternalLink, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ATTENDANCE_MARKS, HOMEWORK_MARKS, TONE_TEXT } from "@/components/attendance/marks";
import StudentSummary from "@/components/exams/StudentSummary";
import { LATE_RANGE_SHORT, fullDate, ubParts } from "@/components/TeacherDashboard/board/lib";
import { Meta } from "@/components/ui/Meta";
import { api, getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import { shortClass, type CoveredTest, type MakeupHistoryItem } from "./types";

const SOURCE_HINT: Record<CoveredTest["source"], string | null> = {
  CONFIRMED: null,
  PLANNED: "төлөвлөгөөгөөр",
  RECORDED: null,
};

/**
 * Сурагчийн нөхөлтийн түүх (эзэн 2026-11-08): «12-6 ангид нөхөж суусан» /
 * «406-д нөхөж хийсэн», дарахад хэзээ, хэн, ямар тест (онлайнаар өгсөн бол дүн, хариу).
 * Нөхөлт байхгүй бол юу ч зурахгүй (хоосон хэсэг нэмэхгүй). `wrap` — хэсгийн хүрээ.
 */
export default function MakeupHistory({
  studentId,
  wrap,
}: {
  studentId: string;
  wrap: (children: React.ReactNode, count: number) => React.ReactNode;
}) {
  const [items, setItems] = useState<{ id: string; list: MakeupHistoryItem[] } | null>(null);
  useEffect(() => {
    let alive = true;
    api<MakeupHistoryItem[]>(`/students/${encodeURIComponent(studentId)}/makeup-visits`)
      .then((list) => alive && setItems({ id: studentId, list }))
      .catch(() => alive && setItems({ id: studentId, list: [] }));
    return () => {
      alive = false;
    };
  }, [studentId]);
  const list = items?.id === studentId ? items.list : [];
  if (!list.length) return null;
  return wrap(
    <ul className="space-y-1.5">
      {list.map((v) => (
        <HistoryRow key={v.id} v={v} studentId={studentId} />
      ))}
    </ul>,
    list.length,
  );
}

function HistoryRow({ v, studentId }: { v: MakeupHistoryItem; studentId: string }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<string | null>(null);
  const staff = getRole() !== "STUDENT";
  const Icon = v.place.kind === "ROOM_406" ? DoorOpen : ArrowRightLeft;
  const att = v.attendance.status ? ATTENDANCE_MARKS[v.attendance.status] : null;
  const hw = v.homework.status ? HOMEWORK_MARKS[v.homework.status] : null;
  return (
    <li className="rounded-lg border border-brand-bright/40 bg-brand-bright/[0.04]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <span className="w-11 shrink-0 text-xs tabular-nums text-ink-dim">{v.date.slice(5).replace("-", ".")}</span>
        <Icon className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{v.label}</span>
          {v.tests.length > 0 && (
            <span className="block truncate text-xs text-ink-dim">{v.tests.map((t) => t.title).join(", ")}</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-2 border-t border-brand-bright/20 px-2.5 py-2 text-sm">
          <p className="text-xs text-ink-dim">
            <Meta
              items={[
                fullDate(v.date),
                `${v.teacher.name} бүртгэсэн, ${ubParts(v.createdAt).time}`,
                v.homeClassroom ? `өөрийн анги ${shortClass(v.homeClassroom.name)}` : null,
              ]}
            />
          </p>
          {(att || hw) && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {att && (
                <span className={cn("font-semibold", TONE_TEXT[att.tone])}>
                  Ирц: {att.label}
                  {v.attendance.lateRange ? `, ${LATE_RANGE_SHORT[v.attendance.lateRange]}` : ""}
                </span>
              )}
              {hw && <span className={cn("font-semibold", TONE_TEXT[hw.tone])}>Даалгавар: {hw.label}</span>}
            </p>
          )}
          {v.tests.length === 0 ? (
            <p className="text-xs text-ink-dim">
              {v.place.kind === "ROOM_406" ? "Нөхсөн сэдэв сонгоогүй" : "Тэр хичээлийн тест бүртгэгдээгүй"}
            </p>
          ) : (
            <ul className="space-y-1">
              {v.tests.map((t) => (
                <li key={t.id ?? `${t.testId}|${t.title}`}>
                  <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1">
                    {!t.testId && <NotebookPen className="size-3.5 shrink-0 text-ink-dim" aria-hidden />}
                    <span className="font-semibold text-ink">{t.title}</span>
                    {SOURCE_HINT[t.source] && <span className="text-xs text-ink-dim">{SOURCE_HINT[t.source]}</span>}
                    {t.result ? (
                      <span className="rounded-md bg-ink/[0.06] px-1.5 text-xs font-bold tabular-nums text-ink">
                        {t.result.score}/{t.result.max}
                      </span>
                    ) : (
                      t.testId && <span className="text-xs text-ink-dim">онлайнаар өгөөгүй</span>
                    )}
                    {t.testId && t.result && staff && (
                      <button
                        type="button"
                        onClick={() => setAnswers((a) => (a === t.testId ? null : t.testId))}
                        aria-expanded={answers === t.testId}
                        className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-bold text-brand-soft hover:bg-brand-bright/10"
                      >
                        {answers === t.testId ? "Хариуг хаах" : "Хариу харах"}
                      </button>
                    )}
                    {t.testId && t.result && !staff && (
                      <Link
                        href={`/app/tests/${encodeURIComponent(t.testId)}/result`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-brand-soft hover:bg-brand-bright/10"
                      >
                        Хариу харах
                        <ExternalLink className="size-3.5" aria-hidden />
                      </Link>
                    )}
                  </div>
                  {answers === t.testId && t.testId && <StudentSummary testId={t.testId} studentId={studentId} />}
                </li>
              ))}
            </ul>
          )}
          {v.comment && <p className="rounded-md bg-panel px-2 py-1.5 text-sm text-ink">{v.comment}</p>}
        </div>
      )}
    </li>
  );
}
