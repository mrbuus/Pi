"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, getRole } from "@/lib/api";
import ActivityHeatmap from "@/components/activity/ActivityHeatmap";
import { ChapterProgressRow, OnlineStudentDetail } from "./types";
import { deriveEngagement, deriveLastActiveDate } from "./engagement";
import { errMsg, formatDate, formatRelative } from "./format";
import EngagementBadge from "./EngagementBadge";
import PassBadge from "./PassBadge";
import ChapterProgressList from "./ChapterProgressList";
import WeakestTopicsList from "./WeakestTopicsList";
import TestHistoryList from "./TestHistoryList";
import Timeline from "./Timeline";
import AssignTestDialog from "./AssignTestDialog";
import ResetChapterDialog from "./ResetChapterDialog";

export default function OnlineStudentDetailClient({ studentId }: { studentId: string }) {
  const [detail, setDetail] = useState<OnlineStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ⚠️ /progress/student/:id канэдит талбар буцаадаггүй — жинхэнэ хамгаалалт
  // сервер дээр мутаци бүрт (@Roles) хийгддэг тул энэ бол ЗӨВХӨН UI-г
  // харуулах/нуухад ашиглагдана.
  const canEdit = useMemo(() => {
    const role = getRole();
    return role === "ADMIN" || role === "TEACHER_PLUS";
  }, []);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<ChapterProgressRow | null>(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<OnlineStudentDetail>(`/progress/student/${studentId}`)
      .then(setDetail)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  function assignTest(testId: string, note: string) {
    setAssignSaving(true);
    setAssignError(null);
    api(`/progress/student/${studentId}/assign-test`, {
      method: "POST",
      body: { testId, note: note || undefined },
    })
      .then(() => {
        setAssignOpen(false);
        setAssignNotice("Тест амжилттай онооголоо.");
        setTimeout(() => setAssignNotice(null), 4000);
      })
      .catch((e) => setAssignError(errMsg(e)))
      .finally(() => setAssignSaving(false));
  }

  function resetChapter(reason: string) {
    if (!resetTarget || !detail) return;
    const chapterId = resetTarget.chapterId;
    const previous = detail;
    setResetSaving(true);
    setResetError(null);
    // Оптимист шинэчлэл — reset нь ЗӨВХӨН LearningEvent-ийн явцын тэмдэглэгээг
    // (онол үзсэн, бичлэг үзсэн) цэвэрлэнэ, Attempt (бодлого бодсон түүх)-д
    // хүрдэггүй тул problemsAttempted/successRate ӨӨРЧЛӨГДӨХГҮЙ.
    setDetail({
      ...detail,
      chapters: detail.chapters.map((c) =>
        c.chapterId === chapterId ? { ...c, theoryRead: false, videosWatched: 0 } : c,
      ),
    });
    api(`/progress/student/${studentId}/reset-chapter`, {
      method: "POST",
      body: { chapterId, reason },
    })
      .then(() => setResetTarget(null))
      .catch((e) => {
        setDetail(previous); // rollback
        setResetError(errMsg(e));
      })
      .finally(() => setResetSaving(false));
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-panel" />
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-panel" />
        <p className="sr-only">Ачаалж байна…</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!detail) return null;

  const classLabel = [
    detail.student.grade ? `${detail.student.grade}-р анги` : null,
    detail.student.school,
  ]
    .filter(Boolean)
    .join(" · ");

  const lastActiveDate = deriveLastActiveDate(detail.dailyActivity);
  const engagement = deriveEngagement(lastActiveDate);
  const totalAttempts = detail.chapters.reduce((sum, c) => sum + c.problemsAttempted, 0);
  const totalCorrect = detail.chapters.reduce((sum, c) => sum + c.problemsCorrect, 0);
  const overallSuccessRate =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  return (
    <div className="space-y-6">
      <Link href="/app/online" className="text-sm text-ink-dim transition hover:text-ink">
        ← Онлайн сурагчдын жагсаалт руу буцах
      </Link>

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink">{detail.student.name}</h1>
            <p className="text-sm text-ink-dim">
              {detail.student.studentCode ?? "Код тодорхойгүй"}
              {classLabel ? ` · ${classLabel}` : ""}
            </p>
          </div>
          <EngagementBadge level={engagement} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          <PassBadge activePass={detail.activePass} />
          <div>
            <p className="text-xs text-ink-dim">Сүүлд идэвхтэй</p>
            <p className="font-semibold text-ink">
              {lastActiveDate ? formatRelative(lastActiveDate) : "Идэвхжиж байгаагүй"}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-dim">Стрийк</p>
            <p className="font-semibold text-ink">
              🔥 {detail.streak.currentStreak} өдөр (дээд тал нь {detail.streak.longestStreak})
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-dim">Нийт бодсон бодлого</p>
            <p className="font-semibold text-ink">{totalAttempts}</p>
          </div>
          <div>
            <p className="text-xs text-ink-dim">Нийт амжилтын хувь</p>
            <p className="font-semibold text-ink">
              {overallSuccessRate === null ? "—" : `${overallSuccessRate}%`}
            </p>
          </div>
        </div>

        {detail.passHistory.length > 1 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-ink-dim hover:text-ink">
              Эрхийн түүх ({detail.passHistory.length})
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-ink-dim">
              {detail.passHistory.map((p, i) => (
                <li key={i}>
                  {p.name}: {formatDate(p.startsAt)} → {formatDate(p.expiresAt)}
                </li>
              ))}
            </ul>
          </details>
        )}

        {canEdit && (
          <div className="mt-4 border-t border-line pt-4">
            {assignNotice && (
              <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                {assignNotice}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setAssignError(null);
                setAssignOpen(true);
              }}
              className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
            >
              ➕ Тест оноох
            </button>
          </div>
        )}
        {!canEdit && (
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-dim">
            👁️ Та зөвхөн уншиж харах эрхтэй — засах бол Багш+ эсвэл Админаас хүснэ үү.
          </p>
        )}
      </section>

      <ActivityHeatmap studentId={studentId} />

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Бүлэг тус бүрийн явц</h2>
        <ChapterProgressList
          chapters={detail.chapters}
          canEdit={canEdit}
          onReset={(c) => {
            setResetError(null);
            setResetTarget(c);
          }}
        />
      </section>

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Сул талууд</h2>
        <WeakestTopicsList tags={detail.weakestTopics} />
      </section>

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Сүүлийн идэвх</h2>
        <Timeline studentId={studentId} canEdit={canEdit} />
      </section>

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-3 font-bold text-brand-soft">Тестийн түүх</h2>
        <TestHistoryList tests={detail.tests} />
      </section>

      <AssignTestDialog
        open={assignOpen}
        saving={assignSaving}
        error={assignError}
        onAssign={assignTest}
        onCancel={() => setAssignOpen(false)}
      />
      <ResetChapterDialog
        chapter={resetTarget}
        saving={resetSaving}
        error={resetError}
        onConfirm={resetChapter}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
