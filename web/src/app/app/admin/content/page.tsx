"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Book {
  id: string;
  code: string;
  title: string;
  problemCount?: number;
  _count: { chapters: number };
}
interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number;
  freePreview: boolean;
  _count: { problems: number; theories: number };
}
interface Problem {
  id: string;
  token: string;
  format: string;
  statementText?: string;
  points: number;
}

const FORMATS = [
  { v: "CHOICE", t: "Сонгох (A–E)" },
  { v: "FILL_NUMBER", t: "Тоо нөхөх" },
  { v: "OPEN", t: "Задгай хариулт" },
];

export default function ContentAdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState("");

  const [newBook, setNewBook] = useState({ code: "", title: "" });
  const [newChapter, setNewChapter] = useState({
    title: "",
    order: 1,
    grade: 12,
    freePreview: false,
  });
  const [newProblem, setNewProblem] = useState({
    page: "",
    number: "",
    format: "CHOICE",
    statementText: "",
    correctAnswer: "",
    points: 1,
    tags: "",
  });

  const loadBooks = useCallback(() => {
    api<Book[]>("/books").then(setBooks).catch(() => {});
  }, []);
  useEffect(loadBooks, [loadBooks]);

  const loadChapters = useCallback(() => {
    if (!bookId) return;
    api<Chapter[]>(`/chapters?bookId=${bookId}`).then(setChapters).catch(() => {});
  }, [bookId]);
  useEffect(loadChapters, [loadChapters]);

  const loadProblems = useCallback(() => {
    if (!chapterId) return;
    api<Problem[]>(`/chapters/${chapterId}/problems`)
      .then(setProblems)
      .catch(() => setProblems([]));
  }, [chapterId]);
  useEffect(loadProblems, [loadProblems]);

  async function createBook() {
    if (!newBook.code.trim() || !newBook.title.trim()) return;
    await api("/books", { method: "POST", body: newBook });
    setNewBook({ code: "", title: "" });
    setMsg("✓ Ном үүслээ");
    loadBooks();
  }

  async function createChapter() {
    if (!bookId || !newChapter.title.trim()) return;
    await api("/chapters", { method: "POST", body: { bookId, ...newChapter } });
    setNewChapter({ title: "", order: chapters.length + 1, grade: 12, freePreview: false });
    setMsg("✓ Бүлэг сэдэв үүслээ");
    loadChapters();
  }

  async function createProblem() {
    if (!chapterId || !newProblem.correctAnswer.trim()) return;
    const tags = newProblem.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ type: "SUBTOPIC", name }));
    let correctAnswer: unknown = newProblem.correctAnswer.trim();
    // Тоо нөхөх бол {a:.., b:..} хэлбэрээр оруулна
    if (newProblem.format === "FILL_NUMBER" && correctAnswer) {
      try {
        correctAnswer = JSON.parse(newProblem.correctAnswer);
      } catch {
        /* стринг хэвээр үлдээнэ */
      }
    }
    try {
      await api("/problems", {
        method: "POST",
        body: {
          chapterId,
          page: newProblem.page ? parseInt(newProblem.page, 10) : undefined,
          number: newProblem.number ? parseInt(newProblem.number, 10) : undefined,
          format: newProblem.format,
          statementText: newProblem.statementText || undefined,
          choices:
            newProblem.format === "CHOICE" ? ["A", "B", "C", "D", "E"] : undefined,
          correctAnswer,
          points: newProblem.points,
          tags: tags.length ? tags : undefined,
        },
      });
      setNewProblem({
        page: newProblem.page,
        number: String((parseInt(newProblem.number, 10) || 0) + 1),
        format: newProblem.format,
        statementText: "",
        correctAnswer: "",
        points: 1,
        tags: "",
      });
      setMsg("✓ Бодлого үүслээ");
      loadProblems();
      loadChapters();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  const inputCls =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/app/admin" className="text-sm text-ink-dim hover:text-ink">
          ← Удирдлага
        </Link>
        <h1 className="text-2xl font-extrabold">Контент удирдах</h1>
        {msg && <span className="text-sm text-teal-300">{msg}</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 1. Ном */}
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <h2 className="mb-3 font-bold text-brand-soft">1. Ном</h2>
          <div className="mb-3 space-y-2">
            <input
              value={newBook.code}
              onChange={(e) => setNewBook({ ...newBook, code: e.target.value })}
              placeholder="Код (ж: 100)"
              className={`w-full ${inputCls}`}
            />
            <input
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
              placeholder="Нэр (ж: 100x100 суурь)"
              className={`w-full ${inputCls}`}
            />
            <button
              onClick={createBook}
              className="w-full rounded-lg bg-brand-bright py-2 text-sm font-bold"
            >
              + Ном нэмэх
            </button>
          </div>
          <div className="space-y-1">
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setBookId(b.id);
                  setChapterId("");
                  setChapters([]);
                  setProblems([]);
                }}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                  bookId === b.id
                    ? "border-brand-bright bg-brand-bright/10"
                    : "border-white/8 hover:border-white/25"
                }`}
              >
                <span>
                  <span className="font-mono text-ink-dim">{b.code}</span>{" "}
                  {b.title}
                </span>
                <span className="text-xs text-ink-dim">
                  {b._count.chapters} бүлэг
                  {typeof b.problemCount === "number" &&
                    ` · ${b.problemCount} бодлого`}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Бүлэг сэдэв */}
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <h2 className="mb-3 font-bold text-brand-soft">2. Бүлэг сэдэв</h2>
          {!bookId ? (
            <p className="text-sm text-ink-dim">Эхлээд ном сонгоно уу</p>
          ) : (
            <>
              <div className="mb-3 space-y-2">
                <input
                  value={newChapter.title}
                  onChange={(e) =>
                    setNewChapter({ ...newChapter, title: e.target.value })
                  }
                  placeholder="Сэдвийн нэр (ж: Тэгшитгэл)"
                  className={`w-full ${inputCls}`}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newChapter.order}
                    onChange={(e) =>
                      setNewChapter({
                        ...newChapter,
                        order: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder="Дараалал"
                    className={`w-20 ${inputCls}`}
                  />
                  <select
                    value={newChapter.grade}
                    onChange={(e) =>
                      setNewChapter({
                        ...newChapter,
                        grade: parseInt(e.target.value),
                      })
                    }
                    className={`flex-1 bg-[#0b142e] ${inputCls}`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        {g}-р анги
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-dim">
                  <input
                    type="checkbox"
                    checked={newChapter.freePreview}
                    onChange={(e) =>
                      setNewChapter({
                        ...newChapter,
                        freePreview: e.target.checked,
                      })
                    }
                  />
                  Нийтэд үнэгүй (preview)
                </label>
                <button
                  onClick={createChapter}
                  className="w-full rounded-lg bg-brand-bright py-2 text-sm font-bold"
                >
                  + Бүлэг нэмэх
                </button>
              </div>
              <div className="space-y-1">
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChapterId(c.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                      chapterId === c.id
                        ? "border-brand-bright bg-brand-bright/10"
                        : "border-white/8 hover:border-white/25"
                    }`}
                  >
                    <span>
                      {c.order}. {c.title}
                      {c.freePreview && (
                        <span className="ml-1 text-xs text-teal-300">үнэгүй</span>
                      )}
                    </span>
                    <span className="text-xs text-ink-dim">
                      {c._count.problems} бодлого
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 3. Бодлого */}
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <h2 className="mb-3 font-bold text-brand-soft">3. Бодлого</h2>
          {!chapterId ? (
            <p className="text-sm text-ink-dim">Эхлээд бүлэг сонгоно уу</p>
          ) : (
            <>
              <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={newProblem.page}
                    onChange={(e) =>
                      setNewProblem({ ...newProblem, page: e.target.value })
                    }
                    inputMode="numeric"
                    placeholder="Хуудас"
                    className={`w-1/2 ${inputCls}`}
                  />
                  <input
                    value={newProblem.number}
                    onChange={(e) =>
                      setNewProblem({ ...newProblem, number: e.target.value })
                    }
                    inputMode="numeric"
                    placeholder="Дугаар"
                    className={`w-1/2 ${inputCls}`}
                  />
                </div>
                <textarea
                  value={newProblem.statementText}
                  onChange={(e) =>
                    setNewProblem({
                      ...newProblem,
                      statementText: e.target.value,
                    })
                  }
                  placeholder="Бодлогын текст"
                  rows={2}
                  className={`w-full ${inputCls}`}
                />
                <select
                  value={newProblem.format}
                  onChange={(e) =>
                    setNewProblem({ ...newProblem, format: e.target.value })
                  }
                  className={`w-full bg-[#0b142e] ${inputCls}`}
                >
                  {FORMATS.map((f) => (
                    <option key={f.v} value={f.v}>
                      {f.t}
                    </option>
                  ))}
                </select>
                <input
                  value={newProblem.correctAnswer}
                  onChange={(e) =>
                    setNewProblem({
                      ...newProblem,
                      correctAnswer: e.target.value,
                    })
                  }
                  placeholder={
                    newProblem.format === "CHOICE"
                      ? "Зөв хариу (ж: C)"
                      : newProblem.format === "FILL_NUMBER"
                        ? 'Зөв хариу (ж: {"a":4,"b":2})'
                        : "Зөв хариу"
                  }
                  className={`w-full ${inputCls}`}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newProblem.points}
                    onChange={(e) =>
                      setNewProblem({
                        ...newProblem,
                        points: parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder="Оноо"
                    className={`w-20 ${inputCls}`}
                  />
                  <input
                    value={newProblem.tags}
                    onChange={(e) =>
                      setNewProblem({ ...newProblem, tags: e.target.value })
                    }
                    placeholder="Шошго (таслалаар)"
                    className={`flex-1 ${inputCls}`}
                  />
                </div>
                <button
                  onClick={createProblem}
                  className="w-full rounded-lg bg-brand-bright py-2 text-sm font-bold"
                >
                  + Бодлого нэмэх
                </button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {problems.map((p, i) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-white/8 px-3 py-2 text-sm"
                  >
                    <span className="text-ink-dim">{i + 1}.</span>{" "}
                    <span className="font-mono text-xs text-ink-dim">
                      {p.token}
                    </span>{" "}
                    {p.statementText?.slice(0, 30)}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
