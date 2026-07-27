"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { EngagementLevel, OnlineStudentListItem, OnlineStudentsResponse, PassFilter } from "./types";
import { errMsg } from "./format";
import StudentRosterCard from "./StudentRosterCard";

// Backend (ProgressService.onlineStudentsRoster) зөвхөн ACTIVE/EXPIRED-г
// ойлгодог: ACTIVE = идэвхтэй эрхтэй, EXPIRED = одоогоор идэвхтэй эрхгүй.
const PASS_FILTERS: { v: PassFilter | "ALL"; t: string }[] = [
  { v: "ALL", t: "Бүх эрх" },
  { v: "ACTIVE", t: "Идэвхтэй эрхтэй" },
  { v: "EXPIRED", t: "Идэвхтэй эрхгүй" },
];

const ACTIVITY_FILTERS: { v: EngagementLevel | "ALL"; t: string }[] = [
  { v: "ALL", t: "Бүх идэвх" },
  { v: "ACTIVE", t: "⚡ Идэвхтэй" },
  { v: "SLOWING", t: "🌗 Сулраж байна" },
  { v: "DORMANT", t: "💤 Идэвхгүй" },
];

// Энэ жагсаалт бол "бүтээгдэхүүн" өөрөө: эрх нь хүчинтэй хэрнээ идэвхгүй
// болсон онлайн үйлчлүүлэгчид өмнө нь ХААНАЧ харагддаггүй байсан — тэднийг
// хамгийн түрүүнд харуулж, эргэж холбогдоход түлхэц болно. (Backend аль хэдийн
// dormant_with_pass DESC-ээр эрэмблэдэг ч, frontend талд ч давхар баталгаажуулна.)
function sortRoster(students: OnlineStudentListItem[]): OnlineStudentListItem[] {
  const priority: OnlineStudentListItem[] = [];
  const rest: OnlineStudentListItem[] = [];
  for (const s of students) {
    if (s.engagement === "DORMANT" && s.activePass !== null) {
      priority.push(s);
    } else {
      rest.push(s);
    }
  }
  return [...priority, ...rest];
}

export default function OnlineRosterClient() {
  const [search, setSearch] = useState("");
  const [passStatus, setPassStatus] = useState<PassFilter | "ALL">("ALL");
  const [activity, setActivity] = useState<EngagementLevel | "ALL">("ALL");
  const [students, setStudents] = useState<OnlineStudentListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (passStatus !== "ALL") params.set("passStatus", passStatus);
    if (activity !== "ALL") params.set("activity", activity);
    params.set("pageSize", "200");
    api<OnlineStudentsResponse>(`/progress/online-students?${params.toString()}`)
      .then((res) => {
        setStudents(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [search, passStatus, activity]);

  useEffect(() => {
    // Хайлт бичих бүрт шууд дуудахгүй, бага зэрэг саатал өгнө (сервер дэх
    // ачааллыг багасгах, гар утсан дээр хурдны мэдрэмж алдагдахгүй байх)
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const dormantWithPassCount =
    students?.filter((s) => s.engagement === "DORMANT" && s.activePass !== null).length ?? 0;

  const ordered = students ? sortRoster(students) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Онлайн сурагчид</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Ангигүй, онлайн эрх худалдаж авсан сурагчдын судалгаа — сурч байгаа
          эсэх, хэн туслалцаа хэрэгтэй байгааг эндээс хардаг.
          {!loading && !error && ` Нийт ${total} сурагч.`}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="online-search">
          Код эсвэл нэрээр хайх
        </label>
        <input
          id="online-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Код эсвэл нэрээр хайх…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-dim/70 focus-visible:border-brand sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {PASS_FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setPassStatus(f.v)}
              aria-pressed={passStatus === f.v}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                passStatus === f.v
                  ? "border-brand bg-brand-bright/15 text-brand-soft"
                  : "border-line text-ink-dim hover:text-ink"
              }`}
            >
              {f.t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setActivity(f.v)}
              aria-pressed={activity === f.v}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activity === f.v
                  ? "border-brand bg-brand-bright/15 text-brand-soft"
                  : "border-line text-ink-dim hover:text-ink"
              }`}
            >
              {f.t}
            </button>
          ))}
        </div>
      </div>

      {dormantWithPassCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 p-3">
          <span aria-hidden className="text-lg">
            ⚠️
          </span>
          <p className="text-sm text-ink">
            <span className="font-semibold">{dormantWithPassCount} сурагчийн</span>{" "}
            эрх нь хүчинтэй хэрнээ идэвхгүй болсон — эргэж холбогдох
            шаардлагатай. Жагсаалтын дээд хэсэгт байна.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-line bg-panel"
            />
          ))}
          <p className="sr-only">Ачаалж байна…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
          <p className="font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {!loading && !error && ordered.length === 0 && (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center">
          <p className="text-2xl" aria-hidden>
            🔍
          </p>
          <p className="mt-2 font-semibold text-ink">Тохирох сурагч олдсонгүй</p>
          <p className="mt-1 text-sm text-ink-dim">
            {search || passStatus !== "ALL" || activity !== "ALL"
              ? "Хайлт эсвэл шүүлтээ өөрчилж дахин оролдоно уу."
              : "Одоогоор онлайн эрхтэй сурагч бүртгэгдээгүй байна."}
          </p>
        </div>
      )}

      {!loading && !error && ordered.length > 0 && (
        <div className="space-y-3">
          {ordered.map((s) => (
            <StudentRosterCard
              key={s.studentId}
              student={s}
              highlight={s.engagement === "DORMANT" && s.activePass !== null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
