"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, CircleCheck, Lock, Play, Repeat2, RotateCcw } from "lucide-react";
import { dayLabel } from "@/components/makeup/types";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { cleanTitle, solveHref } from "./lib";
import type { HwRedoDay, HwRedoItem, HwRedoResponse, HwRedoRound } from "./types";

/**
 * Дахин бодох (эзэн 2026-11-03): хичээлийг багш баталж, хичээлээс хойш 2 хичээл өнгөрсний дараа
 * ангид бодсон А, гэртээ бодсон Б тестийг НЭГ удаа дахин бодно. Анхны дүн хэвээр, дахин бодсон
 * дүн тусдаа хадгалагдана — сурагч бүх оролдлогоо эндээс харна, багш «Онлайн» дэлгэрэнгүйгээс харна.
 */

const KIND_LABEL: Record<HwRedoItem["kind"], string> = { CLASS: "Ангид бодсон", HOME: "Гэртээ бодсон" };

const scoreText = (r: HwRedoRound) => (r.score ? `${r.score.correct}/${r.score.total}` : null);

function RoundChips({ rounds }: { rounds: HwRedoRound[] }) {
  const first = rounds.find((r) => r.round === 1 && r.status === "SUBMITTED");
  const again = rounds.find((r) => r.round > 1 && r.status === "SUBMITTED");
  if (!first && !again) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {first && (
        <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-dim">
          Анх {scoreText(first)}
        </span>
      )}
      {again && (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-success">
          <CircleCheck className="size-3" aria-hidden />
          Дахин {scoreText(again)}
        </span>
      )}
    </span>
  );
}

function Action({ rounds, opened, locked }: { rounds: HwRedoRound[]; opened: boolean; locked: boolean }) {
  const redo = rounds.find((r) => r.round > 1);
  if (!opened) return null;
  if (locked && redo?.status !== "SUBMITTED")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-dim">
        <Lock className="size-3.5" aria-hidden />
        Түр хаалттай
      </span>
    );
  if (redo?.status === "SUBMITTED")
    return <span className="shrink-0 text-xs font-semibold text-ink-dim">Харах</span>;
  if (redo?.status === "IN_PROGRESS")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-bright/15 px-2.5 py-1 text-xs font-bold text-brand-soft">
        <RotateCcw className="size-3.5" aria-hidden />
        Үргэлжлүүлэх
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-bright px-2.5 py-1 text-xs font-bold text-on-brand">
      <Play className="size-3.5" aria-hidden />
      Дахин бодох
    </span>
  );
}

function ItemRow({ day, item }: { day: HwRedoDay; item: HwRedoItem }) {
  const title = cleanTitle(item.title, item.variantLabel);
  // Бусад ангид бодогдох хүлээгдэж байгаа тест түр хаалттай (хариу задрахаас сэргийлнэ); илгээсэн дүнг харж болно
  const canOpen = day.opened && (!item.locked || item.rounds.some((r) => r.round > 1 && r.status === "SUBMITTED"));
  const body = (
    <>
      <Repeat2 className={cn("size-5 shrink-0", day.opened ? "text-brand-soft" : "text-ink-dim")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="cyrillic-tight block truncate font-semibold text-ink">{title}</span>
        <Meta
          className="mt-0.5 text-xs text-ink-dim"
          items={[item.variantLabel ? `${item.variantLabel} хувилбар` : null, KIND_LABEL[item.kind], `${item.problemCount} бодлого`, item.timeLimitMin ? `${item.timeLimitMin} мин` : null]}
        />
        <RoundChips rounds={item.rounds} />
      </span>
      <Action rounds={item.rounds} opened={day.opened} locked={item.locked} />
      {canOpen && <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />}
    </>
  );
  return (
    <li>
      {canOpen ? (
        <Link
          href={solveHref(item.testId, day.date, day.classroomId, true)}
          className="flex min-h-14 items-center gap-3 py-2.5 transition hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-brand-bright"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-h-14 items-center gap-3 py-2.5 opacity-70">{body}</div>
      )}
    </li>
  );
}

function DayCard({ day }: { day: HwRedoDay }) {
  return (
    <article className="space-y-2 rounded-xl border border-line bg-surface p-4 elev-1 sm:p-5">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="cyrillic-heading font-bold text-ink">{dayLabel(day.date)}</h3>
          {!day.opened && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-dim">
              <Lock className="size-3.5" aria-hidden />
              Нээгдэхэд {day.lessonsLeft} хичээл үлдсэн
            </span>
          )}
        </div>
        {day.topic && <p className="cyrillic-tight font-semibold text-ink">{day.topic}</p>}
        <p className="text-sm text-ink-dim">{day.classroomName}</p>
      </header>
      <ul className="divide-y divide-line">
        {day.items.map((it) => (
          <ItemRow key={`${it.kind}-${it.testId}`} day={day} item={it} />
        ))}
      </ul>
    </article>
  );
}

export default function HomeworkRedo() {
  const [data, setData] = useState<HwRedoResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<HwRedoResponse>("/homework/redo")
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data?.days.length) return null;
  // Нээгдсэн нь эхэнд (шинэ нь дээр), хаалттай нь дараа нь
  const days = [...data.days].sort((a, b) => Number(b.opened) - Number(a.opened) || b.date.localeCompare(a.date));
  return (
    <section aria-labelledby="redo-title" className="mb-6">
      <h2 id="redo-title" className="text-sm font-semibold text-ink-dim">
        Дахин бодох
      </h2>
      <p className="mb-2 mt-0.5 text-sm text-ink-dim">
        Хичээлээс хойш {data.lessonsToOpen} хичээл өнгөрсний дараа А, Б тестээ нэг удаа дахин бодно
      </p>
      <div className="space-y-3">
        {days.map((d) => (
          <DayCard key={`${d.date}-${d.classroomId}`} day={d} />
        ))}
      </div>
    </section>
  );
}
