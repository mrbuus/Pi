"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { readStore, writeStore } from "./lib";

/**
 * Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08) — нэг анги, нэг өдрийн шалгалт.
 * API: api/src/homework-quiz. Оноо бичигдэхэд шууд (өнгө, дундаж) шинэчлэгдэж, сурагч тус бүрээр
 * 600 мс-ийн дараа (Enter/талбараас гарахад шууд) хадгалагдана. Нэг сурагчийн хүсэлтүүд дараалж
 * явна — хоцорч ирсэн хариу шинийг дарахгүй.
 */

export interface QuizInfo {
  id: string;
  problemCount: number;
  updatedAt: string;
  updatedBy: string;
}
interface QuizPayload {
  date: string;
  quiz: QuizInfo | null;
  scores: { studentId: string; score: number; updatedAt: string }[];
}

/** Хадгалж байна / алдаа / буруу утга (бичсэн нь 0..тоо биш) — байхгүй бол хадгалагдсан */
export type QuizCellState = "saving" | "error" | "invalid";

const SAVE_MS = 600;
const hiddenKey = (quizId: string) => `hw_quiz_hidden:${quizId}`;
const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : "Хадгалж чадсангүй");

/**
 * `onSaved` — оноо хадгалагдсаны дараа (1,5 с нэгтгэж) дуудна: самбарын «Асуудалтай»/улаан цэгийг
 * (шалгуурын minQuiz) шинэчлэхэд (useBoard.poll).
 */
export function useHomeworkQuiz(classId: string, date: string, enabled: boolean, onSaved?: () => void) {
  const savedCb = useRef(onSaved);
  useEffect(() => {
    savedCb.current = onSaved;
  });
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifySaved = useCallback(() => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => {
      savedTimer.current = null;
      savedCb.current?.();
    }, 1_500);
  }, []);
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(enabled ? "loading" : "ready");
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [scores, setScores] = useState<Map<string, number>>(() => new Map());
  const [cells, setCells] = useState<Map<string, QuizCellState>>(() => new Map());
  const [hidden, setHiddenState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queue = useRef(new Map<string, Promise<void>>());
  /** Хадгалагдаагүй хамгийн сүүлийн утга (сурагч бүр) */
  const pending = useRef(new Map<string, number | null>());
  const alive = useRef(true);

  const apply = useCallback((p: QuizPayload) => {
    setQuiz(p.quiz);
    setScores(new Map(p.scores.map((s) => [s.studentId, s.score])));
    setCells(new Map());
    setHiddenState(p.quiz ? readStore(hiddenKey(p.quiz.id)) === "1" : false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let on = true;
    api<QuizPayload>(`/classrooms/${encodeURIComponent(classId)}/homework-quiz?date=${date}`)
      .then((p) => {
        if (!on) return;
        apply(p);
        setStatus("ready");
      })
      .catch(() => on && setStatus("error"));
    return () => {
      on = false;
    };
  }, [classId, date, enabled, retry, apply]);

  const setCell = useCallback((id: string, s: QuizCellState | null) => {
    setCells((prev) => {
      if ((prev.get(id) ?? null) === s) return prev;
      const next = new Map(prev);
      if (s) next.set(id, s);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Нэг сурагчийн хүлээгдэж буй утгыг одоо илгээнэ (дараалалд) */
  const flush = useCallback(
    (id: string) => {
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      timers.current.delete(id);
      if (!pending.current.has(id)) return;
      const value = pending.current.get(id)!;
      pending.current.delete(id);
      const prev = queue.current.get(id) ?? Promise.resolve();
      const run = prev.then(async () => {
        try {
          await api(`/classrooms/${encodeURIComponent(classId)}/homework-quiz/scores/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: { date, score: value },
          });
          if (!alive.current) return;
          // Энэ хооронд дахин бичсэн бол «хадгалж байна» хэвээр
          if (!pending.current.has(id)) setCell(id, null);
          setSavedAt(Date.now());
          notifySaved();
        } catch (e) {
          if (!alive.current) return;
          setCell(id, "error");
          setLastError(errText(e));
        }
      });
      queue.current.set(id, run);
    },
    [classId, date, setCell, notifySaved],
  );

  /** Оноо бичигдэх бүрт: өнгө, дундаж шууд; хадгалалт SAVE_MS-ийн дараа (now=true бол шууд) */
  const setScore = useCallback(
    (id: string, value: number | null, now = false) => {
      setScores((prev) => {
        if ((prev.get(id) ?? null) === value) return prev;
        const next = new Map(prev);
        if (value === null) next.delete(id);
        else next.set(id, value);
        return next;
      });
      pending.current.set(id, value);
      setCell(id, "saving");
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      if (now) flush(id);
      else timers.current.set(id, setTimeout(() => flush(id), SAVE_MS));
    },
    [flush, setCell],
  );

  /** Бичсэн нь буруу (хадгалахгүй) эсвэл буцаж зөв болсон */
  const markInvalid = useCallback(
    (id: string, invalid: boolean) => {
      if (invalid) {
        const t = timers.current.get(id);
        if (t) clearTimeout(t);
        timers.current.delete(id);
        pending.current.delete(id);
        setCell(id, "invalid");
      } else {
        setCells((prev) => {
          if (prev.get(id) !== "invalid") return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [setCell],
  );

  // Самбараас гарахад (өдөр/анги солих) хүлээгдэж буйг шууд илгээнэ — бичсэн оноо алга болохгүй
  useEffect(() => {
    alive.current = true;
    const t = timers.current;
    const p = pending.current;
    return () => {
      alive.current = false;
      for (const id of [...p.keys()]) flush(id);
      t.clear();
    };
  }, [flush]);

  const quizUrl = `/classrooms/${encodeURIComponent(classId)}/homework-quiz`;

  /** Эхлүүлэх эсвэл бодлогын тоог засах. Алдааг дуудагчид буцаана (цонхонд харуулна) */
  const setProblemCount = useCallback(
    async (problemCount: number) => {
      setBusy(true);
      try {
        const p = await api<QuizPayload>(quizUrl, { method: "PUT", body: { date, problemCount } });
        // Бичигдэж буй оноог дарахгүй: зөвхөн шалгалтын мэдээлэл, хадгалагдсан оноо
        setQuiz(p.quiz);
        const next = new Map(p.scores.map((s) => [s.studentId, s.score]));
        for (const [id, v] of pending.current) {
          if (v === null) next.delete(id);
          else next.set(id, v);
        }
        setScores(next);
        if (p.quiz) {
          writeStore(hiddenKey(p.quiz.id), "0");
          setHiddenState(false);
        }
        notifySaved();
      } finally {
        setBusy(false);
      }
    },
    [quizUrl, date, notifySaved],
  );

  const remove = useCallback(async () => {
    setBusy(true);
    try {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
      pending.current.clear();
      await Promise.all([...queue.current.values()]);
      const p = await api<QuizPayload>(`${quizUrl}?date=${date}`, { method: "DELETE" });
      apply(p);
      notifySaved();
    } finally {
      setBusy(false);
    }
  }, [quizUrl, date, apply, notifySaved]);

  const setHidden = useCallback(
    (h: boolean) => {
      if (quiz) writeStore(hiddenKey(quiz.id), h ? "1" : "0");
      setHiddenState(h);
    },
    [quiz],
  );

  const saving = [...cells.values()].filter((s) => s === "saving").length;
  const failed = [...cells.values()].filter((s) => s === "error").length;
  const invalid = [...cells.values()].filter((s) => s === "invalid").length;

  return {
    status,
    reload: () => setRetry((r) => r + 1),
    quiz,
    scores,
    cells,
    hidden,
    setHidden,
    busy,
    save: { saving, failed, invalid, lastError, savedAt },
    setScore,
    flush,
    markInvalid,
    setProblemCount,
    remove,
  };
}

export type HomeworkQuizState = ReturnType<typeof useHomeworkQuiz>;
