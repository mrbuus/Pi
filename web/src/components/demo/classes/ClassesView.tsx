"use client";

import { CalendarDays, ChevronRight, DoorOpen, Search, School, UserRound, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { CLASSES, teacherById, type Branch } from "../world";
import { AttRate, HwRate, Legend, LegendItem, RiskDot, Segmented } from "./common";
import { roomsOf, scheduleSummary } from "./format";
import { classStat, WINDOW_DAYS, type ClassStat } from "./stats";

type BranchFilter = "" | Branch;

const BRANCHES: Branch[] = ["Баруун 4", "Зүүн 4"];

function StatCell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-base leading-6">{children}</div>
      <div className="cyrillic-tight text-[11px] leading-tight text-ink-dim">{caption}</div>
    </div>
  );
}

function MiniBar({ value }: { value: number | null }) {
  return (
    <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-ink/10">
      {value !== null && <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${value}%` }} />}
    </span>
  );
}

function ClassCard({ stat }: { stat: ClassStat }) {
  const { cls } = stat;
  const lead = teacherById(cls.leadId);
  const assistant = teacherById(cls.assistantId);
  return (
    <Link
      href={`/demo/classes/${cls.id}`}
      prefetch={false}
      className="chunky chunky-press flex h-full flex-col p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="cyrillic-heading min-w-0 truncate text-xl font-extrabold text-ink">{cls.label}</h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-dim">
          <Users className="size-4" aria-hidden />
          {cls.students.length} сурагч
          <ChevronRight className="-mr-1 size-4" aria-hidden />
        </span>
      </div>

      <div className="mb-3 mt-2 space-y-1 text-sm">
        <p className="flex items-start gap-2 text-ink">
          <UserRound className="mt-0.5 size-4 shrink-0 text-ink-dim" aria-hidden />
          <span className="min-w-0">
            <span className="font-medium">{lead?.name}</span>
            {assistant && <span className="text-ink-dim">, {assistant.name} (туслах)</span>}
          </span>
        </p>
        <p className="flex items-start gap-2 text-ink-dim">
          <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
          {scheduleSummary(cls)}
        </p>
        <p className="flex items-start gap-2 text-ink-dim">
          <DoorOpen className="mt-0.5 size-4 shrink-0" aria-hidden />
          Танхим {roomsOf(cls)}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-4 gap-2 border-t border-line pt-3">
        <StatCell caption="Ирц">
          <AttRate value={stat.att} />
          <MiniBar value={stat.att} />
        </StatCell>
        <StatCell caption="Даалгавар">
          <HwRate value={stat.hw} />
          <MiniBar value={stat.hw} />
        </StatCell>
        <StatCell caption="Асуудалтай">
          {stat.risk > 0 ? (
            <span className="flex h-6 items-center gap-1.5 font-semibold tabular-nums text-error">
              <RiskDot />
              {stat.risk}
            </span>
          ) : (
            <span className="flex h-6 items-center font-semibold tabular-nums text-ink-dim">0</span>
          )}
          <span aria-hidden className="mt-1 block h-1" />
        </StatCell>
        <StatCell caption="Төлбөр дутуу">
          <span className={cn("flex h-6 items-center gap-1.5 font-semibold tabular-nums", stat.unpaid > 0 ? "text-ink" : "text-ink-dim")}>
            <Wallet className="size-4 text-ink-dim" aria-hidden />
            {stat.unpaid}
          </span>
          <span aria-hidden className="mt-1 block h-1" />
        </StatCell>
      </div>
    </Link>
  );
}

/** Ангиудын жагсаалт: Баруун 4, дараа нь Зүүн 4 */
export default function ClassesView() {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<BranchFilter>("");

  const stats = useMemo(() => CLASSES.map(classStat), []);
  const needle = q.trim().toLocaleLowerCase("mn");
  const groups = useMemo(
    () =>
      BRANCHES.filter((b) => !branch || b === branch)
        .map((b) => ({
          branch: b,
          items: stats.filter((s) => s.cls.branch === b && (!needle || s.cls.name.toLocaleLowerCase("mn").includes(needle))),
        }))
        .filter((g) => g.items.length > 0),
    [stats, branch, needle],
  );
  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <h1 className="sr-only">Ангиуд</h1>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block sm:w-72">
          <span className="sr-only">Анги хайх</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Анги хайх"
            className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-10 text-base text-ink outline-none placeholder:text-ink-dim focus:border-brand"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Хайлтыг цэвэрлэх"
              className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-dim hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>

        <Segmented
          label="Салбар"
          value={branch}
          onChange={setBranch}
          options={[
            { value: "", label: "Бүгд" },
            { value: "Баруун 4", label: "Баруун 4" },
            { value: "Зүүн 4", label: "Зүүн 4" },
          ]}
          className="self-start"
        />

        <p className="text-sm text-ink-dim sm:ml-auto" aria-live="polite">
          {shown} анги
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={School}
          title="Тохирох анги олдсонгүй"
          hint="Хайлтын үгийг өөрчилж эсвэл салбарын шүүлтийг арилгаад үзнэ үү"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setBranch("");
              }}
            >
              Шүүлтийг арилгах
            </Button>
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.branch} aria-labelledby={`grp-${g.branch}`}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 id={`grp-${g.branch}`} className="text-lg font-bold text-brand-soft">
                  {g.branch}
                </h2>
                <span className="text-sm text-ink-dim">
                  <Meta items={[`${g.items.length} анги`, `${g.items.reduce((n, s) => n + s.cls.students.length, 0)} сурагч`]} />
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((s) => (
                  <ClassCard key={s.cls.id} stat={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Legend>
        <LegendItem>Ирц, даалгавар: сүүлийн {WINDOW_DAYS} хоног</LegendItem>
        <LegendItem>
          <RiskDot />
          Асуудалтай: шалгуур хангаагүй сурагчийн тоо
        </LegendItem>
        <LegendItem>
          <Wallet className="size-3.5" aria-hidden />
          Төлбөр дутуу сурагчийн тоо
        </LegendItem>
        <LegendItem>
          <span className="font-semibold text-error">Улаан хувь</span>
          шалгуураас доогуур
        </LegendItem>
      </Legend>
    </div>
  );
}
