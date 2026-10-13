"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock, RotateCcw } from "lucide-react";
import { api, fileUrl, getRole } from "@/lib/api";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import {
  isStudyLearner,
  correctnessLabel,
} from "@/components/study/study-policy";
type Options = {
  resumeRunId?: string | null;
  chapters: { id: string; title: string; freshCount: number }[];
};
type Item = {
  id: string;
  problemId: string;
  source: {
    statement: string | null;
    imageKey: string | null;
    token: string;
    format: string;
    choiceMode: string | null;
    choices: ({ label?: string; text: string } | string)[] | null;
  };
  first: { answer: string; flags: string[]; correct: boolean | null } | null;
  responses: {
    kind: string;
    answer: string;
    correct: boolean | null;
    assistance: boolean;
  }[];
  solution?: string | null;
  answerKey?: unknown;
};
type Run = {
  id: string;
  budgetMinutes: number;
  deadlineAt: string;
  serverNow: string;
  status: string;
  items: Item[];
  evidence: {
    assigned: number;
    answered: number;
    firstCorrect: number;
    independentFirstCorrect: number;
    unknown: number;
  };
  caution: string;
};
const labels: Record<string, string> = {
  unsure: "Эргэлзсэн",
  guessed: "Таасан",
  "could-not": "Бодож чадаагүй",
  help: "Тусламж авсан",
};
export default function ReviewPage() {
  const [options, setOptions] = useState<Options | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [budget, setBudget] = useState(10),
    [run, setRun] = useState<Run | null>(null),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(""),
    [flags, setFlags] = useState<string[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [remaining, setRemaining] = useState(0);
  const createRequest = useRef<{ key: string; id: string } | null>(null),
    responseRequest = useRef<{ key: string; id: string } | null>(null),
    offset = useRef(0);
  const item = run?.items[index];
  function displayAnswer(current: Item, value: string) {
    const selected = /^choice:(\d)$/.exec(value);
    if (selected && current.source.choiceMode === "TEXT") {
      const choice = current.source.choices?.[Number(selected[1])];
      return typeof choice === "string" ? choice : (choice?.text ?? value);
    }
    return value || "Хариулт бичээгүй";
  }
  function accept(
    next: Run,
    selectedIndex = Number(
      new URLSearchParams(location.search).get("item") ?? 0,
    ),
  ) {
    offset.current = Date.parse(next.serverNow) - Date.now();
    setRun(next);
    localStorage.setItem("pi_study_review_run", next.id);
    history.replaceState(
      null,
      "",
      `?run=${encodeURIComponent(next.id)}&item=${selectedIndex}`,
    );
  }
  useEffect(() => {
    let alive = true;
    if (!isStudyLearner(getRole())) {
      queueMicrotask(() => {
        if (alive) {
          setError("Энэ хуудас сурагч, онлайн хэрэглэгчид зориулагдсан.");
          setBusy(false);
        }
      });
      return () => {
        alive = false;
      };
    }
    const id =
      new URLSearchParams(location.search).get("run") ||
      localStorage.getItem("pi_study_review_run");
    async function load() {
      try {
        const data = await api<Options>("/study-review/options");
        if (alive) setOptions(data);
        const resumeId = id || data.resumeRunId;
        if (resumeId) {
          const next = await api<Run>(
            `/study-review/${encodeURIComponent(resumeId)}`,
          );
          if (alive) {
            const restoredIndex = Number(
              new URLSearchParams(location.search).get("item") ?? 0,
            );
            const safeIndex = Number.isSafeInteger(restoredIndex)
              ? Math.max(0, Math.min(restoredIndex, next.items.length - 1))
              : 0;
            accept(next, safeIndex);
            setIndex(safeIndex);
          }
        }
      } catch {
        if (alive)
          setError(
            "Давталт нээгдсэнгүй. Эрх, холболтоо шалгаад дахин ачаална уу.",
          );
      } finally {
        if (alive) setBusy(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);
  function moveTo(nextIndex: number) {
    setIndex(nextIndex);
    if (run)
      history.replaceState(
        null,
        "",
        `?run=${encodeURIComponent(run.id)}&item=${nextIndex}`,
      );
    clearDraft();
  }
  function clearDraft() {
    setAnswer("");
    setFlags([]);
    responseRequest.current = null;
  }
  useEffect(() => {
    if (!run) return;
    // Үлдсэн хугацааг сурагчид амласан төсвөөс дээш харуулахгүй. deadlineAt нь
    // цагийн зөрүү, timezone алдаа эсвэл буруу өгөгдлөөс болж ирээдүйд хол
    // байвал тоолуур утгагүй том тоо харуулж, 10 минутын давталт хязгааргүй
    // болно. Энэ нь серверийн шалгалтыг орлохгүй — зөвхөн харагдацын хамгаалалт.
    const budgetSeconds = Math.max(0, run.budgetMinutes) * 60;
    const update = () =>
      setRemaining(
        Math.max(
          0,
          Math.min(
            budgetSeconds,
            Math.ceil(
              (Date.parse(run.deadlineAt) - Date.now() - offset.current) / 1000,
            ),
          ),
        ),
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [run]);
  useEffect(() => {
    if (run?.status !== "OPEN" || remaining !== 0) return;
    const timer = setTimeout(() => {
      void api<Run>(`/study-review/${run.id}`)
        .then(accept)
        .catch(() => setError("Серверийн хугацааг дахин шалгах шаардлагатай."));
    }, 1000);
    return () => clearTimeout(timer);
  }, [run, remaining]);
  async function start() {
    setBusy(true);
    setError("");
    const key = JSON.stringify([budget, [...selected].sort()]);
    if (createRequest.current?.key !== key)
      createRequest.current = { key, id: crypto.randomUUID() };
    try {
      const next = await api<Run>("/study-review", {
        method: "POST",
        body: JSON.stringify({
          budgetMinutes: budget,
          chapterIds: selected,
          clientRequestId: createRequest.current!.id,
        }),
      });
      accept(next, 0);
      setIndex(0);
      clearDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Давталт эхэлсэнгүй.");
    } finally {
      setBusy(false);
    }
  }
  async function respond() {
    if (!run || !item) return;
    setBusy(true);
    setError("");
    const kind = item.first ? "CORRECTION" : "FIRST",
      key = JSON.stringify([item.id, kind, answer, flags.slice().sort()]);
    if (responseRequest.current?.key !== key)
      responseRequest.current = { key, id: crypto.randomUUID() };
    try {
      accept(
        await api<Run>(`/study-review/${run.id}/items/${item.id}/response`, {
          method: "POST",
          body: JSON.stringify({
            answer,
            flags,
            kind,
            clientRequestId: responseRequest.current!.id,
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хариулт хадгалагдсангүй.");
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    if (!run) return;
    setBusy(true);
    try {
      accept(
        await api<Run>(`/study-review/${run.id}/submit`, { method: "POST" }),
      );
    } catch {
      setError("Давталт хаагдсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    localStorage.removeItem("pi_study_review_run");
    history.replaceState(null, "", location.pathname);
    setRun(null);
    setIndex(0);
    clearDraft();
    createRequest.current = null;
    void api<Options>("/study-review/options")
      .then(setOptions)
      .catch(() => setError("Сэдвийн мэдээлэл шинэчлэгдсэнгүй."));
  }
  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 space-y-5 p-4">
      <Link
        href="/app/study"
        className="inline-flex min-h-11 items-center gap-2 text-brand"
      >
        <ArrowLeft size={18} />
        Суралцах руу буцах
      </Link>
      <h1 className="text-xl font-semibold">Сэдвээ сонгон давтах</h1>
      <p className="text-sm text-ink-dim">
        Серверийн хугацаатай хувийн давталт. Эхний хариулт хадгалагдана. Албан
        ёсны шалгалт, эрэмбэд орохгүй.
      </p>
      {error && (
        <p role="alert" className="break-words text-error">
          {error}
        </p>
      )}
      {!run ? (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <label className="block">
              Хугацаа
              <select
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
              >
                {[10, 30, 60].map((n) => (
                  <option key={n} value={n}>
                    {n} минут — дээд тал нь {n === 10 ? 5 : n === 30 ? 10 : 20}{" "}
                    бодлого
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-ink-dim">
              Бодлогын тоо нь хязгаар; бодох хурдны норм биш. Бүртгэгдсэн өмнөх
              хариулт, тусламжтай бодлогыг шинэ даалгавар гэж оруулахгүй.
            </p>
            <fieldset className="space-y-2">
              <legend>1–5 сэдэв</legend>
              {options?.chapters
                .filter((c) => c.freshCount > 0)
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex min-h-11 items-start gap-3 rounded-lg border border-line p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      disabled={
                        !selected.includes(c.id) && selected.length >= 5
                      }
                      onChange={() =>
                        setSelected(
                          selected.includes(c.id)
                            ? selected.filter((id) => id !== c.id)
                            : [...selected, c.id],
                        )
                      }
                      className="mt-1"
                    />
                    <span className="min-w-0 break-words">
                      <MathText>{c.title}</MathText>
                      <span className="block text-sm text-ink-dim">
                        Бүртгэгдээгүй, шалгасан түлхүүртэй {c.freshCount}{" "}
                        бодлого
                      </span>
                    </span>
                  </label>
                ))}
              {options && !options.chapters.some((c) => c.freshCount > 0) && (
                <p>Эрхтэй сэдвүүдэд шинэ, шалгасан түлхүүртэй бодлого алга.</p>
              )}
            </fieldset>
            <Button
              disabled={busy || !selected.length}
              onClick={() => void start()}
              className="min-h-11 w-full whitespace-normal"
            >
              {busy ? "Эхэлж байна…" : "Давталт эхлэх"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Clock size={18} />
              {run.status === "OPEN"
                ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                : run.status === "EXPIRED"
                  ? "Хугацаа дууссан"
                  : "Давталт хаагдсан"}
            </span>
            <span>
              {index + 1} / {run.items.length}
            </span>
          </div>
          {item && (
            <Card>
              <CardContent className="min-w-0 space-y-4 pt-5">
                {item.source.statement && (
                  <MathText>{item.source.statement}</MathText>
                )}{" "}
                {item.source.imageKey && (
                  <a
                    href={fileUrl(item.source.imageKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-brand"
                  >
                    Бодлогын зураг нээх
                  </a>
                )}
                {item.source.choices && (
                  <fieldset className="space-y-2">
                    <legend>Сонголт</legend>
                    {item.source.choices.map((c, i) => (
                      <label
                        className="flex min-h-11 gap-3 rounded-lg border border-line p-3"
                        key={i}
                      >
                        <input
                          type="radio"
                          name="review-choice"
                          checked={
                            answer ===
                            String(
                              item.source.choiceMode === "LETTER"
                                ? String.fromCharCode(65 + i)
                                : `choice:${i}`,
                            )
                          }
                          onChange={() =>
                            setAnswer(
                              String(
                                item.source.choiceMode === "LETTER"
                                  ? String.fromCharCode(65 + i)
                                  : `choice:${i}`,
                              ),
                            )
                          }
                        />
                        <MathText>
                          {typeof c === "string" ? c : c.text}
                        </MathText>
                      </label>
                    ))}
                  </fieldset>
                )}
                {item.first && (
                  <div className="rounded-lg border border-line p-3">
                    <p>
                      Эхний хариулт:{" "}
                      <MathText>
                        {displayAnswer(item, item.first.answer)}
                      </MathText>
                    </p>
                    <p>{correctnessLabel(item.first.correct)}</p>
                    {item.responses.some(
                      (r) => r.kind === "FIRST" && r.assistance,
                    ) && (
                      <p className="text-sm text-ink-dim">
                        Эхний хариултаас өмнө нээсэн материал, давхар бодолт
                        эсвэл тусламжийн тэмдэглэгээ бүртгэгдсэн.
                      </p>
                    )}
                    {item.first.flags.length > 0 && (
                      <p className="text-sm">
                        {item.first.flags.map((f) => labels[f] ?? f).join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {((!item.first && run.status === "OPEN") || item.first) && (
                  <>
                    {!item.source.choices?.length && (
                      <label className="block">
                        {item.first
                          ? run.status === "OPEN"
                            ? "Дахин бодсон хариулт"
                            : "Давталтын дараах дасгалын хариулт"
                          : "Эхний хариулт"}
                        <input
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder={
                            item.source.format === "FILL_NUMBER"
                              ? "Жишээ: 2, -0.5 эсвэл 1/3"
                              : undefined
                          }
                          maxLength={128}
                          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                        />
                      </label>
                    )}
                    <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
                      <legend className="mb-2 text-sm">
                        Өөрийн тэмдэглэгээ (заавал биш)
                      </legend>
                      {Object.entries(labels).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex min-h-11 items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={flags.includes(key)}
                            onChange={() =>
                              setFlags(
                                flags.includes(key)
                                  ? flags.filter((f) => f !== key)
                                  : [...flags, key],
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <Button
                      className="min-h-11 w-full whitespace-normal"
                      disabled={
                        busy ||
                        (!answer.trim() && !flags.includes("could-not")) ||
                        (!item.first && remaining === 0)
                      }
                      onClick={() => void respond()}
                    >
                      {item.first
                        ? "Дахин бодсон хариулт хадгалах"
                        : "Эхний хариулт хадгалах"}
                    </Button>
                  </>
                )}
                {item.responses
                  .filter((r) => r.kind === "CORRECTION")
                  .map((r, i) => (
                    <p className="text-sm" key={i}>
                      {r.assistance
                        ? "Тайлбар эсвэл тусламжтай дахин бодолт"
                        : "Тайлбар нээхээс өмнөх дахин бодолт"}
                      : <MathText>{displayAnswer(item, r.answer)}</MathText> —{" "}
                      {correctnessLabel(r.correct)}
                    </p>
                  ))}
                {run.status !== "OPEN" && (
                  <details>
                    <summary className="min-h-11 cursor-pointer text-brand">
                      Хариу, тайлбар нээх
                    </summary>
                    {item.answerKey !== undefined && (
                      <MathText>
                        {typeof item.answerKey === "string"
                          ? item.answerKey
                          : JSON.stringify(item.answerKey)}
                      </MathText>
                    )}{" "}
                    {item.solution ? (
                      <MathText>{item.solution}</MathText>
                    ) : (
                      <p className="text-sm text-ink-dim">
                        Бичгэн тайлбар оруулаагүй.
                      </p>
                    )}
                    <p className="text-sm text-ink-dim">
                      Хаасны дараах дахин бодолт эхний үр дүнг өөрчлөхгүй.
                    </p>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              disabled={index === 0 || busy}
              onClick={() => moveTo(index - 1)}
            >
              Өмнөх
            </Button>
            <Button
              variant="outline"
              disabled={index >= run.items.length - 1 || busy}
              onClick={() => moveTo(index + 1)}
            >
              Дараах
            </Button>
          </div>
          {run.status === "OPEN" ? (
            <Button
              className="min-h-11 w-full whitespace-normal"
              disabled={busy}
              onClick={() => void close()}
            >
              Давталтыг хааж, тайлбар үзэх
            </Button>
          ) : (
            <Card>
              <CardContent className="space-y-3 pt-5">
                <p>
                  Эхний хариулт өгсөн {run.evidence.answered} /{" "}
                  {run.evidence.assigned}; зөв {run.evidence.firstCorrect}; бие
                  даан гэж бүртгэсэн эхний зөв{" "}
                  {run.evidence.independentFirstCorrect}.
                </p>
                <p>
                  Хариулаагүй эсвэл тодорхойгүй {run.evidence.unknown}. Дахин
                  бодолтыг эхний зөвд нэмж тооцохгүй.
                </p>
                <p className="text-sm text-ink-dim">{run.caution}</p>
                <Button
                  variant="outline"
                  onClick={reset}
                  className="min-h-11 w-full whitespace-normal"
                >
                  <RotateCcw size={18} />
                  Өөр давталт сонгох
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
