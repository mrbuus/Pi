"use client";

import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, TriangleAlert, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { AttRate, HwRate, Legend, LegendItem, PAY_META, PayBadge, RiskDot } from "../classes/common";
import { seenLabel } from "../classes/format";
import { WINDOW_DAYS, studentStat, type StudentStat } from "../classes/stats";
import { RiskMark } from "../shell/status";
import { ALL_STUDENTS, CLASSES, DEFAULT_CRITERIA, classById, fmtPhone, type Branch, type PaymentSummary } from "../world";
import NewStudentDialog from "./NewStudentDialog";

type SortKey = "code" | "name" | "class" | "att" | "hw" | "seen";
/** «due» = хэсэгчлэн төлсөн ба төлөөгүй хоёрыг хамтад нь (ангийн жагсаалтын «Төлбөр дутуу»-тай ижил) */
type PayFilter = "" | "due" | PaymentSummary["status"];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "code", label: "Эрэмбэ: код" },
  { key: "name", label: "Эрэмбэ: нэр" },
  { key: "class", label: "Эрэмбэ: анги" },
  { key: "att", label: "Эрэмбэ: ирц багаас" },
  { key: "hw", label: "Эрэмбэ: даалгавар багаас" },
  { key: "seen", label: "Эрэмбэ: хамгийн хуучин орсон" },
];
const PAGE_SIZES = [25, 50, 100];
const BRANCHES: Branch[] = ["Баруун 4", "Зүүн 4"];
const GRADES = [9, 10, 11, 12];
const CLASS_ORDER = new Map(CLASSES.map((c, i) => [c.id, i]));

const SELECT = "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand";
const TOGGLE =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-bright/60";
/** Компьютер дээрх хүснэгтийн баганууд (lg-ээс дээш); бага дэлгэц дээр картан жагсаалт */
const GRID = "lg:grid-cols-[1rem_5rem_minmax(0,1fr)_5rem_8.5rem_4rem_5.5rem_6.75rem]";

function compareBy(sort: SortKey): (a: StudentStat, b: StudentStat) => number {
  const byCode = (a: StudentStat, b: StudentStat) => a.student.code.localeCompare(b.student.code);
  switch (sort) {
    case "name":
      return (a, b) => a.student.lastName.localeCompare(b.student.lastName, "mn") || a.student.firstName.localeCompare(b.student.firstName, "mn") || byCode(a, b);
    case "class":
      return (a, b) => (CLASS_ORDER.get(a.student.classId) ?? 0) - (CLASS_ORDER.get(b.student.classId) ?? 0) || a.student.index - b.student.index;
    case "att":
      return (a, b) => (a.att ?? 101) - (b.att ?? 101) || byCode(a, b);
    case "hw":
      return (a, b) => (a.hw ?? 101) - (b.hw ?? 101) || byCode(a, b);
    case "seen":
      // Нэвтэрч үзээгүй нь хамгийн эхэнд
      return (a, b) => (a.student.lastSeenAt ?? "").localeCompare(b.student.lastSeenAt ?? "") || byCode(a, b);
    default:
      return byCode;
  }
}

function matches(r: StudentStat, needle: string, digits: string): boolean {
  const s = r.student;
  const name = `${s.lastName} ${s.firstName}`.toLocaleLowerCase("mn");
  if (name.includes(needle) || s.name.toLocaleLowerCase("mn").includes(needle)) return true;
  if (digits.length < 2) return false;
  return [s.code, s.phone, s.fatherPhone ?? "", s.motherPhone ?? ""].some((v) => v.includes(digits));
}

/**
 * Сурагчдын лавлах: хайлт, шүүлт, эрэмбэ, хуудаслалт.
 * Бодит: GET /users?role=STUDENT (код, нэр, утсаар хайх; анги, салбар, сургуулийн анги, төлбөрөөр шүүх;
 * skip/take хуудаслалт) — демод бүгдийг хөтөч дээр шүүнэ. «Шинэ сурагч» = POST /users/students (NewStudentDialog).
 */
export default function StudentsView() {
  const all = useMemo(() => ALL_STUDENTS.map(studentStat), []);

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<"" | Branch>("");
  const [classId, setClassId] = useState("");
  const [grade, setGrade] = useState("");
  const [pay, setPay] = useState<PayFilter>("");
  const [riskOnly, setRiskOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("code");
  const [size, setSize] = useState(25);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const base = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("mn");
    const digits = needle.replace(/\D/g, "");
    return all.filter((r) => {
      if (branch && r.cls.branch !== branch) return false;
      if (classId && r.student.classId !== classId) return false;
      if (grade && String(r.student.grade) !== grade) return false;
      if (pay === "due" ? r.pay.outstanding === 0 : pay && r.pay.status !== pay) return false;
      return !needle || matches(r, needle, digits);
    });
  }, [all, q, branch, classId, grade, pay]);

  const riskCount = useMemo(() => base.filter((r) => r.flags.length > 0).length, [base]);
  const rows = useMemo(() => [...(riskOnly ? base.filter((r) => r.flags.length > 0) : base)].sort(compareBy(sort)), [base, riskOnly, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * size, cur * size + size);
  const activeFilters = [branch, classId, grade, pay].filter(Boolean).length;

  const resetPage = () => setPage(0);
  function changeBranch(b: "" | Branch) {
    setBranch(b);
    if (b && classId && classById(classId)?.branch !== b) setClassId("");
    resetPage();
  }
  function clearAll() {
    setQ("");
    setBranch("");
    setClassId("");
    setGrade("");
    setPay("");
    setRiskOnly(false);
    resetPage();
  }
  function goto(p: number) {
    setPage(p);
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  }

  return (
    <div>
      <h1 className="sr-only">Сурагчид</h1>

      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="relative block min-w-0 flex-1 sm:max-w-md">
            <span className="sr-only">Код, нэр, утсаар хайх</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                resetPage();
              }}
              placeholder="Код, нэр, утас"
              className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-10 text-base text-ink outline-none placeholder:text-ink-dim focus:border-brand"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  resetPage();
                }}
                aria-label="Хайлтыг цэвэрлэх"
                className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-dim hover:text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </label>
          <Button onClick={() => setAdding(true)} className="shrink-0 px-4 sm:ml-auto">
            <UserPlus aria-hidden />
            Шинэ сурагч
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="student-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(TOGGLE, "border-line text-ink lg:hidden")}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Шүүлтүүр
            {activeFilters > 0 && <span className="rounded-full bg-brand-bright px-1.5 text-xs font-bold tabular-nums text-on-brand">{activeFilters}</span>}
          </button>
          <button
            type="button"
            aria-pressed={riskOnly}
            onClick={() => {
              setRiskOnly((v) => !v);
              resetPage();
            }}
            className={cn(TOGGLE, riskOnly ? "border-error bg-error/10 text-error" : "border-line text-ink hover:bg-ink/5")}
          >
            <TriangleAlert className="size-4" aria-hidden />
            Асуудалтай
            <span className="tabular-nums">{riskCount}</span>
          </button>
          <p className="ml-auto text-sm text-ink-dim" aria-live="polite">
            <span className="font-semibold tabular-nums text-ink">{rows.length}</span> сурагч
          </p>
        </div>

        <div id="student-filters" className={cn("grid-cols-2 gap-2 lg:grid lg:grid-cols-5", filtersOpen ? "grid" : "hidden")}>
          <select aria-label="Салбар" value={branch} onChange={(e) => changeBranch(e.target.value as "" | Branch)} className={SELECT}>
            <option value="">Салбар: бүгд</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            aria-label="Анги"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              resetPage();
            }}
            className={SELECT}
          >
            <option value="">Анги: бүгд</option>
            {BRANCHES.filter((b) => !branch || b === branch).map((b) => (
              <optgroup key={b} label={b}>
                {CLASSES.filter((c) => c.branch === b).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            aria-label="Сургуулийн анги"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              resetPage();
            }}
            className={SELECT}
          >
            <option value="">Сургуулийн анги: бүгд</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}-р анги
              </option>
            ))}
          </select>
          <select
            aria-label="Төлбөр"
            value={pay}
            onChange={(e) => {
              setPay(e.target.value as PayFilter);
              resetPage();
            }}
            className={SELECT}
          >
            <option value="">Төлбөр: бүгд</option>
            <option value="due">Дутуу (хэсэгчлэн ба төлөөгүй)</option>
            {(Object.keys(PAY_META) as Array<keyof typeof PAY_META>).map((k) => (
              <option key={k} value={k}>
                {PAY_META[k].label}
              </option>
            ))}
          </select>
          <select aria-label="Эрэмбэ" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={cn(SELECT, "col-span-2 lg:col-span-1")}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={listRef} className="scroll-mt-20">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Тохирох сурагч олдсонгүй"
            hint="Хайлтын үг эсвэл шүүлтүүрээ өөрчилж үзнэ үү"
            action={
              <Button variant="outline" size="sm" onClick={clearAll}>
                Шүүлтүүрийг арилгах
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {/* Компьютер: хүснэгт */}
            <div aria-hidden className={cn("hidden items-center gap-x-4 border-b border-line bg-ink/[0.03] px-4 py-2 text-xs font-semibold text-ink-dim lg:grid", GRID)}>
              <span />
              <span>Код</span>
              <span>Нэр</span>
              <span>Анги</span>
              <span>Сүүлд орсон</span>
              <span className="text-right">Ирц</span>
              <span className="text-right">Даалгавар</span>
              <span className="text-right">Төлбөр</span>
            </div>
            <ul className="hidden divide-y divide-line lg:block">
              {slice.map((r) => (
                <li key={r.student.id}>
                  <Link
                    href={`/demo/students/${r.student.id}`}
                    prefetch={false}
                    className={cn("grid min-h-14 items-center gap-x-4 px-4 py-2 text-sm outline-none transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06]", GRID)}
                  >
                    <RiskMark flags={r.flags} />
                    <span className="tabular-nums text-ink-dim">{r.student.code}</span>
                    <span className="min-w-0">
                      <span className="cyrillic-tight block truncate font-semibold text-ink">{r.student.name}</span>
                      <span className="block text-xs tabular-nums text-ink-dim">{fmtPhone(r.student.phone)}</span>
                    </span>
                    <span className="text-ink">{r.cls.label}</span>
                    <span className="text-ink-dim">{seenLabel(r.student.lastSeenAt)}</span>
                    <span className="text-right">
                      <AttRate value={r.att} />
                    </span>
                    <span className="text-right">
                      <HwRate value={r.hw} />
                    </span>
                    <span className="justify-self-end">
                      <PayBadge status={r.pay.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Утас, таблет: карт */}
            <ul className="divide-y divide-line lg:hidden">
              {slice.map((r) => (
                <li key={r.student.id}>
                  <Link
                    href={`/demo/students/${r.student.id}`}
                    prefetch={false}
                    className="flex min-h-[4.75rem] items-start gap-3 px-3.5 py-3 outline-none transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06]"
                  >
                    <RiskMark flags={r.flags} className="mt-[0.4rem]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="cyrillic-tight min-w-0 truncate text-[15px] font-semibold text-ink">{r.student.name}</span>
                        <PayBadge status={r.pay.status} className="shrink-0" />
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-ink-dim">
                        <Meta items={[r.student.code, r.cls.label, fmtPhone(r.student.phone)]} />
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-ink-dim">
                        <span>
                          Ирц <AttRate value={r.att} />
                        </span>
                        <span>
                          Даалгавар <HwRate value={r.hw} />
                        </span>
                        <span>{seenLabel(r.student.lastSeenAt)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <nav aria-label="Хуудаслалт" className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-ink-dim">
            Хуудсанд
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                resetPage();
              }}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm tabular-nums text-ink-dim" aria-live="polite">
            {cur * size + 1}–{Math.min(rows.length, cur * size + size)} / {rows.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => goto(cur - 1)}
              disabled={cur === 0}
              aria-label="Өмнөх хуудас"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink outline-none transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-brand-bright/60 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-ink">
              {cur + 1} / {pages}
            </span>
            <button
              type="button"
              onClick={() => goto(cur + 1)}
              disabled={cur >= pages - 1}
              aria-label="Дараах хуудас"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink outline-none transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-brand-bright/60 disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </span>
        </nav>
      )}

      <Legend>
        <LegendItem>Ирц, даалгавар: сүүлийн {WINDOW_DAYS} хоног</LegendItem>
        <LegendItem>
          <RiskDot />
          Асуудалтай: ирц {DEFAULT_CRITERIA.minAttendance}%-иас бага, {DEFAULT_CRITERIA.maxAbsences}+ тасалсан, {DEFAULT_CRITERIA.maxLates}+ хоцорсон, даалгавар{" "}
          {DEFAULT_CRITERIA.minHomework}%-иас бага эсвэл {DEFAULT_CRITERIA.missingStreak}+ дараалан хийгээгүй
        </LegendItem>
        {(Object.keys(PAY_META) as Array<keyof typeof PAY_META>).map((k) => (
          <LegendItem key={k}>
            <PayBadge status={k} />
          </LegendItem>
        ))}
      </Legend>

      {adding && <NewStudentDialog onClose={() => setAdding(false)} />}
    </div>
  );
}
