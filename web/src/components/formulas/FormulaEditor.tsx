"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import katex from "katex";
import { ArrowLeft, Eye, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { FormulaMath } from "./FormulaMath";
import { useFormulaRequest } from "./useFormulaRequest";
import type { FormulaDetail, FormulaQuiz } from "./types";

type Draft = ReturnType<typeof draftOf>;
function draftOf(f: FormulaDetail) {
  return {
    title: f.title,
    latex: f.latex ?? "",
    general: f.general ?? "",
    explanation: f.explanation ?? "",
    mnemonic: f.mnemonic ?? "",
    eeshTip: f.eeshTip ?? "",
    conditions: f.conditions ?? [],
    derivation: f.derivation ?? [],
    commonMistakes: f.commonMistakes ?? [],
    variants: f.variants ?? [],
    examples: f.examples ?? [],
    quiz: f.quiz ?? [],
  };
}

function mathError(text: string, raw = false): string | null {
  if (!raw && text.split("$").length % 2 === 0)
    return "Математик бичвэрийн хоёр талд $ тэмдэг тавина уу.";
  const parts = raw
    ? [text]
    : [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$/g)].map(
        (m) => m[1] ?? m[2],
      );
  try {
    parts.forEach((p) =>
      katex.renderToString(p, {
        throwOnError: true,
        trust: false,
        strict: "ignore",
        maxExpand: 200,
      }),
    );
  } catch {
    return "LaTeX бичлэг буруу байна. Хаалт болон командын нэрийг шалгана уу.";
  }
  return null;
}
export function validateFormulaDraft(d: Draft) {
  const errors: string[] = [];
  const text = (label: string, value: string, max: number, raw = false) => {
    if (!value.trim() || value.length > max)
      errors.push(`${label}: 1–${max} тэмдэгт оруулна уу.`);
    const invalid = mathError(value, raw);
    if (invalid) errors.push(`${label}: ${invalid}`);
  };
  text("Гарчиг", d.title, 200);
  text("Томьёо", d.latex, 1000, true);
  text("Ерөнхий хэлбэр", d.general, 1000, true);
  text("Тайлбар", d.explanation, 3000);
  text("Цээжлэх арга", d.mnemonic, 1000);
  text("ЭЕШ зөвлөгөө", d.eeshTip, 1000);
  if (d.derivation.length < 2 || d.derivation.length > 6)
    errors.push("Гаргалгаа 2–6 алхамтай байна.");
  d.derivation.forEach((v, i) => text(`Гаргалгаа ${i + 1}`, v, 2000));
  if (
    d.conditions.length > 30 ||
    d.commonMistakes.length > 30 ||
    d.variants.length > 20
  )
    errors.push("Нөхцөл, алдаа тус бүр 30 хүртэл; хувилбар 20 хүртэл байна.");
  d.conditions.forEach((v, i) => text(`Нөхцөл ${i + 1}`, v, 200, true));
  d.commonMistakes.forEach((v, i) => text(`Түгээмэл алдаа ${i + 1}`, v, 500));
  d.variants.forEach((v, i) => {
    text(`Хувилбар ${i + 1} нэр`, v.label, 120);
    text(`Хувилбар ${i + 1}`, v.latex, 500, true);
  });
  if (d.examples.length < 2 || d.examples.length > 30)
    errors.push("Дор хаяж 2, ихдээ 30 жишээ байна.");
  d.examples.forEach((e, i) => {
    text(`Жишээ ${i + 1} бодлого`, e.problem, 2000);
    text(`Жишээ ${i + 1} хариу`, e.answer, 1000);
    if (!e.steps.length || e.steps.length > 20)
      errors.push(`Жишээ ${i + 1}: 1–20 алхамтай байна.`);
    e.steps.forEach((v) => text(`Жишээ ${i + 1} алхам`, v, 2000));
  });
  if (d.quiz.length < 2 || d.quiz.length > 50)
    errors.push("Давтах асуулт 2–50 байна.");
  d.quiz.forEach((q, i) => {
    text(`Асуулт ${i + 1}`, q.prompt, 1000, true);
    if (q.type === "blank") {
      text(`Асуулт ${i + 1} хариу`, q.answer, 1000, true);
      if (q.distractors.length < 2 || q.distractors.length > 10)
        errors.push(`Асуулт ${i + 1}: 2–10 буруу сонголт оруулна уу.`);
      if (
        new Set(q.distractors).size !== q.distractors.length ||
        q.distractors.includes(q.answer)
      )
        errors.push(`Асуулт ${i + 1}: сонголтууд давхцаж байна.`);
      q.distractors.forEach((v) =>
        text(`Асуулт ${i + 1} сонголт`, v, 500, true),
      );
    } else text(`Асуулт ${i + 1} тайлбар`, q.why, 1000);
  });
  return errors;
}
function Field({
  label,
  value,
  onChange,
  raw = false,
  max = 3000,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  raw?: boolean;
  max?: number;
  hint?: string;
}) {
  const id = useId();
  const error = mathError(value, raw);
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink-dim">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        value={value}
        rows={raw ? 2 : 3}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={
          [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className="min-h-11 w-full rounded-xl border-2 border-line bg-surface p-3 text-sm text-ink focus-visible:outline-brand"
        spellCheck={!raw}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : (
        value.trim() && (
          <div className="rounded-xl bg-panel p-3 text-sm">
            <FormulaMath text={value} display={raw} />
          </div>
        )
      )}
    </div>
  );
}
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}
export function FormulaEditor({
  formula,
  onCancel,
  onSaved,
}: {
  formula: FormulaDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const identity = useFormulaRequest<{ role: string }>("/auth/me");
  const [draft, setDraft] = useState(() => draftOf(formula));
  const initial = useMemo(() => draftOf(formula), [formula]);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const busy = useRef(false);
  const errors = useMemo(() => validateFormulaDraft(draft), [draft]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [identity.loading]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  async function save() {
    if (busy.current || !dirty) return;
    setShowErrors(true);
    setConfirmCancel(false);
    setError("");
    if (errors.length) return;
    if (!formula.updatedAt) {
      setError(
        "Хувилбарын мэдээлэл дутуу байна. Хуудсыг шинэчлээд дахин оролдоно уу.",
      );
      return;
    }
    busy.current = true;
    setSaving(true);
    const changed = Object.fromEntries(
      Object.entries(draft).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(initial[key as keyof Draft]),
      ),
    );
    try {
      await api(`/formulas/${encodeURIComponent(formula.slug)}`, {
        method: "PATCH",
        body: { ...changed, expectedUpdatedAt: formula.updatedAt },
      });
      toast.success("Томьёоны өөрчлөлтийг хадгаллаа");
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "Өөр багш энэ томьёог шинэчилсэн эсвэл гарчиг давхцсан байна. Таны бичсэн зүйл хэвээр үлдлээ. Засвараа хуулж аваад шинэ хувилбарыг дахин нээнэ үү."
          : e instanceof ApiError && e.status === 403
            ? "Засах эрх хүрэхгүй байна. Бичсэн зүйлээ хуулж авч болно."
            : e instanceof ApiError && e.status === 400
              ? "Зарим талбар шаардлага хангахгүй байна. Томьёо, жишээ, асуултуудаа шалгана уу. Бичсэн зүйл хэвээр үлдлээ."
              : "Хадгалалтыг баталж чадсангүй. Бичсэн зүйл хэвээр үлдлээ. Холболтоо шалгаад дахин оролдоно уу.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  if (identity.loading)
    return <LoadingState label="Засах эрхийг шалгаж байна" />;
  if (identity.error)
    return (
      <div className="space-y-4 [&_button]:min-h-11">
        <Button variant="outline" onClick={onCancel}>
          Буцах
        </Button>
        <ErrorState message={identity.error} onRetry={identity.retry} />
      </div>
    );
  if (!["ADMIN", "TEACHER_PLUS"].includes(identity.data?.role ?? ""))
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onCancel}>
          Буцах
        </Button>
        <EmptyState
          title="Томьёог засах эрх хүрэхгүй байна"
          hint="Админ болон Багш+ томьёоны агуулгыг засна."
        />
      </div>
    );
  return (
    <section className="min-w-0 space-y-5 pb-10 [&_button]:min-h-11">
      <header className="space-y-3">
        <h1 tabIndex={-1} ref={heading} className="text-2xl font-bold">
          Томьёо засах
        </h1>
        <p className="text-sm text-ink-dim">
          Өөрчлөлт хадгалсны дараа томьёоны санд нийтэд шинэчлэгдэнэ. Доорх
          харагдацыг шалгаад хадгалаарай. Гаргалгаа, жишээ, давтах асуултын зөв
          хариуг мөн нягтална уу.
        </p>
        <p className="text-sm text-ink-dim">
          Томьёоны талбарт шууд LaTeX бичнэ. Тайлбарын математик хэсгийг $...$
          дотор бичнэ. Жишээ нь: {"$x^2$"}.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => (dirty ? setConfirmCancel(true) : onCancel())}
        >
          <ArrowLeft aria-hidden />
          Буцах
        </Button>
        <span className="text-sm text-ink-dim">
          {dirty ? "Хадгалаагүй өөрчлөлттэй" : "Өөрчлөлт оруулаагүй"}
        </span>
      </div>
      {confirmCancel && (
        <Card>
          <CardContent className="space-y-3">
            <p>Хадгалаагүй засварыг орхиод буцах уу?</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setConfirmCancel(false)}>
                Үргэлжлүүлж засах
              </Button>
              <Button variant="danger" onClick={onCancel}>
                Засварыг орхих
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          <legend className="sr-only">Томьёоны агуулга</legend>
          <Block title="Үндсэн томьёо">
            <Field
              label="Гарчиг"
              value={draft.title}
              onChange={(v) => set("title", v)}
              max={200}
            />
            <Field
              label="Томьёо (LaTeX)"
              value={draft.latex}
              onChange={(v) => set("latex", v)}
              raw
              max={1000}
            />
            <Field
              label="Ерөнхий хэлбэр (LaTeX)"
              value={draft.general}
              onChange={(v) => set("general", v)}
              raw
              max={1000}
            />
            <Field
              label="Хэрэглэх нөхцөл"
              hint="Нэг мөрөнд нэг нөхцөл. Шууд LaTeX бичнэ."
              raw
              value={draft.conditions.join("\n")}
              onChange={(v) => set("conditions", v ? v.split("\n") : [])}
            />
          </Block>
          <Block title="Хэлбэрүүд">
            {draft.variants.map((v, i) => (
              <section
                key={i}
                className="space-y-3 rounded-xl border border-line p-3"
              >
                <Field
                  label={`Хувилбар ${i + 1} нэр`}
                  value={v.label}
                  max={120}
                  onChange={(s) =>
                    set(
                      "variants",
                      draft.variants.map((v, j) =>
                        j === i ? { ...v, label: s } : v,
                      ),
                    )
                  }
                />
                <Field
                  label={`Хувилбар ${i + 1} томьёо`}
                  value={v.latex}
                  raw
                  max={500}
                  onChange={(s) =>
                    set(
                      "variants",
                      draft.variants.map((v, j) =>
                        j === i ? { ...v, latex: s } : v,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    set(
                      "variants",
                      draft.variants.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  Хувилбар {i + 1} хасах
                </Button>
              </section>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={draft.variants.length >= 20}
              onClick={() =>
                set("variants", [...draft.variants, { label: "", latex: "" }])
              }
            >
              <Plus aria-hidden />
              Хувилбар нэмэх
            </Button>
          </Block>
          <Block title="Тайлбар ба гаргалгаа">
            <Field
              label="Энгийн тайлбар"
              value={draft.explanation}
              onChange={(v) => set("explanation", v)}
            />
            <Field
              label="Гаргалгааны алхмууд"
              hint="Нэг мөрөнд нэг алхам. 2–6 алхам байна."
              value={draft.derivation.join("\n")}
              onChange={(v) => set("derivation", v.split("\n"))}
              max={12000}
            />
            <Field
              label="Цээжлэх арга"
              value={draft.mnemonic}
              onChange={(v) => set("mnemonic", v)}
              max={1000}
            />
            <Field
              label="Түгээмэл алдаанууд"
              hint="Нэг мөрөнд нэг алдаа."
              value={draft.commonMistakes.join("\n")}
              onChange={(v) => set("commonMistakes", v ? v.split("\n") : [])}
              max={15000}
            />
            <Field
              label="ЭЕШ зөвлөгөө"
              value={draft.eeshTip}
              onChange={(v) => set("eeshTip", v)}
              max={1000}
            />
          </Block>
          <Block title="Бодсон жишээнүүд">
            {draft.examples.map((e, i) => (
              <section
                key={i}
                className="space-y-3 rounded-xl border border-line p-3"
              >
                <h2 className="font-bold">Жишээ {i + 1}</h2>
                <Field
                  label={`Жишээ ${i + 1} бодлого`}
                  value={e.problem}
                  max={2000}
                  onChange={(s) =>
                    set(
                      "examples",
                      draft.examples.map((v, j) =>
                        j === i ? { ...v, problem: s } : v,
                      ),
                    )
                  }
                />
                <Field
                  label={`Жишээ ${i + 1} алхмууд`}
                  hint="Нэг мөрөнд нэг алхам."
                  value={e.steps.join("\n")}
                  max={40000}
                  onChange={(s) =>
                    set(
                      "examples",
                      draft.examples.map((v, j) =>
                        j === i ? { ...v, steps: s.split("\n") } : v,
                      ),
                    )
                  }
                />
                <Field
                  label={`Жишээ ${i + 1} хариу`}
                  value={e.answer}
                  max={1000}
                  onChange={(s) =>
                    set(
                      "examples",
                      draft.examples.map((v, j) =>
                        j === i ? { ...v, answer: s } : v,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={draft.examples.length <= 2}
                  onClick={() =>
                    set(
                      "examples",
                      draft.examples.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  Жишээ {i + 1} хасах
                </Button>
              </section>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={draft.examples.length >= 30}
              onClick={() =>
                set("examples", [
                  ...draft.examples,
                  { problem: "", steps: [""], answer: "" },
                ])
              }
            >
              <Plus aria-hidden />
              Жишээ нэмэх
            </Button>
          </Block>
          <Block title="Давтах асуултууд">
            <p className="text-sm text-ink-dim">
              Томьёотой нийцсэн зөв хариутай эсэхийг шалгана. Эдгээр асуултыг
              цээжлэх дасгал ашиглана.
            </p>
            {draft.quiz.map((q, i) => (
              <section
                key={i}
                className="space-y-3 rounded-xl border border-line p-3"
              >
                <h2 className="font-bold">Асуулт {i + 1}</h2>
                <label className="block space-y-2 text-sm font-semibold">
                  Асуулт {i + 1} төрөл
                  <select
                    value={q.type}
                    className="min-h-11 w-full rounded-xl border-2 border-line bg-surface p-2"
                    onChange={(e) =>
                      set(
                        "quiz",
                        draft.quiz.map((v, j) =>
                          j !== i
                            ? v
                            : e.target.value === "blank"
                              ? {
                                  type: "blank",
                                  prompt: v.prompt,
                                  answer: "",
                                  distractors: ["", ""],
                                }
                              : {
                                  type: "truefalse",
                                  prompt: v.prompt,
                                  answer: "true",
                                  why: "",
                                },
                        ),
                      )
                    }
                  >
                    <option value="blank">Нөхөх</option>
                    <option value="truefalse">Үнэн эсвэл худал</option>
                  </select>
                </label>
                <Field
                  label={`Асуулт ${i + 1} нөхцөл (LaTeX)`}
                  value={q.prompt}
                  max={1000}
                  raw
                  onChange={(s) =>
                    set(
                      "quiz",
                      draft.quiz.map((v, j) =>
                        j === i ? { ...v, prompt: s } : v,
                      ),
                    )
                  }
                />
                {q.type === "blank" ? (
                  <>
                    <Field
                      label={`Асуулт ${i + 1} зөв хариу (LaTeX)`}
                      value={q.answer}
                      max={1000}
                      raw
                      onChange={(s) =>
                        set(
                          "quiz",
                          draft.quiz.map((v, j) =>
                            j === i ? ({ ...v, answer: s } as FormulaQuiz) : v,
                          ),
                        )
                      }
                    />
                    {q.distractors.map((v, k) => (
                      <div key={k} className="space-y-2">
                        <Field
                          label={`Асуулт ${i + 1} буруу сонголт ${k + 1}`}
                          value={v}
                          max={500}
                          raw
                          onChange={(s) =>
                            set(
                              "quiz",
                              draft.quiz.map((v, j) =>
                                j === i && v.type === "blank"
                                  ? {
                                      ...v,
                                      distractors: v.distractors.map((d, n) =>
                                        n === k ? s : d,
                                      ),
                                    }
                                  : v,
                              ),
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={q.distractors.length <= 2}
                          onClick={() =>
                            set(
                              "quiz",
                              draft.quiz.map((v, j) =>
                                j === i && v.type === "blank"
                                  ? {
                                      ...v,
                                      distractors: v.distractors.filter(
                                        (_, n) => n !== k,
                                      ),
                                    }
                                  : v,
                              ),
                            )
                          }
                        >
                          Сонголт {k + 1} хасах
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={q.distractors.length >= 10}
                      onClick={() =>
                        set(
                          "quiz",
                          draft.quiz.map((v, j) =>
                            j === i && v.type === "blank"
                              ? { ...v, distractors: [...v.distractors, ""] }
                              : v,
                          ),
                        )
                      }
                    >
                      Буруу сонголт нэмэх
                    </Button>
                  </>
                ) : (
                  <>
                    <label className="block space-y-2 text-sm font-semibold">
                      Асуулт {i + 1} зөв хариу
                      <select
                        className="min-h-11 w-full rounded-xl border-2 border-line bg-surface p-2"
                        value={q.answer}
                        onChange={(e) =>
                          set(
                            "quiz",
                            draft.quiz.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    answer: e.target.value as "true" | "false",
                                  }
                                : v,
                            ),
                          )
                        }
                      >
                        <option value="true">Үнэн</option>
                        <option value="false">Худал</option>
                      </select>
                    </label>
                    <Field
                      label={`Асуулт ${i + 1} тайлбар`}
                      value={q.why}
                      max={1000}
                      onChange={(s) =>
                        set(
                          "quiz",
                          draft.quiz.map((v, j) =>
                            j === i && v.type === "truefalse"
                              ? { ...v, why: s }
                              : v,
                          ),
                        )
                      }
                    />
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={draft.quiz.length <= 2}
                  onClick={() =>
                    set(
                      "quiz",
                      draft.quiz.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 aria-hidden />
                  Асуулт {i + 1} хасах
                </Button>
              </section>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={draft.quiz.length >= 50}
              onClick={() =>
                set("quiz", [
                  ...draft.quiz,
                  { type: "truefalse", prompt: "", answer: "true", why: "" },
                ])
              }
            >
              <Plus aria-hidden />
              Асуулт нэмэх
            </Button>
          </Block>
          {showErrors && errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-error p-4">
              <h2 className="font-bold">Хадгалахаас өмнө засах зүйл</h2>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {errors.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-error p-4 text-sm"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!dirty || saving}>
              <Save aria-hidden />
              {saving ? "Хадгалж байна" : "Өөрчлөлтийг хадгалах"}
            </Button>
            <span className="flex items-center gap-2 text-sm text-ink-dim">
              <Eye className="size-4" aria-hidden />
              Талбар бүрийн доор урьдчилан харагдана
            </span>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
