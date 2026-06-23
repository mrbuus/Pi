"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/* ============================================================================
 * Багш "энэ анги өнөөдөр энэ тестийг хийсэн" гэж бүртгэнэ.
 * Ингэснээр сурагчдын оройн тэмдэглэгээнд тухайн тестийн бодлогууд token
 * мэдэхгүйгээр гарч ирнэ (EveningMarking-тэй хосолно).
 * ========================================================================== */

interface TestRow {
  id: string;
  title: string;
  variantLabel?: string;
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
  const [tests, setTests] = useState<TestRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState("");

  const loadSessions = useCallback(() => {
    if (!classroomId) return;
    api<SessionRow[]>(`/classrooms/${classroomId}/test-sessions`)
      .then(setSessions)
      .catch(() => {});
  }, [classroomId]);

  useEffect(() => {
    api<TestRow[]>("/tests").then(setTests).catch(() => {});
  }, []);
  useEffect(loadSessions, [loadSessions]);

  async function record() {
    if (!pick) return;
    setMsg("");
    try {
      await api(`/classrooms/${classroomId}/did-test`, {
        method: "POST",
        body: { testId: pick },
      });
      setMsg("✓ Бүртгэгдлээ — сурагчдын тэмдэглэгээнд гарч ирнэ");
      setPick("");
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
  // Зарим анги хэцүү бодлогуудыг алгасдаг тул багш хасч болно.
  async function toggleProblem(s: SessionRow, problemId: string) {
    const excluded = new Set(s.excludedProblemIds);
    if (excluded.has(problemId)) excluded.delete(problemId);
    else excluded.add(problemId);
    await api(`/test-sessions/${s.id}/excluded`, {
      method: "POST",
      body: { excludedProblemIds: [...excluded] },
    });
    loadSessions();
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Өнөөдөр хийсэн тест</h2>
      <p className="mb-4 text-sm text-ink-dim">
        Ангид хийсэн тестээ сонгоход сурагчид цаасаа хараад өөрсдийгөө тэмдэглэнэ
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="min-w-48 flex-1 rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm"
        >
          <option value="">Тест сонгох…</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {t.variantLabel ? ` (${t.variantLabel})` : ""} ·{" "}
              {t._count.problems} бодлого
            </option>
          ))}
        </select>
        <button
          onClick={record}
          disabled={!pick}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Бүртгэх
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-teal-300">{msg}</p>}

      {sessions.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
          {sessions.map((s) => {
            const includedCount =
              s.test?.problems.filter((p) => p.included).length ?? 0;
            return (
              <div
                key={s.id}
                className="rounded-lg border border-white/8 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-ink-dim">{s.date.slice(0, 10)}</span>
                  <span className="font-medium">{s.test?.title ?? "—"}</span>
                  <span className="text-xs text-ink-dim">
                    {includedCount}/{s.test?.problems.length ?? 0} бодлого орсон
                  </span>
                  <button
                    onClick={() => remove(s.id)}
                    className="ml-auto text-xs text-red-300 hover:underline"
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
                              ? "border-teal-400/50 bg-teal-400/15 text-teal-300"
                              : "border-white/10 bg-white/5 text-ink-dim line-through"
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
