"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

/* ============================================================================
 * Багш "энэ анги өнөөдөр энэ тестийг хийсэн" гэж бүртгэнэ.
 * Ингэснээр сурагчдын оройн тэмдэглэгээнд тухайн тестийн бодлогууд token
 * мэдэхгүйгээр гарч ирнэ (EveningMarking-тэй хосолно).
 *
 * Тест сонгох UI: Ном → (бичиж хайх) Сэдэв → Тест — 3 алхамтай, учир нь
 * бүх тестийг нэг л урт flat select-д хийвэл багш олон зуун сонголтоос
 * гараар хайх шаардлагатай болдог байсан (эзэмшигчийн гомдол).
 * ========================================================================== */

interface BookRow {
  id: string;
  code: string;
  title: string;
}
interface ChapterRow {
  id: string;
  title: string;
  grade?: number | null;
  _count: { tests: number };
}
interface TestRow {
  id: string;
  title: string;
  variantLabel?: string | null;
  chapterId?: string | null;
  _count: { problems: number };
}
interface SessionProblem {
  index: number;
  problemId: string;
  token: string;
  included: boolean;
}
interface SessionRow {
  id: string;
  date: string;
  excludedProblemIds: string[];
  test: { id: string; title: string; problems: SessionProblem[] } | null;
}

export default function ClassDidTest({ classroomId }: { classroomId: string }) {
  // Багшийн доор байгаа бүх тест (сонгосон сэдвээр шүүнэ)
  const [tests, setTests] = useState<TestRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Алхам 1: Ном
  const [books, setBooks] = useState<BookRow[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");

  // Алхам 2: Сэдэв (бичиж хайна)
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");

  // Алхам 3: Тест
  const [pick, setPick] = useState("");

  const [msg, setMsg] = useState("");
  const [toggleError, setToggleError] = useState("");

  const loadSessions = useCallback(() => {
    if (!classroomId) return;
    api<SessionRow[]>(`/classrooms/${classroomId}/test-sessions`)
      .then(setSessions)
      .catch(() => {});
  }, [classroomId]);

  useEffect(() => {
    api<TestRow[]>("/tests").then(setTests).catch(() => {});
    api<BookRow[]>("/books").then(setBooks).catch(() => {});
  }, []);
  useEffect(loadSessions, [loadSessions]);

  // Ном солигдоход дараагийн алхмуудыг цэвэрлэнэ, сэдвүүдийг ачаална
  useEffect(() => {
    setSelectedChapterId("");
    setTopicQuery("");
    setPick("");
    setChapters([]);
    if (!selectedBookId) return;
    setChaptersLoading(true);
    api<ChapterRow[]>(`/chapters?bookId=${selectedBookId}`)
      .then(setChapters)
      .catch(() => setChapters([]))
      .finally(() => setChaptersLoading(false));
  }, [selectedBookId]);

  // Сэдэв солигдоход сонгосон тестээ цэвэрлэнэ
  useEffect(() => {
    setPick("");
  }, [selectedChapterId]);

  // Зөвхөн ядаж 1 тесттэй сэдвүүдийг үзүүлнэ (хоосон сэдэв сонгоод юу ч
  // гарахгүй байх нөхцлөөс сэргийлнэ), бичсэн үгээр цааш шүүнэ
  const topicsWithTests = useMemo(
    () => chapters.filter((c) => c._count.tests > 0),
    [chapters],
  );
  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    const base = q
      ? topicsWithTests.filter((c) => c.title.toLowerCase().includes(q))
      : topicsWithTests;
    return base.slice(0, 20);
  }, [topicsWithTests, topicQuery]);

  const testsForChapter = useMemo(
    () => tests.filter((t) => t.chapterId === selectedChapterId),
    [tests, selectedChapterId],
  );

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);
  const selectedTest = tests.find((t) => t.id === pick);

  async function record() {
    if (!pick) return;
    setMsg("");
    try {
      await api(`/classrooms/${classroomId}/did-test`, {
        method: "POST",
        body: { testId: pick },
      });
      setMsg("✓ Бүртгэгдлээ — сурагчдын тэмдэглэгээнд гарч ирнэ");
      setSelectedBookId("");
      loadSessions();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  async function remove(id: string) {
    await api(`/test-sessions/${id}`, { method: "DELETE" });
    loadSessions();
  }

  // Тухайн сессийн нэг бодлогыг орсон/хассан болгож сэлгэнэ.
  //
  // ЗАСВАРЛААГҮЙ УДААН РИСК (race condition): сервер лүү бид ХАМГИЙН ЭЦСИЙН
  // тооцоолсон excludedProblemIds БҮХЭЛ БҮРЭН массивыг явуулдаг (version/ETag
  // шалгалтгүй "last write wins"). Хэрэв хоёр багш нэг зэрэг ижил сессийг
  // засвар хийвэл сүүлд хадгалсан нь өмнөхийг чимээгүй дарж бичнэ. Бүрэн
  // засвар backend-д optimistic-concurrency (жишээ нь updatedAt/version талбар
  // + 409 conflict) нэмэхийг шаардана — энд зөвхөн клиент талын хамгаалалт:
  // optimistic UI (хэрэглэгч шууд үр дүнг харна) + алдаа/зөрчил гарвал
  // серверийн жинхэнэ төлөвөөр дахин ачаална (refetch-on-conflict).
  //
  // ОЛСОН БОДИТ БАГ (энэ токсиныг эндээс олж засав): доорх optimistic update
  // өмнө нь ЗӨВХӨН `excludedProblemIds` талбарыг шинэчилдэг байсан. Гэтэл
  // товчлуурын өнгө/зурагдмал байдал нь `test.problems[].included` гэдэг
  // ӨӨР талбараас (сервериас сүүлд татсан хуучин утга) шалтгаалдаг байв.
  // Тиймээс дарахад сервер лүү зөв хүсэлт явж, амжилттай хадгалагдаж байсан
  // ч дэлгэц дээр ЯМАР Ч ӨӨРЧЛӨЛТ ХАРАГДАХГҮЙ байсан — багш "ажиллахгүй
  // байна" гэж бодох шалтгаан нь энэ. Одоо `included`-г мөн шууд шинэчилнэ.
  async function toggleProblem(s: SessionRow, problemId: string) {
    const excluded = new Set(s.excludedProblemIds);
    if (excluded.has(problemId)) excluded.delete(problemId);
    else excluded.add(problemId);
    const nextExcluded = [...excluded];

    setToggleError("");
    // Optimistic: хэрэглэгчид шууд харагдуулна, сервер хариу хүлээхгүй
    setSessions((prev) =>
      prev.map((row) => {
        if (row.id !== s.id) return row;
        return {
          ...row,
          excludedProblemIds: nextExcluded,
          test: row.test
            ? {
                ...row.test,
                problems: row.test.problems.map((p) =>
                  p.problemId === problemId
                    ? { ...p, included: !p.included }
                    : p,
                ),
              }
            : row.test,
        };
      }),
    );

    try {
      await api(`/test-sessions/${s.id}/excluded`, {
        method: "POST",
        body: { excludedProblemIds: nextExcluded },
      });
    } catch (e) {
      // Алдаа/боломжит мөргөлдөөн — локал таамаглалаа хаяж сервериас
      // жинхэнэ төлөвийг дахин татна, багшид бодит алдааг харуулна
      setToggleError(
        e instanceof Error
          ? e.message
          : "Хадгалахад алдаа гарлаа — жагсаалтыг дахин ачааллаа",
      );
      loadSessions();
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Өнөөдөр хийсэн тест</h2>
      <p className="mb-4 text-sm text-ink-dim">
        Ангид хийсэн тестээ сонгоход сурагчид цаасаа хараад өөрсдийгөө тэмдэглэнэ
      </p>

      {/* Алхам 1: Ном */}
      <div className="mb-3">
        <label
          htmlFor="did-test-book"
          className="mb-1 block text-xs font-semibold text-ink-dim"
        >
          1. Ном сонгох
        </label>
        <select
          id="did-test-book"
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          className="w-full min-h-11 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-brand-bright"
        >
          <option value="">Ном сонгох…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.title}
            </option>
          ))}
        </select>
      </div>

      {/* Алхам 2: Сэдэв (бичиж хайна) */}
      {selectedBookId && (
        <div className="mb-3">
          <label
            htmlFor="did-test-topic"
            className="mb-1 block text-xs font-semibold text-ink-dim"
          >
            2. Сэдэв хайх
          </label>
          <input
            id="did-test-topic"
            type="text"
            value={topicQuery}
            onChange={(e) => setTopicQuery(e.target.value)}
            placeholder="Сэдвийн нэрээр бичиж хайх…"
            className="w-full min-h-11 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />

          {chaptersLoading && (
            <p className="mt-2 text-sm text-ink-dim">Ачаалж байна…</p>
          )}

          {!chaptersLoading && topicsWithTests.length === 0 && (
            <p className="mt-2 text-sm text-ink-dim">
              Энэ номд тесттэй сэдэв алга
            </p>
          )}

          {!chaptersLoading && filteredTopics.length > 0 && (
            <div
              role="listbox"
              aria-label="Сэдвийн жагсаалт"
              className="mt-2 max-h-56 space-y-1.5 overflow-y-auto"
            >
              {filteredTopics.map((c) => {
                const isSelected = c.id === selectedChapterId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedChapterId(c.id)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-brand-bright bg-brand-tint font-semibold text-brand-soft"
                        : "border-line bg-ink/5 text-ink hover:bg-ink/10"
                    }`}
                  >
                    <span>{c.title}</span>
                    <span className="shrink-0 text-xs text-ink-dim">
                      {c._count.tests} тест
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {!chaptersLoading &&
            topicsWithTests.length > 0 &&
            topicQuery.trim() &&
            filteredTopics.length === 0 && (
              <p className="mt-2 text-sm text-ink-dim">
                “{topicQuery}” гэсэн сэдэв олдсонгүй
              </p>
            )}
        </div>
      )}

      {/* Алхам 3: Тест */}
      {selectedChapterId && (
        <div className="mb-3">
          <p className="mb-1 block text-xs font-semibold text-ink-dim">
            3. Тест сонгох
            {selectedChapter ? ` — ${selectedChapter.title}` : ""}
          </p>
          {testsForChapter.length === 0 ? (
            <p className="text-sm text-ink-dim">Энэ сэдэвт тест олдсонгүй</p>
          ) : (
            <div role="listbox" aria-label="Тестийн жагсаалт" className="space-y-1.5">
              {testsForChapter.map((t) => {
                const isSelected = t.id === pick;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setPick(t.id)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "border-brand-bright bg-brand-tint font-semibold text-brand-soft"
                        : "border-line bg-ink/5 text-ink hover:bg-ink/10"
                    }`}
                  >
                    <span>
                      {t.title}
                      {t.variantLabel ? ` (${t.variantLabel} хувилбар)` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-ink-dim">
                      {t._count.problems} бодлого
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {selectedTest && (
          <span className="text-sm text-ink-dim">
            Сонгосон: <span className="font-semibold text-ink">{selectedTest.title}</span>
          </span>
        )}
        <button
          onClick={record}
          disabled={!pick}
          className="ml-auto min-h-11 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Бүртгэх
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-success">{msg}</p>}

      {toggleError && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {toggleError}</span>
          <button
            onClick={() => setToggleError("")}
            className="ml-auto rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Хаах
          </button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {sessions.map((s) => {
            const includedCount =
              s.test?.problems.filter((p) => p.included).length ?? 0;
            return (
              <div
                key={s.id}
                className="rounded-lg border border-line p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-ink-dim">{s.date.slice(0, 10)}</span>
                  <span className="font-medium">{s.test?.title ?? "—"}</span>
                  <span className="text-xs text-ink-dim">
                    {includedCount}/{s.test?.problems.length ?? 0} бодлого орсон
                  </span>
                  <button
                    onClick={() => remove(s.id)}
                    className="ml-auto text-xs text-error hover:underline"
                  >
                    Устгах
                  </button>
                </div>
                {/* Бодлого бүрийг орсон/хассан болгож сэлгэнэ */}
                {s.test && s.test.problems.length > 0 && (
                  <div className="mt-2.5">
                    <p className="mb-1.5 text-[11px] text-ink-dim">
                      Алгассан бодлогыг дарж хасаарай (саарал = хассан):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.test.problems.map((p) => (
                        <button
                          key={p.problemId}
                          onClick={() => toggleProblem(s, p.problemId)}
                          title={p.token}
                          className={`h-7 w-7 rounded-lg border text-xs font-bold transition ${
                            p.included
                              ? "border-success/50 bg-success/15 text-success"
                              : "border-line bg-ink/5 text-ink-dim line-through"
                          }`}
                        >
                          {p.index}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
