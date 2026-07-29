"use client";

import { Flame, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import HeatmapGrid, { HeatmapCell } from "./HeatmapGrid";
import {
  HOLIDAY_HATCH_STYLE,
  LEVEL_CLASS,
  StreakResponse,
  todayIso,
  YearActivityResponse,
} from "./types";

interface ActivityHeatmapProps {
  /**
   * Заавал биш. Хоосон бол нэвтэрсэн СУРАГЧ өөрийн идэвхийг харна (GET /activity/me).
   * Заасан бол БАГШ/АДМИН тухайн сурагчийн идэвхийг харна (GET /activity/student/:id) —
   * эрхийн шалгалт backend дээр хийгдэнэ (TEACHER зөвхөн өөрийн ангийн сурагчийг харна).
   */
  studentId?: string;
  /** Өгөгдмөл нь энэ жил. */
  year?: number;
}

/**
 * ХҮҮХДИЙН ИДЭВХИЙГ ТЭМДЭГЛЭЖ АВЧ ҮЛДЭХ (retention) зорилготой GitHub-style
 * жилийн heatmap. ⚠️ ЗӨВХӨН тухайн сурагчийн ӨӨРИЙНХ нь түүхийг харуулна — ангийн
 * жагсаалт, харьцуулалт ХЭЗЭЭ Ч ГАРГАХГҮЙ (over-justification болон нийгмийн
 * харьцуулалт хоёулаа сул сурагчдын дотоод урам зоригийг унагаадаг гэдэг
 * судалгааны үр дүнд үндэслэсэн шийдвэр).
 */
export default function ActivityHeatmap({ studentId, year }: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(year ?? currentYear);
  const [data, setData] = useState<YearActivityResponse | null>(null);
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSelf = !studentId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const yearPath = isSelf
      ? `/activity/me?year=${activeYear}`
      : `/activity/student/${studentId}?year=${activeYear}`;

    Promise.all([
      api<YearActivityResponse>(yearPath),
      // /activity/streak нь зөвхөн СУРАГЧ өөрөө дуудна (нэвтэрсэн хэрэглэгчийн
      // бүх түүхэн стрийкийг тооцно) — багшийн харах горимд доор жилийн
      // өгөгдлөөс ойролцоогоор тооцно.
      isSelf ? api<StreakResponse>("/activity/streak") : Promise.resolve(null),
    ])
      .then(([yearData, streakData]) => {
        if (cancelled) return;
        setData(yearData);
        setStreak(streakData);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeYear, studentId, isSelf]);

  // Багшийн харах горимд backend /activity/streak дуудагдахгүй тул, тухайн
  // жилийн өгөгдлөөс ОЙРОЛЦОО стрийк тооцно.
  // ⚠️ Санамж: жилийн зааг (12-р сар 31 → 1-р сар 1) дамнасан стрийк мөн
  // StreakFreeze эндээс харагдахгүй тул яг /activity/streak шиг нарийвчлалгүй —
  // энэ бол зорилготой тохироо, дэлгэрэнгүйг followUps-с үзнэ үү.
  const approxStreak = useMemo(() => {
    if (!data || isSelf) return null;
    const today = todayIso();
    let run = 0;
    let longest = 0;
    for (const day of data.days) {
      if (day.date > today) break;
      if (day.count > 0) {
        run += 1;
        longest = Math.max(longest, run);
      } else if (!day.isHoliday) {
        run = 0;
      }
    }
    return { currentStreak: run, longestStreak: longest };
  }, [data, isSelf]);

  const stats = isSelf ? streak : approxStreak;

  const cells: HeatmapCell[] = useMemo(() => {
    if (!data) return [];
    return data.days.map((day) => {
      const parts = [`${day.date}:`];
      if (day.isHoliday) {
        parts.push(
          day.count > 0
            ? `амралт өдөр — ${day.count} бодлого`
            : "амралт/завсарлагын өдөр (хичээлгүй)",
        );
      } else {
        parts.push(`${day.count} бодлого`);
      }
      return {
        date: day.date,
        colorClass: LEVEL_CLASS[day.level],
        isHoliday: day.isHoliday,
        ariaLabel: parts.join(" "),
      };
    });
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-2 font-bold text-brand-soft">Идэвхийн түүх</h2>
        <p className="text-sm text-ink-dim">Ачаалж байна…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-2 font-bold text-brand-soft">Идэвхийн түүх</h2>
        <p className="text-sm text-error">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const yearLabel = activeYear === currentYear ? "Энэ жил" : `${activeYear} онд`;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-bold text-brand-soft">Идэвхийн түүх</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setActiveYear((y) => y - 1)}
            className="rounded-lg border border-line px-2 py-1 text-ink-dim transition hover:text-ink"
            aria-label="Өмнөх жил харах"
          >
            ←
          </button>
          <span className="font-semibold text-ink">{activeYear}</span>
          <button
            onClick={() => setActiveYear((y) => y + 1)}
            disabled={activeYear >= currentYear}
            className="rounded-lg border border-line px-2 py-1 text-ink-dim transition hover:text-ink disabled:opacity-40"
            aria-label="Дараагийн жил харах"
          >
            →
          </button>
        </div>
      </div>

      {/* Дэлгэцийн уншигчид зориулсан текст хураангуй — өнгөнөөс үл хамааран ойлгогдоно */}
      <p className="mb-4 text-sm text-ink-dim">
        {yearLabel}{" "}
        <span className="font-semibold text-ink">{data.totalActiveDays}</span>{" "}
        өдөр идэвхтэй байлаа.
      </p>

      {stats && (
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-accent-teal/10 px-3 py-2">
            <Flame className="h-5 w-5 text-accent-teal" aria-hidden />
            <div>
              <p className="text-xs text-ink-dim">Одоогийн стрийк</p>
              <p className="font-bold text-ink">{stats.currentStreak} өдөр</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent-gold/10 px-3 py-2">
            <Trophy className="h-5 w-5 text-accent-gold" aria-hidden />
            <div>
              <p className="text-xs text-ink-dim">Хамгийн урт стрийк</p>
              <p className="font-bold text-ink">{stats.longestStreak} өдөр</p>
            </div>
          </div>
        </div>
      )}

      {/* Гар утсан дээр хажуу тийш гүйдэг, гэхдээ хуудасны бие хэзээ ч хажуу тийш гүйхгүй */}
      <div className="overflow-x-auto pb-2">
        <HeatmapGrid cells={cells} />
      </div>

      {/* Тайлбар — өнгө дангаараа утга илэрхийлдэггүй тул хэлбэрийн ялгааг ч тэмдэглэв */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-dim">
        <span>Бага</span>
        <div className="flex gap-1" aria-hidden>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[lvl]}`}
            />
          ))}
        </div>
        <span>Их</span>
        <span className="ml-2 flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px] border border-dashed border-line"
            style={HOLIDAY_HATCH_STYLE}
            aria-hidden
          />
          Амралт/завсарлага (хичээлгүй)
        </span>
      </div>
    </section>
  );
}
