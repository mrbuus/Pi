"use client";

import Link from "next/link";
import { ChevronRight, ClipboardCheck, Clock, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { cleanTitle } from "@/lib/studentTitle";
import { dayKey, dayShort, monthTitle, useApi } from "./lib";
import type { HubTestListItem } from "./types";

/** «Тестүүд» таб: анги хийсэн тестүүд, хайлттай, сараар бүлэглэсэн */
export default function TestsTab() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQ(input.trim()), 300);
    return () => window.clearTimeout(t);
  }, [input]);

  const list = useApi<HubTestListItem[]>(`/student-hub/tests${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  const groups = useMemo(() => {
    const out: { month: string; items: HubTestListItem[] }[] = [];
    for (const t of list.data ?? []) {
      const m = dayKey(t.date).slice(0, 7);
      const last = out[out.length - 1];
      if (last?.month === m) last.items.push(t);
      else out.push({ month: m, items: [t] });
    }
    return out;
  }, [list.data]);
  const multiClass = new Set(list.data?.map((t) => t.classroomName)).size > 1;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Тестийн нэрээр хайх"
          aria-label="Тестийн нэрээр хайх"
          className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-11 text-sm text-ink placeholder:text-ink-dim focus-visible:border-brand-bright"
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label="Хайлт цэвэрлэх"
            className="absolute right-0 top-0 inline-flex size-11 items-center justify-center text-ink-dim hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {list.status === "error" ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.status === "loading" ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5 px-3 py-3">
              <div className="skeleton h-3.5 w-3/5 rounded" />
              <div className="skeleton h-3 w-2/5 rounded" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={q ? "Тест олдсонгүй" : "Анги хийсэн тест алга"}
          hint={q ? "Өөр үгээр хайж үзнэ үү" : "Ангид тест хийсний маргааш энд нээгдэнэ"}
        />
      ) : (
        groups.map((g) => (
          <section key={g.month} aria-labelledby={`tests-${g.month}`}>
            <h2 id={`tests-${g.month}`} className="mb-1.5 px-1 text-xs font-bold text-ink-dim">
              {monthTitle(g.month)}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface elev-1">
              {g.items.map((t, i) => (
                <li key={`${t.testId ?? "m"}-${t.date}-${i}`}>
                  <TestItem test={t} showClass={multiClass} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function TestItem({ test, showClass }: { test: HubTestListItem; showClass: boolean }) {
  const body = (
    <span className="min-w-0 flex-1">
      <span className="cyrillic-tight block truncate font-semibold text-ink">{cleanTitle(test.title, test.variant, test.title)}</span>
      <Meta
        className="mt-0.5 text-xs text-ink-dim"
        items={[
          dayShort(test.date),
          test.variant ? `${test.variant} хувилбар` : null,
          test.problemCount ? `${test.problemCount} бодлого` : null,
          showClass ? test.classroomName : null,
        ]}
      />
    </span>
  );
  if (test.testId && test.open) {
    return (
      <Link
        href={`/app/my-class/tests/${encodeURIComponent(test.testId)}`}
        className="row-interactive flex min-h-14 items-center gap-3 px-3 py-2.5"
      >
        {body}
        <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
      </Link>
    );
  }
  return (
    <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">
      {body}
      {test.testId && !test.open && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink-dim">
          <Clock className="size-3.5" aria-hidden />
          Маргааш нээгдэнэ
        </span>
      )}
    </div>
  );
}
