"use client";
import { useState } from "react";
import { BookOpen, CalendarDays } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import MathText from "@/components/MathText";
import { ChildReviewHistory } from "@/components/study/ReviewHistory";
import { Button } from "@/components/ui/kit/button";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
export type PageRows<T> = { rows: T[]; hasMore: boolean };
type Submission = {
  id: string;
  state: string;
  imageKeys: string[];
  studentNote?: string | null;
  reviewNote?: string | null;
  submittedAt: string | null;
  checkedAt: string | null;
  assignment: { title: string };
  revisions?: {
    id: string;
    action: string;
    state: string;
    studentNote?: string | null;
    reviewNote?: string | null;
    imageKeys: string[];
    at: string;
  }[];
};
type Attempt = {
  id: string;
  testId: string | null;
  source: string;
  occurredOn: string;
  autoCorrect: boolean | null;
  selfState: string | null;
  givenAnswer: unknown;
  problem: { token: string; chapterId: string; chapter: { title: string } };
};
type Result = {
  id: string;
  testId: string;
  source: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  test: { title: string };
};
type Learning = {
  id: string;
  problemId: string;
  at: string;
  evidence: {
    kind: string;
    answer: string | null;
    correct: boolean | null;
    mode: string | null;
    flags: string[];
  } | null;
};
type Dismissal = {
  id: string;
  date: string;
  approximateAt: string;
  lastLeftAt: string | null;
  note: string | null;
  classroom: { name: string };
};
type ChildHistoryData = {
  year: number;
  page: number;
  summary: {
    activeDays: number;
    attemptCount: number;
    learningEventCount: number;
    days: { date: string; attempts: number }[];
  };
  attempts: PageRows<Attempt>;
  learning: PageRows<Learning>;
  homework: PageRows<{
    id: string;
    date: string;
    status: string;
    comment?: string | null;
    classroom: { name: string };
  }>;
  submissions: PageRows<Submission>;
  results: PageRows<Result>;
  attendance: PageRows<{
    id: string;
    date: string;
    status: string;
    classroom: { name: string };
  }>;
  dismissals?: PageRows<Dismissal>;
  lessonPackets?: PageRows<{
    id: string;
    date: string;
    chapter: { title: string };
    receipts: {
      id: string;
      kind: string;
      imageKeys: string[];
      submittedAt: string;
    }[];
  }>;
};
const REVIEW_ACTIONS = ["APPROVE", "RETURN", "MARK_IN_CLASS"];
const REVISION_ACTION: Record<string, string> = {
  SUBMIT: "Сурагч илгээсэн",
  APPROVE: "Багш баталсан",
  RETURN: "Багш буцаасан",
  MARK_IN_CLASS: "Ангид шалгасан",
  LEGACY: "Өмнөх эх сурвалж",
};
const HOMEWORK: Record<string, string> = {
  DONE: "Хийсэн",
  PARTIAL: "Дутуу",
  NOT_DONE: "Хийгээгүй",
};
const STATUS: Record<string, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Тасалсан",
  EXCUSED: "Чөлөөтэй",
  SUBMITTED: "Шалгуулахаар илгээсэн",
  RETURNED: "Дахин илгээх",
  DONE_ONLINE: "Багш шалгасан",
  DONE_IN_CLASS: "Ангид шалгасан",
  NOT_DONE: "Илгээгээгүй",
};
const SOURCE: Record<string, string> = {
  EVENING_SELF_REPORT: "Сурагчийн өөрийн тэмдэглэгээ",
  ONLINE_TEST: "Онлайн шалгалтын дүн",
  CHAPTER_EXAM: "Багшийн үнэлгээ",
  OMR_IMPORT: "Хариултын хуудасны дүн",
};
const KIND: Record<string, string> = {
  first: "Анхны хариулт",
  "retry-before-solution": "Бодолт үзэхээс өмнөх давталт",
  "solution-assisted-correction": "Бодолт үзсэн засвар",
  "solution-viewed": "Бодолт үзсэн",
};
const date = (value: string) =>
  new Date(value).toLocaleDateString("mn-MN", { timeZone: "Asia/Ulaanbaatar" });
function readableAnswer(value: unknown) {
  if (value === null || value === undefined) return "Хариулт хадгалаагүй";
  if (typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  return String(value);
}
export default function ChildHistory({ studentId }: { studentId: string }) {
  const [year, setYear] = useState(() => new Date().getFullYear()),
    [page, setPage] = useState(1),
    [data, setData] = useState<ChildHistoryData | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [theory, setTheory] = useState<{
      chapter: { title: string };
      theories: {
        id: string;
        title: string;
        content: string;
        imageKeys: string[];
      }[];
    } | null>(null),
    [theoryBusy, setTheoryBusy] = useState(false),
    [theoryError, setTheoryError] = useState("");
  async function load(nextPage = 1) {
    setBusy(true);
    setError("");
    setTheory(null);
    try {
      setData(
        await api(
          `/parent/children/${encodeURIComponent(studentId)}/history?year=${year}&page=${nextPage}`,
        ),
      );
      setPage(nextPage);
    } catch {
      setError(
        "Түүх нээгдсэнгүй. Холболт болон хүүхэдтэй холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openTheory(chapterId: string) {
    setTheoryBusy(true);
    setTheoryError("");
    try {
      setTheory(
        await api(
          `/parent/children/${encodeURIComponent(studentId)}/theory/${encodeURIComponent(chapterId)}`,
        ),
      );
    } catch {
      setTheoryError(
        "Энэ сэдвийн хичээл нээгдсэнгүй. Хүүхдийн хичээлийн эрхийг шалгана уу.",
      );
    } finally {
      setTheoryBusy(false);
    }
  }
  const more =
    data &&
    [
      data.attempts,
      data.learning,
      data.homework,
      data.submissions,
      data.results,
      data.attendance,
      data.dismissals,
      data.lessonPackets,
    ].some((group) => group?.hasMore);
  return (
    <details className="rounded-xl border border-line p-4">
      <summary className="min-h-11 cursor-pointer font-semibold flex gap-2 items-center">
        <CalendarDays size={18} /> Жилийн идэвх ба бүрэн түүх
      </summary>
      <div className="mt-3 space-y-4">
        <p className="text-sm text-ink-dim">
          Жилээ сонгоод тухайн жилийн бодит бүртгэлийг үзнэ. Өдөр, дүн, засвар
          нь тусдаа мэдээлэл.
        </p>
        <ChildReviewHistory key={studentId} childId={studentId} />
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label className="flex-1">
            Жил
            <input
              type="number"
              min={2000}
              max={new Date().getFullYear() + 1}
              className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setData(null);
              }}
            />
          </label>
          <Button disabled={busy}>Түүх нээх</Button>
        </form>
        {busy && <LoadingState rows={4} />}
        {error && <ErrorState message={error} onRetry={() => load(page)} />}
        {!busy && data && (
          <>
            <div className="rounded-lg bg-panel p-3 text-sm space-y-2">
              <p>
                {data.year} онд бодлого бодсон {data.summary.activeDays} өдөр,
                эх сангийн {data.summary.attemptCount} оролдлого, шинэ сурах
                урсгалын {data.summary.learningEventCount} үйлдэл.
              </p>
              <p className="text-ink-dim">
                Оролдлогын тоо нь чадварын оноо биш. Хоосон өдөр нь мэдээлэл
                бүртгэгдээгүйг илэрхийлнэ.
              </p>
            </div>
            <details>
              <summary className="min-h-11 cursor-pointer font-semibold">
                Өдөр бүрийн идэвх
              </summary>
              <div className="max-h-64 overflow-auto space-y-1">
                {data.summary.days.map((d) => (
                  <p key={d.date} className="text-sm">
                    {date(d.date)} — {d.attempts} оролдлого
                  </p>
                ))}
                {!data.summary.days.length && (
                  <p>Энэ жилд эх сангийн оролдлого бүртгээгүй.</p>
                )}
              </div>
            </details>
            <details>
              <summary className="min-h-11 cursor-pointer font-semibold">
                Анхны хариулт, давталт, засвар
              </summary>
              <div className="space-y-3">
                {!data.learning.rows.length && (
                  <p className="text-sm text-ink-dim">
                    Энэ жилийн шинэ урсгалын бүртгэл хараахан байхгүй.
                  </p>
                )}
                {data.learning.rows.map(
                  (row) =>
                    row.evidence && (
                      <article
                        key={row.id}
                        className="border-t border-line py-3 text-sm space-y-2"
                      >
                        <p>
                          {date(row.at)} —{" "}
                          {KIND[row.evidence.kind] ?? "Сурах үйлдэл"}
                        </p>
                        {row.evidence.answer && (
                          <MathText>{`$${row.evidence.answer}$`}</MathText>
                        )}
                        <p>
                          {row.evidence.correct === null
                            ? "Үнэлгээ байхгүй"
                            : row.evidence.correct
                              ? "Зөв"
                              : "Дахин бодох"}
                          {row.evidence.mode === "classroom"
                            ? " — дэвтрийн өөрийн тэмдэглэгээ"
                            : row.evidence.mode === "probe"
                              ? " — хугацааны дараах шинэ шалгалт"
                              : ""}
                        </p>
                        {row.evidence.flags?.length > 0 && (
                          <p className="text-ink-dim">
                            Сурагч эргэлзсэн, таасан эсвэл тусламжийн
                            тэмдэглэгээ нэмсэн.
                          </p>
                        )}
                      </article>
                    ),
                )}
              </div>
            </details>
            <details>
              <summary className="min-h-11 cursor-pointer font-semibold">
                Сурагчийн тэмдэглэгээ ба багшийн дүн
              </summary>
              <div className="space-y-3">
                <p className="text-sm text-ink-dim">
                  Сурагчийн өөрийн тэмдэглэгээ багшийн шалгасан онооноос
                  ялгаатай. Эхний алдааг засварын дүн солихгүй.
                </p>
                {data.results.rows.map((r) => {
                  const reported = data.attempts.rows.filter(
                    (a) =>
                      a.testId === r.testId &&
                      a.source === "EVENING_SELF_REPORT",
                  );
                  return (
                    <article
                      key={r.id}
                      className="border-t border-line py-3 space-y-2 text-sm"
                    >
                      <h4 className="font-semibold">{r.test.title}</h4>
                      <p>
                        {SOURCE[r.source] ?? "Шалгалтын дүн"}: {r.totalScore}/
                        {r.maxScore} — {date(r.createdAt)}
                      </p>
                      {reported.length ? (
                        <p>
                          Энэ хуудсанд сурагчийн {reported.length} тэмдэглэгээ
                          байна. Зөвхөн холбогдох тестийн бүртгэл.
                        </p>
                      ) : (
                        <p className="text-ink-dim">
                          Энэ хуудсанд өмнөх өөрийн тэмдэглэгээ байхгүй.
                          Онооноос анхны хариултыг таамаглахгүй.
                        </p>
                      )}
                    </article>
                  );
                })}
                {data.attempts.rows.map((a) => (
                  <article
                    key={a.id}
                    className="border-t border-line py-3 text-sm space-y-2"
                  >
                    <p>
                      {date(a.occurredOn)} — {a.problem.token} —{" "}
                      {SOURCE[a.source] ?? "Оролдлого"}
                    </p>
                    <MathText>{readableAnswer(a.givenAnswer)}</MathText>
                    <p>
                      {a.selfState === "FIXED_AFTER_ERROR"
                        ? "Алдаад зассан — өөрийн тэмдэглэгээ"
                        : a.selfState === "GUESSED"
                          ? "Таасан — өөрийн тэмдэглэгээ"
                          : a.autoCorrect === null
                            ? "Автомат дүн бүртгээгүй"
                            : a.autoCorrect
                              ? "Зөв"
                              : "Буруу"}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => openTheory(a.problem.chapterId)}
                    >
                      <BookOpen size={16} />
                      {a.problem.chapter.title} — онол
                    </Button>
                  </article>
                ))}
                {!data.results.rows.length && !data.attempts.rows.length && (
                  <p>Дүн, оролдлого бүртгээгүй.</p>
                )}
              </div>
            </details>
            {!!data.lessonPackets?.rows.length && (
              <details>
                <summary>Хичээлийн өдөр ба хүүхдийн илгээсэн хавсралт</summary>
                {data.lessonPackets.rows.map((day) => (
                  <div key={day.id} className="my-3">
                    <p>
                      {day.date.slice(0, 10)} — {day.chapter.title}
                    </p>
                    {day.receipts.map((r) => (
                      <div key={r.id}>
                        <p>
                          {r.kind} ·{" "}
                          {new Date(r.submittedAt).toLocaleString("mn-MN")}
                        </p>
                        {r.imageKeys.map((k) => (
                          <a
                            key={k}
                            className="block text-primary underline"
                            href={fileUrl(k)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Хүүхдийн илгээсэн хавсралт
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </details>
            )}
            {theoryBusy && <LoadingState rows={2} />}
            {theoryError && (
              <p role="alert" className="text-error">
                {theoryError}
              </p>
            )}
            {theory && (
              <div className="rounded-xl border border-line p-3 space-y-3">
                <h4 className="font-semibold">{theory.chapter.title}</h4>
                {theory.theories.map((block) => (
                  <details key={block.id}>
                    <summary className="min-h-11 cursor-pointer">
                      {block.title}
                    </summary>
                    <MathText>{block.content}</MathText>
                    {block.imageKeys.map((key) => (
                      <a
                        key={key}
                        href={fileUrl(key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block min-h-11 text-brand underline"
                      >
                        Зураг эсвэл баримт нээх
                      </a>
                    ))}
                  </details>
                ))}
                {!theory.theories.length && <p>Онол хараахан нэмээгүй.</p>}
              </div>
            )}
            <details>
              <summary className="min-h-11 cursor-pointer font-semibold">
                Даалгаврын илгээлт ба шалгалтын түүх
              </summary>
              <div className="space-y-3">
                {data.homework.rows.map((row) => (
                  <p key={row.id} className="text-sm">
                    {date(row.date)} — {row.classroom.name} —{" "}
                    {HOMEWORK[row.status] ?? "Тэмдэглэсэн"}
                    {row.comment ? ` — ${row.comment}` : ""}
                  </p>
                ))}
                {data.submissions.rows.map((row) => (
                  <article
                    key={row.id}
                    className="border-t border-line py-3 text-sm space-y-2"
                  >
                    <h4 className="font-semibold">{row.assignment.title}</h4>
                    <p>Одоогийн төлөв: {STATUS[row.state] ?? "Тэмдэглэсэн"}</p>
                    {row.revisions?.some(
                      (revision) => revision.action === "SUBMIT",
                    ) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-panel p-3">
                          <p className="font-semibold">
                            Энэ жилийн эхний илгээлт
                          </p>
                          <p>
                            {date(
                              row.revisions.find(
                                (revision) => revision.action === "SUBMIT",
                              )!.at,
                            )}
                          </p>
                          <p>
                            {row.revisions.find(
                              (revision) => revision.action === "SUBMIT",
                            )!.studentNote ?? "Сурагч тайлбар бичээгүй"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-panel p-3">
                          <p className="font-semibold">
                            Энэ жилийн багшийн сүүлийн хариу
                          </p>
                          {row.revisions.filter((revision) =>
                            REVIEW_ACTIONS.includes(revision.action),
                          ).length ? (
                            <>
                              <p>
                                {date(
                                  row.revisions
                                    .filter((revision) =>
                                      REVIEW_ACTIONS.includes(revision.action),
                                    )
                                    .slice(-1)[0].at,
                                )}
                              </p>
                              <p>
                                {row.revisions
                                  .filter((revision) =>
                                    REVIEW_ACTIONS.includes(revision.action),
                                  )
                                  .slice(-1)[0].reviewNote ??
                                  "Тайлбар нэмээгүй"}
                              </p>
                              <p>
                                {STATUS[
                                  row.revisions
                                    .filter((revision) =>
                                      REVIEW_ACTIONS.includes(revision.action),
                                    )
                                    .slice(-1)[0].state
                                ] ?? "Шалгасан"}
                              </p>
                            </>
                          ) : (
                            <p>Энэ жилд багшийн хариу бүртгээгүй.</p>
                          )}
                        </div>
                      </div>
                    )}
                    {row.studentNote && (
                      <p>Сурагчийн тайлбар: {row.studentNote}</p>
                    )}
                    {row.reviewNote && <p>Багшийн хариу: {row.reviewNote}</p>}
                    {row.imageKeys.map((key) => (
                      <a
                        key={key}
                        href={fileUrl(key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block min-h-11 text-brand underline"
                      >
                        Илгээсэн зураг нээх
                      </a>
                    ))}
                    {row.revisions?.map((revision) => (
                      <div
                        key={revision.id}
                        className="rounded-lg bg-panel p-3 space-y-2"
                      >
                        <p>
                          {date(revision.at)} —{" "}
                          {REVISION_ACTION[revision.action] ?? "Бүртгэл"} —{" "}
                          {STATUS[revision.state] ?? "Бүртгэл"}
                        </p>
                        {revision.studentNote && <p>{revision.studentNote}</p>}
                        {revision.reviewNote && (
                          <p>Багшийн хариу: {revision.reviewNote}</p>
                        )}
                        {revision.imageKeys.map((key) => (
                          <a
                            key={key}
                            href={fileUrl(key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block min-h-11 text-brand underline"
                          >
                            Энэ илгээлтийн зураг
                          </a>
                        ))}
                      </div>
                    ))}
                  </article>
                ))}
                {!data.homework.rows.length &&
                  !data.submissions.rows.length && (
                    <p>Энэ жилийн даалгаврын бүртгэл байхгүй.</p>
                  )}
              </div>
            </details>
            <details>
              <summary className="min-h-11 cursor-pointer font-semibold">
                Ирц ба ангийн тарах ойролцоо цаг
              </summary>
              <div className="space-y-2 text-sm">
                {data.attendance.rows.map((row) => (
                  <p key={row.id}>
                    {date(row.date)} — {row.classroom.name} —{" "}
                    {STATUS[row.status] ?? "Тэмдэглэсэн"}
                  </p>
                ))}
                {data.dismissals?.rows.map((row) => (
                  <article
                    key={row.id}
                    className="border-t border-line pt-3 space-y-2"
                  >
                    <p>
                      {date(row.date)} — {row.classroom.name}
                    </p>
                    <p>
                      Анги тарах ойролцоо цаг:{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Asia/Ulaanbaatar",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(row.approximateAt))}
                    </p>
                    <p className="text-ink-dim">
                      Хүүхдийн бодит гарсан цаг биш. Багшийн гаргасан ангийн
                      мэдээлэл.
                    </p>
                    {row.lastLeftAt && (
                      <p>
                        Ангийн сүүлийн сурагч явсан цаг:{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          timeZone: "Asia/Ulaanbaatar",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }).format(new Date(row.lastLeftAt))}
                        . Хүүхэд тус бүрийн гарсан цаг биш.
                      </p>
                    )}
                    {row.note && <p>{row.note}</p>}
                  </article>
                ))}
                {!data.attendance.rows.length &&
                  !data.dismissals?.rows.length && (
                    <p>Ирц, ангийн тарах цагийн бүртгэл байхгүй.</p>
                  )}
              </div>
            </details>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || busy}
                onClick={() => load(page - 1)}
              >
                Өмнөх
              </Button>
              <span className="text-sm">Хуудас {page}</span>
              <Button
                variant="outline"
                disabled={!more || busy || page >= 1000}
                onClick={() => load(page + 1)}
              >
                Дараах
              </Button>
            </div>
            <p className="text-xs text-ink-dim">
              Төрөл бүрийн бүртгэлийг нэг хуудсанд 50 хүртэл харуулна. Жилийн
              нийт үзүүлэлт хуудаснаас хамаарахгүй.
            </p>
          </>
        )}
      </div>
    </details>
  );
}
