"use client";

import { useCallback, useEffect, useState } from "react";
import MathText from "@/components/MathText";
import { api } from "@/lib/api";

/* ============================================================================
 * Оройн тэмдэглэгээ — token-гүй, тест дээр суурилсан хувилбар.
 *
 * Хуучин загвар: хүүхэд "100-23-05" гэсэн token бичих ёстой байсан — хэт хэцүү.
 * Шинэ загвар: багш "ангид өнөөдөр энэ тестийг хийсэн" гэж бүртгэнэ → бодлогууд
 * автоматаар гарч ирнэ → хүүхэд цаасаа хараад бодлого бүрийг нэг товчоор
 * тэмдэглэнэ (token мэдэх шаардлагагүй). 4–5 минутын дотор амар.
 * ========================================================================== */

const STATES = [
  { value: "SOLVED_CLEAN", label: "Алдаагүй", tone: "ok" },
  { value: "FIXED_AFTER_ERROR", label: "Зассан", tone: "warn" },
  { value: "FAILED", label: "Алдсан", tone: "bad" },
  { value: "GUESSED", label: "Буудсан", tone: "guess" },
] as const;

const TONE: Record<string, string> = {
  ok: "border-teal-400/60 bg-teal-400/20 text-teal-200",
  warn: "border-amber-400/60 bg-amber-400/20 text-amber-200",
  bad: "border-red-400/60 bg-red-400/20 text-red-200",
  guess: "border-indigo-400/60 bg-indigo-400/20 text-indigo-200",
};

interface TodoProblem {
  index: number;
  problemId: string;
  token: string;
  statementText?: string;
  imageKey?: string;
  myState: string | null;
}
interface TodoSession {
  sessionId: string;
  date: string;
  test: { id: string; title: string };
  problems: TodoProblem[];
}

export default function EveningMarking() {
  const [sessions, setSessions] = useState<TodoSession[]>([]);
  // problemId → одоогийн тэмдэглэгээ (optimistic)
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    api<TodoSession[]>("/me/todo-marking")
      .then((data) => {
        setSessions(data);
        const initial: Record<string, string> = {};
        data.forEach((s) =>
          s.problems.forEach((p) => {
            if (p.myState) initial[p.problemId] = p.myState;
          }),
        );
        setMarks(initial);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);
  useEffect(load, [load]);

  // Нэг товч дармагц шууд хадгална (optimistic UI)
  async function mark(problemId: string, value: string, date: string) {
    setMarks((m) => ({ ...m, [problemId]: value }));
    try {
      await api("/attempts/evening", {
        method: "POST",
        body: { date, entries: [{ problemId, selfState: value }] },
      });
    } catch {
      // алдаа гарвал серверээс дахин ачаална
      load();
    }
  }

  if (!loaded) return null;

  return (
    <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
      <h2 className="font-bold text-brand-soft">Оройн тэмдэглэгээ</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Өнөөдөр ангид хийсэн бодлогуудаа цаасан дээрээсээ хараад тэмдэглээрэй
      </p>

      {sessions.length === 0 && (
        <div className="mt-4 rounded-xl border border-white/8 bg-[#0b142e] p-5 text-center text-sm text-ink-dim">
          Өнөөдөр ангид хийсэн тест хараахан бүртгэгдээгүй байна.
          <br />
          Багш тестээ оруулмагц энд бодлогууд тань гарч ирнэ.
        </div>
      )}

      <div className="mt-4 space-y-5">
        {sessions.map((s) => {
          const done = s.problems.filter((p) => marks[p.problemId]).length;
          return (
            <div
              key={s.sessionId}
              className="rounded-xl border border-white/8 bg-[#0b142e] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">{s.test.title}</p>
                <span className="text-xs text-ink-dim">
                  {done}/{s.problems.length} · {s.date.slice(0, 10)}
                </span>
              </div>
              <div className="space-y-2.5">
                {s.problems.map((p) => (
                  <div
                    key={p.problemId}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-bright/15 text-xs font-bold text-brand-soft">
                        {p.index}
                      </span>
                      <div className="min-w-0 flex-1 text-sm">
                        {p.statementText ? (
                          <MathText>{p.statementText}</MathText>
                        ) : (
                          <span className="text-ink-dim">Бодлого {p.index}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
                      {STATES.map((st) => {
                        const sel = marks[p.problemId] === st.value;
                        return (
                          <button
                            key={st.value}
                            onClick={() => mark(p.problemId, st.value, s.date)}
                            className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                              sel
                                ? TONE[st.tone]
                                : "border-white/10 text-ink-dim hover:border-white/30"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
