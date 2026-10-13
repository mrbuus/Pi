"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, School, Search, Settings2, ShieldAlert, UserPlus, Users } from "lucide-react";
import RequireRole from "@/components/nav/RequireRole";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { PAYMENT_META } from "./meta";
import { RateCell, Segmented } from "./parts";
import TeacherPicker from "./TeacherPicker";
import type { ClassCard, ClassListResponse } from "./types";

type SortKey = "name" | "risk" | "attendance";
const SORT_KEY = "pi_classes_sort";

/** «Анги (Баруун 4)» → «Баруун 4» */
function branchOf(name: string): string | null {
  return name.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? null;
}

function readSort(): SortKey {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return v === "risk" || v === "attendance" ? v : "name";
  } catch {
    return "name";
  }
}

export default function ClassesListClient() {
  const [data, setData] = useState<ClassListResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("name");
  const [assigning, setAssigning] = useState<ClassCard | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ClassListResponse>("/class-dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ангиудыг ачаалж чадсангүй");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSort(readSort());
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  function changeSort(v: SortKey) {
    setSort(v);
    try {
      localStorage.setItem(SORT_KEY, v);
    } catch {
      /* хувийн горимд хадгалахгүй — асуудалгүй */
    }
  }

  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const c of data?.classes ?? []) {
      const b = branchOf(c.name);
      if (b) set.add(b);
    }
    return [...set].sort();
  }, [data]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.classes ?? []).filter(
      (c) =>
        (branch === "ALL" || branchOf(c.name) === branch) &&
        (!q || c.name.toLowerCase().includes(q) || c.teachers.some((t) => t.toLowerCase().includes(q))),
    );
    const byName = (a: ClassCard, b: ClassCard) => a.name.localeCompare(b.name, "mn", { numeric: true });
    return [...list].sort((a, b) => {
      if (sort === "risk") return b.riskCount - a.riskCount || byName(a, b);
      if (sort === "attendance")
        return (a.attendanceRate ?? 101) - (b.attendanceRate ?? 101) || byName(a, b);
      return byName(a, b);
    });
  }, [data, query, branch, sort]);

  const totals = useMemo(() => {
    const cs = data?.classes ?? [];
    return {
      students: cs.reduce((s, c) => s + c.students, 0),
      risk: cs.reduce((s, c) => s + c.riskCount, 0),
    };
  }, [data]);

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">Ангиуд</h1>
              {data && <ListHint days={data.windowDays} />}
            </div>
            {data && (
              <Meta
                className="mt-1 text-sm text-ink-dim"
                items={[`${data.classes.length} анги`, `${totals.students} сурагч`, totals.risk ? `${totals.risk} анхаарах` : null]}
              />
            )}
          </div>
          {data?.permissions.manageClasses && (
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/app/admin/classrooms">
                <Settings2 aria-hidden /> Ангийн бүртгэл
              </Link>
            </Button>
          )}
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block min-w-0 sm:w-64">
            <span className="sr-only">Анги эсвэл багшаар хайх</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Анги, багш хайх"
              className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>
          {branches.length > 1 && (
            <Segmented
              label="Салбар"
              value={branch}
              onChange={setBranch}
              options={[{ value: "ALL", label: "Бүгд" }, ...branches.map((b) => ({ value: b, label: b }))]}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-ink-dim sm:ml-auto">
            Эрэмбэ
            <select
              value={sort}
              onChange={(e) => changeSort(e.target.value as SortKey)}
              className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <option value="name">Нэрээр</option>
              <option value="risk">Анхаарах хүүхэд олноор</option>
              <option value="attendance">Ирц сулаар</option>
            </select>
          </label>
        </div>

        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {!data && !error && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Ангиуд ачаалж байна">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {data && data.classes.length === 0 && (
          <EmptyState
            icon={School}
            title="Танд харагдах анги алга"
            hint="Хуваарьт таныг багшаар оноосон эсвэл ангийн багшаар бүртгэсэн үед энд гарна"
          />
        )}
        {data && data.classes.length > 0 && shown.length === 0 && (
          <EmptyState icon={Search} title="Хайлтад тохирох анги алга" hint="Өөр үгээр хайж үзнэ үү" />
        )}
        {shown.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id}>
                <ClassCardView
                  c={c}
                  windowDays={data!.windowDays}
                  canAssign={!!data!.permissions.manageClasses}
                  onAssign={() => setAssigning(c)}
                />
              </li>
            ))}
          </ul>
        )}
        {assigning && (
          <TeacherPicker
            classroom={assigning}
            onClose={() => setAssigning(null)}
            onSaved={() => void load()}
          />
        )}
      </div>
    </RequireRole>
  );
}

/**
 * Ангийн карт — карт бүхэлдээ анги руу орох холбоос (нэрний холбоос картыг
 * бүрхэнэ). Ангийн багшгүй бол Багш+/Админд «Багш оноох» товч (холбоосоос
 * тусдаа, дээр нь давхарлана).
 */
function ClassCardView({
  c,
  windowDays,
  canAssign,
  onAssign,
}: {
  c: ClassCard;
  windowDays: number;
  canAssign: boolean;
  onAssign: () => void;
}) {
  const pay = c.payment;
  const payTotal = pay ? pay.PAID + pay.PARTIAL + pay.PENDING + pay.NONE : 0;
  const classTeachers = [c.classTeacher?.name, c.assistantTeacher?.name].filter((n): n is string => !!n);
  return (
    <div
      className="class-row surface-interactive group relative h-full rounded-2xl border border-line bg-surface p-4 elev-1"
      style={{ "--cls": getClassroomColor(c.id) } as React.CSSProperties}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-ink">
            <Link
              href={`/app/classes/${encodeURIComponent(c.id)}`}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {c.name}
            </Link>
          </h2>
          <Meta
            className="mt-0.5 text-sm text-ink-dim"
            items={[
              <span key="s" className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {c.students}
              </span>,
              classTeachers.length
                ? classTeachers.join(", ")
                : c.teachers.length
                  ? c.teachers.slice(0, 2).join(", ")
                  : canAssign
                    ? null
                    : "Багш оноогоогүй",
            ]}
          />
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-dim transition group-hover:translate-x-0.5" aria-hidden />
      </div>
      {canAssign && !c.classTeacher && (
        <button
          type="button"
          onClick={onAssign}
          className="relative z-10 -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand hover:bg-brand-bright/8 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <UserPlus className="h-4 w-4" aria-hidden /> Багш оноох
        </button>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Metric label="Ирц">
          <RateCell rate={c.attendanceRate} />
        </Metric>
        <Metric label="Даалгавар">
          <RateCell rate={c.homeworkRate} />
        </Metric>
        <Metric label="Шалгалт">
          {c.examAvg === null ? (
            <span className="text-sm text-ink-dim">{c.examCount ? "Дүн алга" : "—"}</span>
          ) : (
            <span className="text-sm font-semibold tabular-nums text-ink">{c.examAvg}%</span>
          )}
        </Metric>
        <Metric label="Анхаарах">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
              c.riskCount ? "text-error" : "text-ink-dim",
            )}
          >
            {c.riskCount > 0 && <ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
            {c.riskCount}
          </span>
        </Metric>
      </dl>

      {pay && payTotal > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <span className="bg-success" style={{ width: `${(pay.PAID / payTotal) * 100}%` }} />
            <span className="bg-error" style={{ width: `${(pay.PARTIAL / payTotal) * 100}%` }} />
            <span className="bg-info" style={{ width: `${(pay.PENDING / payTotal) * 100}%` }} />
          </div>
          <Meta
            className="mt-1 text-xs text-ink-dim"
            items={[
              `Энэ сар ${PAYMENT_META.PAID.label.toLowerCase()} ${pay.PAID}`,
              pay.PARTIAL ? `${PAYMENT_META.PARTIAL.label.toLowerCase()} ${pay.PARTIAL}` : null,
              pay.PENDING ? `хүлээгдэж буй ${pay.PENDING}` : null,
              pay.NONE ? `бүртгэлгүй ${pay.NONE}` : null,
            ]}
          />
        </div>
      )}

      <p className="mt-2 truncate text-xs text-ink-dim">
        {c.lastLesson
          ? `Сүүлийн хичээл ${formatMnDate(c.lastLesson.date)}${c.lastLesson.topic ? ` — ${c.lastLesson.topic}` : ""}`
          : "Батлагдсан хичээл хараахан алга"}
      </p>
      <span className="sr-only">Ирц, даалгавар нь сүүлийн {windowDays} хоногийнх</span>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-ink-dim">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function ListHint({ days }: { days: number }) {
  return (
    <InfoHint>
      Ирц, даалгавар нь сүүлийн {days} хоногийнх. «Анхаарах» — ирц, даалгавар, дүн сул, буурч буй эсвэл анхаарах шошготой хүүхэд
    </InfoHint>
  );
}
