"use client";

import { useCallback, useEffect, useState } from "react";
import RequireRole from "@/components/nav/RequireRole";
import { api } from "@/lib/api";
import { fullName, type StudentDetailData } from "../types";
import ClassProgressTab from "./ClassProgressTab";
import IndependentProgressTab from "./IndependentProgressTab";

type TabKey = "class" | "independent";
const TAB_KEYS: TabKey[] = ["class", "independent"];
const TAB_LABELS: Record<TabKey, string> = {
  class: "Ангийн явц",
  independent: "Бие даасан явц",
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Сурагчийн явцын дэлгэрэнгүй хуудас (/app/students/:id) — Багш/Багш+/Админ.
 * Хоёр таб: "Ангийн явц" (ирц + өдөр тутмын гэрийн даалгаврын тэмдэглэгээ)
 * болон "Бие даасан явц" (идэвхийн heatmap+стрийк, онлайн шалгалтын дүн).
 * Таб-ийн сонголт ?tab=class|independent query параметрт хадгалагдана
 * (TeacherDashboardClient.tsx-ийн ?tab= хэв маягтай ижил).
 */
export default function StudentProgress({ studentId }: { studentId: string }) {
  const [detail, setDetail] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<StudentDetailData>(`/users/${studentId}`)
      .then(setDetail)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [studentId]);
  useEffect(load, [load]);

  const [tab, setTab] = useState<TabKey>("class");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (TAB_KEYS as string[]).includes(t)) setTab(t as TabKey);
  }, []);
  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
  }, []);

  const grade = detail?.studentProfile?.grade;
  const classroomName = detail?.currentClassroom?.name;

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-ink-dim transition hover:text-ink"
        >
          ← Буцах
        </button>

        {loading && (
          <div className="h-20 animate-pulse rounded-2xl border border-line bg-panel" aria-busy="true" />
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center">
            <p className="font-semibold text-error">⚠ {error}</p>
            <button
              onClick={load}
              className="mt-3 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
            >
              Дахин оролдох
            </button>
          </div>
        )}

        {!loading && !error && detail && (
          <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
            <h1 className="text-xl font-bold text-ink">{fullName(detail)}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-dim">
              {grade && <span>{grade}-р анги</span>}
              {classroomName && <span>Анги: {classroomName}</span>}
              {!grade && !classroomName && <span>Анги тодорхойгүй</span>}
              {detail.studentCode && (
                <span className="font-mono text-xs">{detail.studentCode}</span>
              )}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Сурагчийн явцын хэсгүүд"
          className="flex gap-2 border-b border-line"
        >
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => changeTab(key)}
              className={`min-h-11 rounded-t-lg px-4 text-sm font-bold transition ${
                tab === key
                  ? "border-b-2 border-brand-bright text-brand-soft"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {tab === "class" && <ClassProgressTab studentId={studentId} />}
        {tab === "independent" && <IndependentProgressTab studentId={studentId} />}
      </div>
    </RequireRole>
  );
}
