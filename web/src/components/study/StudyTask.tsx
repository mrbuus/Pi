"use client";
import ProblemVideoDisclosure from "@/components/lesson/ProblemVideoDisclosure";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, BookOpen, Check } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { api, fileUrl } from "@/lib/api";
import { answerRecordLabel, correctnessLabel } from "./study-policy";
import { StudyClock } from "./attention";
export type First = {
  answer: string;
  correct: boolean | null;
  flags: string[];
  mode: string;
  recordedAt?: string;
};
export type Task = {
  id: string;
  statement: string | null;
  imageKey?: string;
  choices?: unknown;
  first?: First | null;
};
const FLAGS = [
  ["unsure", "Эргэлзсэн"],
  ["guessed", "Таасан"],
  ["could-not", "Бодож чадаагүй"],
  ["help", "Тусламж авсан"],
];
export default function StudyTask({
  task,
  mode,
  onClose,
}: {
  task: Task;
  mode: string;
  onClose: () => void;
}) {
  const [first, setFirst] = useState<First | null>(task.first ?? null),
    [answer, setAnswer] = useState(""),
    [flags, setFlags] = useState<string[]>([]);
  const [retry, setRetry] = useState(false),
    [feedback, setFeedback] = useState<string | null>(null),
    [solution, setSolution] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const clock = useRef<StudyClock | null>(null);
  useEffect(() => {
    clock.current = new StudyClock(
      performance.now(),
      document.visibilityState === "visible",
      document.hasFocus(),
    );
    const tick = () =>
      clock.current?.tick(
        performance.now(),
        document.visibilityState === "visible",
        document.hasFocus(),
      );
    const interval = setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("blur", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("blur", tick);
    };
  }, [task.id]);
  const submit = async () => {
    setBusy(true);
    setError("");
    clock.current?.button();
    clock.current?.tick(
      performance.now(),
      document.visibilityState === "visible",
      document.hasFocus(),
    );
    try {
      const result = await api<First & { kind?: string }>(
        first ? "/learning-lab/correction" : "/learning-lab/response",
        {
          method: "POST",
          body: {
            problemId: task.id,
            answer,
            flags,
            mode,
            timing: clock.current?.summary(),
          },
        },
      );
      if (!first) setFirst(result);
      setFeedback(
        typeof result.correct !== "boolean"
          ? "Хариуны түлхүүр дутуу тул багштайгаа шалгана уу."
          : result.correct
            ? "Зөв хариуллаа."
            : "Хариулт таарсангүй. Дахин бодож үзээрэй.",
      );
      if (result.kind === "solution-assisted-correction")
        setFeedback(
          "Тайлбар нээсний дараах засвар хадгалагдлаа. Шинэ бодлогоор дараа нь өөрийгөө шалгаарай.",
        );
      setRetry(false);
      clock.current = new StudyClock(
        performance.now(),
        document.visibilityState === "visible",
        document.hasFocus(),
      );
    } catch {
      setError(
        "Хариулт хадгалагдсангүй. Тоо, a/b эсвэл язгуурыг таслалаар бичээд дахин оролдоно уу.",
      );
    } finally {
      setBusy(false);
    }
  };
  const showSolution = async () => {
    setBusy(true);
    setError("");
    clock.current?.button();
    try {
      const result = await api<{ text: string | null }>(
        "/learning-lab/solution",
        { method: "POST", body: { problemId: task.id } },
      );
      setSolution(
        result.text ??
          "Баталгаажсан бодолт хараахан байхгүй. Багшаасаа асуугаарай.",
      );
    } catch {
      setError("Бодолт нээгдсэнгүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pb-24 text-ink">
      <Button variant="ghost" onClick={onClose}>
        <ArrowLeft size={18} /> Буцах
      </Button>
      <p className="text-sm text-ink-dim">
        {mode === "classroom"
          ? "Хичээлийн дараа — дэвтрийн эхний хариулт"
          : mode === "probe"
            ? "Хугацааны дараах шинэ бодлого — тусламжгүй шалгах"
            : "Нэг бодлого — эхлээд өөрөө бодох"}
      </p>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <MathText>{task.statement ?? "Бодлогын зургийг үзнэ үү."}</MathText>
          {task.imageKey && (
            <img
              src={fileUrl(task.imageKey)}
              alt="Бодлогын эх"
              className="max-w-full rounded-lg"
            />
          )}
          {Array.isArray(task.choices) && (
            <ol className="space-y-2">
              {task.choices.map((choice, i) => (
                <li key={i}>
                  <MathText>
                    {typeof choice === "object" && choice
                      ? `${(choice as { label: string }).label}: ${(choice as { text: string }).text}`
                      : `${String.fromCharCode(65 + i)}: ${String(choice)}`}
                  </MathText>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      {first && (
        <div className="rounded-xl border border-line p-4 space-y-2">
          <p className="font-semibold">Анхны хариулт хадгалагдсан</p>
          <MathText>
            {first.answer?.trim()
              ? `$${first.answer}$`
              : answerRecordLabel(first)}
          </MathText>
          <p className="text-sm">
            {`Анхны хариулт: ${correctnessLabel(first.correct)}`}
            {first.flags.length
              ? ` — ${first.flags.map((f) => FLAGS.find(([v]) => v === f)?.[1]).join(", ")}`
              : ""}
          </p>
          <p className="text-xs text-ink-dim">
            Дахин бодсон хариулт эхний хариултыг солихгүй. Өмнө үзсэн бодлого нь
            шинэ бие даасан амжилт болохгүй.
          </p>
        </div>
      )}
      {(!first || retry) && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-2">
            <span>
              {retry
                ? "Дахин бодсон хариулт"
                : mode === "classroom"
                  ? "Дэвтэрт анх бичсэн хариулт"
                  : "Таны хариулт"}
            </span>
            <input
              className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-ink"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={128}
              autoComplete="off"
              aria-describedby="answer-help"
            />
          </label>
          <p id="answer-help" className="text-sm text-ink-dim">
            Бүхэл тоо, аравтын бутархай, a/b. Олон язгуур байвал таслалаар
            тусгаарлана.
          </p>
          {!first && (
            <fieldset>
              <legend className="text-sm text-ink-dim">
                Нэмэлт тэмдэглэгээ — заавал биш
              </legend>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {FLAGS.map(([flag, label]) => (
                  <label
                    key={flag}
                    className="min-h-11 flex items-center gap-2 rounded-lg border border-line p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={flags.includes(flag)}
                      onChange={(e) =>
                        setFlags(
                          e.target.checked
                            ? [...flags, flag]
                            : flags.filter((f) => f !== flag),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Button
            disabled={busy || (!answer.trim() && !flags.includes("could-not"))}
            type="submit"
            className="w-full"
          >
            <Check size={18} /> {busy ? "Хадгалж байна…" : "Хариултаа шалгах"}
          </Button>
        </form>
      )}
      {feedback && (
        <p role="status" className="rounded-lg bg-panel p-3">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      {first && !retry && (
        <div className="grid gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRetry(true);
              setAnswer("");
              setFeedback(null);
              clock.current?.button();
            }}
          >
            <RotateCcw size={18} /> Дахин бодох
          </Button>
          <Button variant="ghost" disabled={busy} onClick={showSolution}>
            <BookOpen size={18} /> Бодолтыг үзэх
          </Button>
        </div>
      )}
      {first && !task.id.startsWith("lab-") && (
        <ProblemVideoDisclosure problemId={task.id} />
      )}
      {solution && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <MathText>{solution}</MathText>
            <p className="text-sm text-ink-dim">
              Бодолт үзсэн засварыг тусламжгүй амжилтаас тусад нь хадгална.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
