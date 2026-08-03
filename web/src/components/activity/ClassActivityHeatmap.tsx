"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import HeatmapGrid, { HeatmapCell } from "./HeatmapGrid";
import {
  ClassYearActivityResponse,
  HOLIDAY_HATCH_STYLE,
  LEVEL_CLASS,
} from "./types";

interface ClassActivityHeatmapProps {
  classroomId: string;
  year?: number;
}

/**
 * Ангийн БҮЛЭГ идэвхийн жилийн heatmap — "анги бүхэлдээ аль өдөр идэвхтэй
 * байсан бэ" гэдгийг л харуулна. ⚠️ Сурагч тус бүрийн жагсаалт/рэйтинг
 * ХЭЗЭЭ Ч ГАРГАХГҮЙ — зөвхөн тухайн өдөр идэвхтэй байсан сурагчийн ХУВЬ
 * (0-100%) дээр суурилсан нэгдсэн дүр зураг.
 */
export default function ClassActivityHeatmap({
  classroomId,
  year,
}: ClassActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(year ?? currentYear);
  const [data, setData] = useState<ClassYearActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<ClassYearActivityResponse>(
      `/activity/classroom/${classroomId}?year=${activeYear}`,
    )
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [classroomId, activeYear]);

  const activeDaysCount = useMemo(
    () => data?.days.filter((d) => d.activeStudents > 0).length ?? 0,
    [data],
  );

  const cells: HeatmapCell[] = useMemo(() => {
    if (!data) return [];
    return data.days.map((day) => ({
      date: day.date,
      colorClass: LEVEL_CLASS[day.level],
      isHoliday: day.isHoliday,
      ariaLabel: day.isHoliday
        ? `${day.date}: амралт/завсарлагын өдөр (хичээлгүй)`
        : `${day.date}: ${day.activeStudents}/${day.totalStudents} сурагч идэвхтэй байсан (${day.percent}%)`,
    }));
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-2 font-bold text-brand-soft">Ангийн идэвхийн түүх</h2>
        <p className="text-sm text-ink-dim">Ачаалж байна…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-2 font-bold text-brand-soft">Ангийн идэвхийн түүх</h2>
        <p className="text-sm text-error">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const yearLabel = activeYear === currentYear ? "Энэ жил" : `${activeYear} онд`;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-bold text-brand-soft">Ангийн идэвхийн түүх</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setActiveYear((y) => y - 1)}
            className="rounded-lg border border-line p-1 text-ink-dim transition hover:text-ink"
            aria-label="Өмнөх жил харах"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="font-semibold text-ink">{activeYear}</span>
          <button
            onClick={() => setActiveYear((y) => y + 1)}
            disabled={activeYear >= currentYear}
            className="rounded-lg border border-line p-1 text-ink-dim transition hover:text-ink disabled:opacity-40"
            aria-label="Дараагийн жил харах"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm text-ink-dim">
        {yearLabel} анги{" "}
        <span className="font-semibold text-ink">{activeDaysCount}</span> өдөр
        идэвхтэй байсан ({data.totalStudents} сурагчаас доод тал нь нэг нь
        бодлого бодсон өдрүүд).
      </p>

      <div className="overflow-x-auto pb-2">
        <HeatmapGrid cells={cells} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-dim">
        <span>0%</span>
        <div className="flex gap-1" aria-hidden>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[lvl]}`}
            />
          ))}
        </div>
        <span>75%+</span>
        <span className="ml-2 flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px] border border-dashed border-line"
            style={HOLIDAY_HATCH_STYLE}
            aria-hidden
          />
          Амралт/завсарлага (хичээлгүй)
        </span>
      </div>

      <p className="mt-3 text-xs text-ink-dim">
        Энэ бол ангийн нэгдсэн дүр зураг — сурагч тус бүрийн жагсаалт,
        харьцуулалт биш.
      </p>
    </section>
  );
}
