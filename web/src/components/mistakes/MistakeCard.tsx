"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, RotateCw, Save } from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { ErrorState } from "@/components/ui/StateBlock";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { api } from "@/lib/api";
import { STATUS_LABELS, type Mistake, type RetryResult } from "./types";

const REASONS = [
  ["CALC", "Бодолтын алдаа"], ["CONCEPT", "Ойлголт"],
  ["FORMULA", "Томьёо мартсан"], ["READING", "Буруу уншсан"],
  ["TIME", "Цаг дууссан"], ["UNKNOWN", "Мэдэхгүй"],
];

function AnswerValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>Хариулаагүй</span>;
  // Historical collector values may contain JSON serialized once into a string.
  let parsed = value;
  if (typeof value === "string" && /^[\[{]/.test(value)) {
    try { parsed = JSON.parse(value); } catch { /* Preserve a normal mathematical string. */ }
  }
  if (typeof parsed === "object" && parsed !== null) {
    return <span className="flex flex-wrap gap-3">{Object.entries(parsed).map(([key, entry]) => (
      <span key={key}>{key}: <MathText>{String(entry)}</MathText></span>
    ))}</span>;
  }
  return <MathText>{String(parsed)}</MathText>;
}

export default function MistakeCard({ item, onChange, onRetried, sessionMode = false }: {
  item: Mistake;
  onChange: (id: string, patch: Partial<Mistake>) => void;
  onRetried?: (id: string, result: RetryResult) => void;
  sessionMode?: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState(item.note ?? "");
  const [savedNote, setSavedNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState<"retry" | "reason" | "note" | null>(null);
  const mutationLock = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RetryResult | null>(null);
  const hasChoices = item.problem.format === "CHOICE" && !!item.problem.choices?.length;
  const answerFields = item.problem.answerFields ?? [];
  const ready = hasChoices ? answer !== "" : answerFields.length > 0
    ? answerFields.every(key => !!fields[key]?.trim()) : !!answer.trim();
  const locked = busy !== null || (sessionMode && result !== null);

  async function save(kind: "reason" | "note", value: string) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(kind); setError("");
    try {
      await api(`/mistakes/${encodeURIComponent(item.id)}`, { method: "PATCH", body: { [kind]: value } });
      onChange(item.id, { [kind]: value });
      if (kind === "note") setSavedNote(value);
      toast.success(kind === "note" ? "Тэмдэглэл хадгалагдлаа" : "Шалтгаан хадгалагдлаа");
    } catch {
      setError("Хадгалж чадсангүй. Бичсэн зүйлээ шалгаад дахин хадгалаарай.");
      toast.error("Өөрчлөлт хадгалагдсангүй");
    } finally { mutationLock.current = false; setBusy(null); }
  }

  async function retry() {
    if (!ready || mutationLock.current || (sessionMode && result)) return;
    mutationLock.current = true;
    setBusy("retry"); setError("");
    const submitted = hasChoices && item.problem.choiceMode === "TEXT" ? Number(answer)
      : answerFields.length > 0 ? fields : answer.trim();
    try {
      const response = await api<RetryResult>(`/mistakes/${encodeURIComponent(item.id)}/retry`, {
        method: "POST", body: { answer: submitted },
      });
      setResult(response);
      onChange(item.id, {
        status: response.status, correctAnswer: response.correctAnswer,
        solutionOutline: response.solutionOutline, nextRetryAt: response.nextRetryAt,
      });
      onRetried?.(item.id, response);
    } catch {
      setError("Хариуг шалгаж чадсангүй. Холболтоо шалгаад дахин оролдоорой.");
    } finally { mutationLock.current = false; setBusy(null); }
  }

  const shownAnswer = result?.correctAnswer ?? item.correctAnswer;
  const outline = result?.solutionOutline ?? item.solutionOutline;
  return (
    <Card className="min-w-0 bg-surface" data-testid={`mistake-${item.id}`}>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone={item.status === "MASTERED" ? "success" : "brand"}>{STATUS_LABELS[item.status]}</Badge>
          {item.testTitle && <span className="text-sm text-ink-dim">{item.testTitle}</span>}
        </div>
        <div className="min-w-0 overflow-x-auto">
          <ProblemFigure imageKey={item.problem.imageKey} alt="Бодлогын зураг">
            <MathText>{item.problem.statementText ?? "Бодлогын нөхцөл олдсонгүй"}</MathText>
          </ProblemFigure>
        </div>
        <div className="text-sm text-ink-dim">Чиний өмнөх хариулт: <AnswerValue value={item.givenAnswer} /></div>
        <fieldset disabled={busy !== null}>
          <legend className="mb-2 text-sm font-semibold">Алдааны шалтгаан</legend>
          <div className="flex flex-wrap gap-2">
            {REASONS.map(([key, label]) => (
              <Button key={key} variant={item.reason === key ? "secondary" : "outline"}
                className="min-h-11 whitespace-normal px-3 text-left" aria-pressed={item.reason === key}
                onClick={() => void save("reason", key)}>{label}</Button>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          Тэмдэглэл
          <textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)}
            className="mt-2 block min-h-24 w-full rounded-xl border border-line bg-surface p-3"
            placeholder="Дараа бодохдоо юуг анхаарах вэ?" />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ink-dim">{note.length}/500{note !== savedNote ? " — Хадгалаагүй" : ""}</span>
          <Button variant="outline" disabled={busy !== null || note === savedNote}
            onClick={() => void save("note", note)}><Save aria-hidden />Тэмдэглэл хадгалах</Button>
        </div>
        <form onSubmit={event => { event.preventDefault(); void retry(); }} className="space-y-3">
          <fieldset disabled={locked} className="min-w-0">
            <legend className="mb-2 font-semibold">Дахин бодоод хариулаарай</legend>
            {hasChoices ? (
              <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Хариултын сонголтууд">
                {item.problem.choices!.map((choice, index) => {
                  const value = item.problem.choiceMode === "TEXT" ? String(index) : choice;
                  return <Button key={index} type="button" variant={answer === value ? "secondary" : "outline"}
                    aria-pressed={answer === value} onClick={() => setAnswer(value)}
                    className="min-w-0 justify-start whitespace-normal text-left">
                    <span className="min-w-0 overflow-x-auto"><MathText>{choice}</MathText></span>
                  </Button>;
                })}
              </div>
            ) : answerFields.length ? (
              <div className="flex flex-wrap gap-3">{answerFields.map(key => (
                <label key={key} className="min-w-0 flex-1 text-sm">{key} нүд
                  <input value={fields[key] ?? ""} onChange={event => setFields(old => ({ ...old, [key]: event.target.value }))}
                    className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-3" />
                </label>
              ))}</div>
            ) : <input aria-label="Хариугаа оруул" value={answer} onChange={event => setAnswer(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-line bg-surface px-3" placeholder="Хариугаа бичих" />}
          </fieldset>
          <Button type="submit" disabled={!ready || locked} className="w-full sm:w-auto">
            <RotateCw aria-hidden />{busy === "retry" ? "Шалгаж байна" : "Дахин бодох"}
          </Button>
        </form>
        {error && <ErrorState message={error} />}
        {result && <div role="status" className={`rounded-xl p-4 ${result.correct ? "bg-success/10" : "bg-warning/10"}`}>
          <p className="flex items-center gap-2 font-bold">
            {result.correct ? <CheckCircle2 aria-hidden className="h-5 w-5 text-success" /> : <RotateCw aria-hidden className="h-5 w-5" />}
            {result.correct ? "Зөв." : "Одоохондоо зөрүүтэй байна."}
          </p>
          <p className="mt-1 text-sm">{result.status === "MASTERED" ? "Өөр өдрүүдэд бататгаж, эзэмшсэн төлөвт орлоо." : "Зөв аргаа ойлгоод, дараагийн давтлагаар бататгаарай."}</p>
        </div>}
        {shownAnswer !== undefined && shownAnswer !== null && <div className="space-y-2 rounded-xl border border-line p-3">
          <div className="flex flex-wrap gap-2"><span className="font-semibold">Зөв хариу:</span><AnswerValue value={shownAnswer} /></div>
          {outline && <div className="min-w-0 overflow-x-auto border-t border-line pt-2"><MathText>{outline}</MathText></div>}
        </div>}
        {item.nextRetryAt && <p className="text-sm text-ink-dim">Дараагийн давтлага: {new Date(item.nextRetryAt).toLocaleDateString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</p>}
        {item.formulas.length > 0 && <div>
          <p className="text-sm font-bold">Хэрэгтэй томьёо</p>
          <div className="mt-2 flex flex-wrap gap-2">{item.formulas.map(formula => (
            <Button key={formula.slug} asChild variant="outline" className="whitespace-normal">
              <Link href={`/app/formulas/${encodeURIComponent(formula.slug)}`}><MathText>{formula.title}</MathText></Link>
            </Button>
          ))}</div>
        </div>}
      </CardContent>
    </Card>
  );
}
