"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ChevronDown, Flag, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/kit/badge";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { StudentActionsMenu } from "@/components/students/StudentActions";
import { cn } from "@/lib/cn";
import { byFirstName, rosterNames } from "@/lib/personName";
import { FLAG_KINDS, FLAG_META, flagMeta, PAYMENT_META, RISK_META } from "./meta";
import { CompetencyHint, CompetencyValue, FlagChip, RateCell, RiskChip, Segmented } from "./parts";
import StudentDialog from "./StudentDialog";
import type { ClassDashboard, RiskFlag, StudentRow } from "./types";

export type QuickView = "all" | "risk" | "improved" | "makeup" | "unpaid";
type SortKey = "name" | "competency_desc" | "competency_asc" | "attendance_asc" | "exam_desc" | "falling";

const STORE_KEY = "pi_class_students_filters";
interface Saved {
  view: QuickView;
  sort: SortKey;
  flag: string;
  risk: string;
}

function readSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

const fullName = (s: StudentRow) => `${s.lastName} ${s.firstName}`;

function isRisk(s: StudentRow) {
  return s.risk.length > 0 || s.flags.some((f) => flagMeta(f.kind).concern);
}
function isImproved(s: StudentRow) {
  return s.flags.some((f) => f.kind === "IMPROVED") || (s.competency.change !== null && s.competency.change >= 8);
}
function hasMakeup(s: StudentRow) {
  return (s.makeup ?? 0) > 0;
}
// «Бүртгэлгүй» (NONE) нь зөвхөн тухайн ангид төлбөрийн бүртгэл эхэлсэн үед л
// «дутуу» гэж тооцогдоно — төлбөр импортлоогүй үед бүх хүүхэд өртэй мэт харагдах
// алдаанаас сэргийлнэ (эзэн 2026-10-13).
function isUnpaid(s: StudentRow, tracking: boolean) {
  if (!s.payment) return false;
  return s.payment.state === "PARTIAL" || (tracking && s.payment.state === "NONE");
}

interface ClassAvg {
  attendance: number | null;
  homework: number | null;
  exam: number | null;
  practice: number | null;
  competency: number | null;
}

/** Утсан дээр: ангийн дундаж нэг мөрөнд (хүснэгтийн «Ангийн дундаж» мөртэй ижил) */
function ClassAverageCard({ avg }: { avg: ClassAvg }) {
  const items = [
    avg.attendance !== null ? `Ирц ${avg.attendance}%` : null,
    avg.homework !== null ? `Даалгавар ${avg.homework}%` : null,
    avg.exam !== null ? `Шалгалт ${avg.exam}%` : null,
    avg.practice ? `Бие даасан ${avg.practice}` : null,
    avg.competency !== null ? `Чадамж ${avg.competency}` : null,
  ];
  if (!items.some(Boolean)) return null;
  return (
    <div className="rounded-2xl border border-line bg-panel px-3 py-2 md:hidden">
      <p className="text-xs font-bold text-ink">Ангийн дундаж</p>
      <Meta className="text-sm tabular-nums text-ink" items={items} />
    </div>
  );
}

const nullsLast = (v: number | null, dir: 1 | -1) => (v === null ? Number.POSITIVE_INFINITY : v * dir);

export default function StudentsTab({
  data,
  view,
  onViewChange,
  onChanged,
}: {
  data: ClassDashboard;
  view: QuickView | null;
  onViewChange: (v: QuickView) => void;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [flag, setFlag] = useState("ALL");
  const [risk, setRisk] = useState("ALL");
  const [topic, setTopic] = useState("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const money = data.permissions.money;
  const canManage = !!data.permissions.manageClass;
  const current: QuickView = view ?? "all";

  // Хадгалсан шүүлтүүрийг сэргээнэ (энэ төхөөрөмж дээр л)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = readSaved();
      if (s.sort) setSort(s.sort);
      if (s.flag) setFlag(s.flag);
      if (s.risk) setRisk(s.risk);
      if (!view && s.view && (s.view !== "unpaid" || money)) onViewChange(s.view);
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ view: current, sort, flag, risk } satisfies Saved));
    } catch {
      /* хадгалах боломжгүй — асуудалгүй */
    }
  }, [restored, current, sort, flag, risk]);

  // «Б. Нэр» — ижил нэр + ижил овгийн үсэгтэй бол овог бүтнээрээ (эзэн 2026-10-18)
  const names = useMemo(() => rosterNames(data.students), [data.students]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    data.students.forEach((s) => s.lagging.forEach((t) => set.add(t.name)));
    return [...set].sort((a, b) => a.localeCompare(b, "mn"));
  }, [data.students]);

  // Ангид дор хаяж нэг төлбөрийн бүртгэл байвал хяналт эхэлсэн гэж үзнэ
  const tracking = useMemo(
    () => data.students.some((x) => x.payment && x.payment.state !== "NONE"),
    [data.students],
  );
  const counts = useMemo(
    () => ({
      all: data.students.length,
      risk: data.students.filter(isRisk).length,
      improved: data.students.filter(isImproved).length,
      makeup: data.students.filter(hasMakeup).length,
      unpaid: data.students.filter((x) => isUnpaid(x, tracking)).length,
    }),
    [data.students, tracking],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.students.filter((s) => {
      if (current === "risk" && !isRisk(s)) return false;
      if (current === "improved" && !isImproved(s)) return false;
      if (current === "makeup" && !hasMakeup(s)) return false;
      if (current === "unpaid" && !isUnpaid(s, tracking)) return false;
      if (flag !== "ALL" && !s.flags.some((f) => f.kind === flag)) return false;
      if (risk !== "ALL" && !s.risk.includes(risk as RiskFlag)) return false;
      if (topic !== "ALL" && !s.lagging.some((t) => t.name === topic)) return false;
      if (q && !fullName(s).toLowerCase().includes(q) && !`${s.firstName} ${s.lastName}`.toLowerCase().includes(q) && !(s.studentCode ?? "").includes(q))
        return false;
      return true;
    });
    // Нэрийн эхний үсгээр (овгоор биш) — эзэн 2026-10-18
    const byName = byFirstName;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "competency_desc":
          return nullsLast(a.competency.score, -1) - nullsLast(b.competency.score, -1) || byName(a, b);
        case "competency_asc":
          return nullsLast(a.competency.score, 1) - nullsLast(b.competency.score, 1) || byName(a, b);
        case "attendance_asc":
          return nullsLast(a.attendance.rate, 1) - nullsLast(b.attendance.rate, 1) || byName(a, b);
        case "exam_desc":
          return nullsLast(a.exam.avg, -1) - nullsLast(b.exam.avg, -1) || byName(a, b);
        case "falling":
          return nullsLast(a.competency.change, 1) - nullsLast(b.competency.change, 1) || byName(a, b);
        default:
          return byName(a, b);
      }
    });
  }, [data.students, current, flag, risk, topic, query, sort, tracking]);

  // Ангийн дундаж — хүүхэд бүрийг харьцуулах лавлах мөр
  const avg = useMemo<ClassAvg>(
    () => ({
      attendance: data.summary.attendanceRate,
      homework: data.summary.homeworkRate,
      exam: data.summary.examAvg,
      practice: data.students.length
        ? Math.round(data.students.reduce((sum, x) => sum + x.practice.attempts, 0) / data.students.length)
        : null,
      competency: data.summary.competencyAvg,
    }),
    [data.summary, data.students],
  );

  const filtersOn = flag !== "ALL" || risk !== "ALL" || topic !== "ALL" || query.trim() !== "" || current !== "all";
  const open = openId ? data.students.find((s) => s.id === openId) ?? null : null;

  function reset() {
    setQuery("");
    setFlag("ALL");
    setRisk("ALL");
    setTopic("ALL");
    onViewChange("all");
  }

  const views: { value: QuickView; label: string; count: number }[] = [
    { value: "all", label: "Бүгд", count: counts.all },
    { value: "risk", label: "Анхаарах хүүхдүүд", count: counts.risk },
    { value: "improved", label: "Сайжирсан", count: counts.improved },
    { value: "makeup", label: "Нөхөх хичээлтэй", count: counts.makeup },
    ...(money ? [{ value: "unpaid" as const, label: "Төлбөр дутуу", count: counts.unpaid }] : []),
  ];

  return (
    <div className="space-y-3">
      <Segmented label="Хурдан харагдац" value={current} onChange={onViewChange} options={views} />

      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 md:flex-row md:flex-wrap md:items-center">
        <label className="relative block min-w-0 md:w-56">
          <span className="sr-only">Нэрээр хайх</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр, код"
            className="min-h-11 w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-ink focus-visible:outline-2 focus-visible:outline-brand"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Select label="Шошго" icon={Flag} value={flag} onChange={setFlag}>
            <option value="ALL">Шошго</option>
            {FLAG_KINDS.map((k) => (
              <option key={k} value={k}>
                {FLAG_META[k].label}
              </option>
            ))}
          </Select>
          <Select label="Эрсдэл" icon={SlidersHorizontal} value={risk} onChange={setRisk}>
            <option value="ALL">Эрсдэл</option>
            {(Object.keys(RISK_META) as RiskFlag[]).map((k) => (
              <option key={k} value={k}>
                {RISK_META[k].label}
              </option>
            ))}
          </Select>
          <Select label="Сул сэдэв" icon={SlidersHorizontal} value={topic} onChange={setTopic} disabled={!topics.length}>
            <option value="ALL">{topics.length ? "Сул сэдэв" : "Сэдэв алга"}</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select label="Эрэмбэ" icon={ArrowDownUp} value={sort} onChange={(v) => setSort(v as SortKey)}>
            <option value="name">Нэрээр</option>
            <option value="competency_desc">Чадамж өндрөөс</option>
            <option value="competency_asc">Чадамж багаас</option>
            <option value="falling">Буурсан нь эхэнд</option>
            <option value="attendance_asc">Ирц сулаас</option>
            <option value="exam_desc">Шалгалт өндрөөс</option>
          </Select>
        </div>
        {filtersOn && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-bright/10 md:ml-auto"
          >
            <X className="h-4 w-4" aria-hidden /> Цэвэрлэх
          </button>
        )}
      </div>

      <p className="text-sm text-ink-dim" aria-live="polite">
        {rows.length} / {data.students.length} сурагч
      </p>

      {data.students.length === 0 ? (
        <EmptyState icon={Users} title="Энэ ангид сурагч алга" hint="Ангийн бүртгэлээс сурагч нэмэхэд энд гарна" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Шүүлтүүрт тохирох сурагч алга"
          action={
            <button type="button" onClick={reset} className="min-h-11 text-sm font-semibold text-brand hover:underline">
              Шүүлтүүр цэвэрлэх
            </button>
          }
        />
      ) : (
        <>
          <DesktopTable rows={rows} names={names} money={money} onOpen={setOpenId} avg={avg} classId={data.classroom.id} onChanged={canManage ? onChanged : undefined} />
          <ClassAverageCard avg={avg} />
          <ul className="space-y-2 md:hidden">
            {rows.map((s) => (
              <li key={s.id}>
                <StudentCard s={s} name={names.get(s.id) ?? fullName(s)} money={money} onOpen={() => setOpenId(s.id)} classId={data.classroom.id} onChanged={canManage ? onChanged : undefined} />
              </li>
            ))}
          </ul>
        </>
      )}

      {open && (
        <StudentDialog
          student={open}
          classroomId={data.classroom.id}
          onClose={() => setOpenId(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function Select({
  label,
  icon: Icon,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  icon: typeof Flag;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          // appearance-none: Safari нь энгийн <select>-ийн pl-9-г тоохгүй тул дүрс
          // бичвэр дээр давхарддаг байв (эзэн 2026-10-18) — сумыг өөрсдөө зурна.
          "min-h-11 w-full min-w-0 appearance-none truncate rounded-xl border bg-bg py-2 pl-9 pr-8 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 md:w-auto",
          value !== "ALL" && value !== "name" ? "border-brand-bright" : "border-line",
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
    </label>
  );
}

function ExamCell({ s }: { s: StudentRow }) {
  if (s.exam.avg === null)
    return <span className="text-sm text-ink-dim">{s.exam.missed ? `${s.exam.missed} өгөөгүй` : "—"}</span>;
  return (
    <span className="text-sm tabular-nums">
      <span className="font-semibold text-ink">{s.exam.avg}%</span>
      {s.exam.last !== null && s.exam.taken > 1 && <span className="text-ink-dim"> сүүлд {s.exam.last}%</span>}
    </span>
  );
}

function PracticeCell({ s }: { s: StudentRow }) {
  if (!s.practice.attempts && !s.practice.tests) return <span className="text-sm text-ink-dim">—</span>;
  return (
    <span className="text-sm tabular-nums">
      <span className="font-semibold text-ink">{s.practice.attempts}</span>
      {s.practice.accuracy !== null && <span className="text-ink-dim"> {s.practice.accuracy}%</span>}
      {s.practice.tests > 0 && <span className="text-ink-dim"> {s.practice.tests} тест</span>}
    </span>
  );
}

function Chips({ s, onOpen }: { s: StudentRow; onOpen: () => void }) {
  if (!s.risk.length && !s.flags.length) return <span className="text-sm text-ink-dim">—</span>;
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {s.flags.map((f) => (
        <FlagChip key={f.id} kind={f.kind} note={f.note} onClick={onOpen} />
      ))}
      {s.risk.map((r) => (
        <RiskChip key={r} risk={r} />
      ))}
    </div>
  );
}

function RowMenu({ s, classId, onChanged }: { s: StudentRow; classId: string; onChanged: () => void }) {
  return <StudentActionsMenu student={{ id: s.id, name: fullName(s) }} currentClassId={classId} onChanged={onChanged} />;
}

function DesktopTable({
  rows,
  names,
  money,
  onOpen,
  avg,
  classId,
  onChanged,
}: {
  rows: StudentRow[];
  names: Map<string, string>;
  money: boolean;
  onOpen: (id: string) => void;
  avg: ClassAvg;
  classId: string;
  onChanged?: () => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-line bg-panel text-xs font-semibold text-ink-dim">
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-panel px-3 py-2">Сурагч</th>
            <th scope="col" className="px-3 py-2">Ирц</th>
            <th scope="col" className="px-3 py-2">Даалгавар</th>
            <th scope="col" className="px-3 py-2">Шалгалт</th>
            <th scope="col" className="px-3 py-2">
              <span className="inline-flex items-center gap-1">
                Бие даасан <InfoHint>Сүүлийн 14 хоногт шалгалтаас гадуур бодсон бодлого, зөвийн хувь, ангид оноогоогүй тест</InfoHint>
              </span>
            </th>
            <th scope="col" className="px-3 py-2">
              <span className="inline-flex items-center gap-1">
                Нөхөх <InfoHint>Батлагдсан хичээлээс тасалсан тоо (60 хоног). Нөхсөнийг хараахан бүртгэдэггүй</InfoHint>
              </span>
            </th>
            <th scope="col" className="px-3 py-2">Сул сэдэв</th>
            <th scope="col" className="px-3 py-2">
              <span className="inline-flex items-center gap-1">
                Чадамж <Badge tone="neutral">v0</Badge> <CompetencyHint />
              </span>
            </th>
            <th scope="col" className="px-3 py-2">Шошго, дохио</th>
            {money && <th scope="col" className="px-3 py-2">Төлбөр</th>}
            {onChanged && (
              <th scope="col" className="sticky right-0 z-10 w-12 bg-panel px-1 py-2">
                <span className="sr-only">Үйлдэл</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <tr className="bg-panel">
            <th scope="row" className="sticky left-0 z-10 bg-panel px-2.5 py-2 text-left text-xs font-bold text-ink">
              Ангийн дундаж
            </th>
            <td className="px-2.5 py-1.5">
              <RateCell rate={avg.attendance} />
            </td>
            <td className="px-2.5 py-1.5">
              <RateCell rate={avg.homework} />
            </td>
            <td className="px-2.5 py-1.5 text-sm font-semibold tabular-nums text-ink">{avg.exam === null ? "—" : `${avg.exam}%`}</td>
            <td className="px-2.5 py-1.5 text-sm font-semibold tabular-nums text-ink">{avg.practice ?? "—"}</td>
            <td className="px-2.5 py-1.5" />
            <td className="px-2.5 py-1.5" />
            <td className="px-2.5 py-1.5 font-display text-lg font-bold tabular-nums text-ink">{avg.competency ?? "—"}</td>
            <td className="px-2.5 py-1.5" />
            {money && <td className="px-2.5 py-1.5" />}
            {onChanged && <td className="sticky right-0 z-10 bg-panel" />}
          </tr>
          {rows.map((s) => (
            <tr key={s.id} className="row-interactive align-middle">
              <th scope="row" className="sticky left-0 z-10 bg-surface px-2.5 py-1 font-normal">
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className="flex min-h-11 max-w-[11rem] flex-col justify-center text-left focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="block truncate font-semibold text-ink hover:text-brand">{names.get(s.id) ?? fullName(s)}</span>
                  {s.studentCode && <span className="block font-mono text-xs text-ink-dim">{s.studentCode}</span>}
                </button>
              </th>
              <td className="px-2.5 py-1.5">
                <RateCell rate={s.attendance.rate} marked={s.attendance.marked} />
              </td>
              <td className="px-2.5 py-1.5">
                <RateCell rate={s.homework.rate} marked={s.homework.marked} />
              </td>
              <td className="px-2.5 py-1.5">
                <ExamCell s={s} />
              </td>
              <td className="px-2.5 py-1.5">
                <PracticeCell s={s} />
              </td>
              <td className="px-2.5 py-1.5 text-sm tabular-nums">
                {s.makeup === null ? <span className="text-ink-dim">—</span> : <span className={s.makeup ? "font-semibold text-ink" : "text-ink-dim"}>{s.makeup}</span>}
              </td>
              <td className="max-w-[10rem] px-2.5 py-1.5 text-sm">
                {s.lagging.length ? (
                  <span className="line-clamp-2 text-ink">{s.lagging.map((t) => t.name).join(", ")}</span>
                ) : (
                  <span className="text-ink-dim">—</span>
                )}
              </td>
              <td className="px-2.5 py-1.5">
                <button type="button" onClick={() => onOpen(s.id)} className="inline-flex min-h-11 items-center text-left focus-visible:outline-2 focus-visible:outline-brand">
                  <CompetencyValue c={s.competency} compact />
                </button>
              </td>
              <td className="max-w-[16rem] px-2.5 py-1.5">
                <Chips s={s} onOpen={() => onOpen(s.id)} />
              </td>
              {money && (
                <td className="px-2.5 py-1.5">
                  {s.payment ? <Badge tone={PAYMENT_META[s.payment.state].tone}>{PAYMENT_META[s.payment.state].label}</Badge> : null}
                </td>
              )}
              {onChanged && (
                <td className="sticky right-0 z-10 bg-surface px-1 text-right">
                  <RowMenu s={s} classId={classId} onChanged={onChanged} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentCard({
  s,
  name,
  money,
  onOpen,
  classId,
  onChanged,
}: {
  s: StudentRow;
  name: string;
  money: boolean;
  onOpen: () => void;
  classId: string;
  onChanged?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <Link href={`/app/students/${encodeURIComponent(s.id)}`} className="block truncate font-semibold text-ink hover:text-brand">
            {name}
          </Link>
          {s.studentCode && <span className="font-mono text-xs text-ink-dim">{s.studentCode}</span>}
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[11px] font-semibold text-ink-dim">Чадамж v0</span>
          <CompetencyValue c={s.competency} compact />
        </div>
        {onChanged && <RowMenu s={s} classId={classId} onChanged={onChanged} />}
      </div>
      {(s.flags.length > 0 || s.risk.length > 0) && (
        <div className="mt-2">
          <Chips s={s} onOpen={onOpen} />
        </div>
      )}
      <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5">
        <Cell label="Ирц">
          <RateCell rate={s.attendance.rate} />
        </Cell>
        <Cell label="Даалгавар">
          <RateCell rate={s.homework.rate} />
        </Cell>
        <Cell label="Шалгалт">
          <ExamCell s={s} />
        </Cell>
        <Cell label="Бие даасан">
          <PracticeCell s={s} />
        </Cell>
        <Cell label="Нөхөх">
          <span className="text-sm tabular-nums text-ink">{s.makeup ?? "—"}</span>
        </Cell>
        {money && s.payment && (
          <Cell label="Төлбөр">
            <Badge tone={PAYMENT_META[s.payment.state].tone}>{PAYMENT_META[s.payment.state].label}</Badge>
          </Cell>
        )}
      </dl>
      {s.lagging.length > 0 && (
        <p className="mt-2 truncate text-xs text-ink-dim">
          Сул сэдэв: <span className="text-ink">{s.lagging.map((t) => t.name).join(", ")}</span>
        </p>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Flag className="h-4 w-4" aria-hidden /> Чадамж, шошго
      </button>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold text-ink-dim">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  );
}

