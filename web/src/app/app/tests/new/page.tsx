"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Classroom {
  id: string;
  name: string;
  grade?: number | null;
  _count: { enrollments: number };
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number | null;
  book?: { code: string; title: string } | null;
  _count: { problems: number; theories: number };
}

interface Problem {
  id: string;
  token: string;
  format: string;
  statementText?: string | null;
  points: number;
}

const TYPES = [
  { value: "DAILY", label: "Өдрийн тест" },
  { value: "CHAPTER_EXAM", label: "Сэдвийн шалгалт" },
  { value: "EESH_MOCK", label: "ЭЕШ сорил" },
  { value: "CUSTOM", label: "Бусад" },
];

const FORMAT_LABEL: Record<string, string> = {
  CHOICE: "Сонгох",
  FILL_NUMBER: "Нөхөх",
  OPEN: "Задгай",
};

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default function NewTestPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("CHAPTER_EXAM");
  const [gradingMode, setGradingMode] = useState("AUTO");
  const [chapterId, setChapterId] = useState("");
  const [timeLimit, setTimeLimit] = useState("100");
  const [groupKey, setGroupKey] = useState("");
  const [variantLabel, setVariantLabel] = useState("A");
  const [pdfKey, setPdfKey] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [loadingProblems, setLoadingProblems] = useState(false);

  useEffect(() => {
    api<Classroom[]>("/classrooms").then(setClassrooms).catch(() => {});
    api<Chapter[]>("/chapters").then(setChapters).catch(() => {});
  }, []);

  useEffect(() => {
    if (!chapterId) {
      return;
    }
    api<Problem[]>(`/chapters/${chapterId}/problems?take=100`)
      .then((rows) => {
        setProblems(rows);
        setSelectedProblems([]);
      })
      .catch(() => setProblems([]))
      .finally(() => setLoadingProblems(false));
  }, [chapterId]);

  const selectedProblemObjects = useMemo(() => {
    const byId = new Map(problems.map((p) => [p.id, p]));
    return selectedProblems.map((id) => byId.get(id)).filter(Boolean) as Problem[];
  }, [problems, selectedProblems]);

  function toggleClass(id: string) {
    setSelectedClasses((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  }

  function toggleProblem(id: string) {
    setSelectedProblems((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  }

  function applyEeshTemplate() {
    setType("CHAPTER_EXAM");
    setGradingMode("AUTO");
    setTimeLimit("100");
    if (!title.trim()) setTitle("36+4 сэдвийн шалгалт");
    if (!variantLabel.trim()) setVariantLabel("A");
  }

  async function createTest() {
    setMsg("");
    if (!title.trim()) {
      setMsg("Тестийн нэр оруулна уу");
      return;
    }
    if (selectedClasses.length === 0) {
      setMsg("Харагдах ангиа сонгоно уу");
      return;
    }
    try {
      await api("/tests", {
        method: "POST",
        body: {
          title: title.trim(),
          type,
          gradingMode,
          ...(chapterId ? { chapterId } : {}),
          ...(parsePositiveInt(timeLimit)
            ? { timeLimitMin: parsePositiveInt(timeLimit) }
            : {}),
          ...(groupKey.trim() ? { groupKey: groupKey.trim() } : {}),
          ...(variantLabel.trim() ? { variantLabel: variantLabel.trim() } : {}),
          ...(pdfKey.trim() ? { pdfKey: pdfKey.trim() } : {}),
          classroomIds: selectedClasses,
          problems: selectedProblemObjects.map((problem, index) => ({
            problemId: problem.id,
            order: index + 1,
            points: problem.points || 1,
          })),
        },
      });
      router.push("/app/tests");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Тест үүсгэх</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Тест аль ангид харагдахыг заавал сонгоно.
          </p>
        </div>
        <Link
          href="/app/tests"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:border-white/40"
        >
          Буцах
        </Link>
      </div>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-brand-soft">Ерөнхий мэдээлэл</h2>
          <button
            onClick={applyEeshTemplate}
            className="rounded-lg border border-brand-bright/40 px-3 py-1.5 text-sm font-bold text-brand-soft"
          >
            36+4 загвар
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Тестийн нэр"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0b142e] px-4 py-3 text-sm outline-none"
          >
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={gradingMode}
            onChange={(e) => setGradingMode(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0b142e] px-4 py-3 text-sm outline-none"
          >
            <option value="AUTO">Авто дүн (зөв хариу баталгаатай)</option>
            <option value="MANUAL">Багшийн дүн (PDF/source, хариу баталгаажуулна)</option>
          </select>
          <select
            value={chapterId}
            onChange={(e) => {
              const nextChapterId = e.target.value;
              setChapterId(nextChapterId);
              if (!nextChapterId) {
                setProblems([]);
                setSelectedProblems([]);
                setLoadingProblems(false);
              } else {
                setLoadingProblems(true);
              }
            }}
            className="rounded-xl border border-white/10 bg-[#0b142e] px-4 py-3 text-sm outline-none"
          >
            <option value="">Бүлэг сэдэв сонгохгүй</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.book?.code ? `${chapter.book.code} · ` : ""}
                {chapter.title}
                {chapter.grade ? ` · ${chapter.grade}-р анги` : ""}
              </option>
            ))}
          </select>
          <input
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            inputMode="numeric"
            placeholder="Хугацаа минут"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
            placeholder="Variant group (ж: Тест 18)"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={variantLabel}
            onChange={(e) => setVariantLabel(e.target.value)}
            placeholder="Хувилбар (A/B)"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={pdfKey}
            onChange={(e) => setPdfKey(e.target.value)}
            placeholder="PDF/source key эсвэл future файл"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright md:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Харагдах ангиуд</h2>
        {classrooms.length === 0 && (
          <p className="text-sm text-ink-dim">Анги үүсгээгүй байна</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => {
            const selected = selectedClasses.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleClass(c.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-brand-bright bg-brand-bright/15"
                    : "border-white/8 hover:border-white/25"
                }`}
              >
                <p className="font-semibold">{c.name}</p>
                <p className="mt-1 text-xs text-ink-dim">
                  {c._count.enrollments} сурагч
                  {c.grade ? ` · ${c.grade}-р анги` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-soft">Бодлогууд</h2>
            <p className="mt-1 text-sm text-ink-dim">
              Сонгосон дарааллаар тестэд орно. Одоогоор {selectedProblems.length} бодлого.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedProblems(problems.slice(0, 40).map((p) => p.id))}
              disabled={problems.length === 0}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Эхний 40
            </button>
            <button
              onClick={() => setSelectedProblems([])}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm"
            >
              Цэвэрлэх
            </button>
          </div>
        </div>

        {loadingProblems && <p className="text-sm text-ink-dim">Ачаалж байна…</p>}
        {!chapterId && (
          <p className="text-sm text-ink-dim">
            Бүлэг сэдэв сонговол тухайн бүлгийн бодлогууд энд гарна.
          </p>
        )}
        {chapterId && !loadingProblems && problems.length === 0 && (
          <p className="text-sm text-ink-dim">Энэ бүлэгт бодлого алга байна</p>
        )}
        <div className="space-y-2">
          {problems.map((p) => {
            const selected = selectedProblems.includes(p.id);
            const order = selectedProblems.indexOf(p.id) + 1;
            return (
              <button
                key={p.id}
                onClick={() => toggleProblem(p.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-brand-bright bg-brand-bright/10"
                    : "border-white/8 hover:border-white/25"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    selected
                      ? "bg-brand-bright text-white"
                      : "bg-white/5 text-ink-dim"
                  }`}
                >
                  {selected ? order : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{p.statementText || p.token}</span>
                  <span className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-ink-dim">
                      {p.token}
                    </span>
                    <span className="rounded bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
                      {FORMAT_LABEL[p.format] ?? p.format}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-ink-dim">
                      {p.points} оноо
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {msg && (
        <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
          {msg}
        </p>
      )}
      <button
        onClick={createTest}
        className="w-full rounded-xl bg-brand-bright py-4 text-lg font-bold text-white transition hover:bg-[#6190f0]"
      >
        Тест үүсгэх
      </button>
    </div>
  );
}
