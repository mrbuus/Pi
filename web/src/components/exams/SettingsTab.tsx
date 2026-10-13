"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, Plus, Save, Tag, Trash2, Users, Workflow } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { dateTimeUB, fromLocalInputUB, toLocalInputUB } from "@/components/thousand/format";
import { cn } from "@/lib/cn";
import ScoringGroupsEditor from "./ScoringGroupsEditor";
import { errorText, type ExamSettings } from "./types";
import { versionConflictOf } from "@/lib/revisions";

type ReviewMode = "AUTO" | "NONE" | "PROBLEMS" | "FULL";
const REVIEW: { value: ReviewMode; label: string }[] = [
  { value: "AUTO", label: "Автомат" },
  { value: "NONE", label: "Хаалттай" },
  { value: "PROBLEMS", label: "Зөвхөн бодлого" },
  { value: "FULL", label: "Бүгд" },
];
const DAY_MS = 24 * 60 * 60 * 1000;

function todayInput(): string {
  return toLocalInputUB(new Date()).slice(0, 10);
}

function Section({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 font-bold text-brand-soft">
        <Icon className="h-5 w-5" aria-hidden /> {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * «Тохиргоо» таб: анги оноох + огноо · хугацаа · бодолт нээх (1000 бодлого) ·
 * 2-р хэсгийн оноожуулалт · үнэ (зөвхөн Админ). Багш — зөвхөн өөрийн анги.
 */
export default function SettingsTab({ testId, onChanged }: { testId: string; onChanged: () => void }) {
  const [data, setData] = useState<ExamSettings | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [date, setDate] = useState(todayInput);
  const [days, setDays] = useState<number | "">("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const apply = useCallback((next: ExamSettings) => {
    setData(next);
    setMinutes(next.test.timeLimitMin ?? "");
    setPrice(next.test.price ?? "");
    setDays((d) => (d === "" ? next.reviewAutoDays : d));
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      apply(await api<ExamSettings>(`/exams/${encodeURIComponent(testId)}/settings`));
    } catch (e) {
      setError(errorText(e, "Тохиргоог ачаалж чадсангүй"));
    }
  }, [testId, apply]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function run(key: string, fn: () => Promise<ExamSettings | void>, done?: string) {
    setBusy(key);
    try {
      const next = await fn();
      if (next) apply(next);
      else await load();
      if (done) toast.success(done);
      onChanged();
    } catch (e) {
      // Өөр хүн тестийг зэрэг өөрчилсөн (409) — сүүлийн төлөвийг ачаална
      const conflict = versionConflictOf(e);
      toast.error(conflict ? `${conflict.message}. Шинэчиллээ.` : errorText(e, "Үйлдэл амжилтгүй боллоо"));
      if (conflict) await load();
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState rows={4} label="Тохиргоо ачаалж байна" />;

  const base = `/exams/${encodeURIComponent(testId)}`;
  const assigned = data.classes.filter((c) => c.assigned);
  const free = data.classes.filter((c) => !c.assigned);
  const fills = data.problems.filter((p) => p.format === "FILL_NUMBER");
  const gate = data.permissions.reviewGate;

  return (
    <div className="space-y-6">
      <Section icon={Users} title="Анги">
        {assigned.length === 0 && <p className="text-sm text-ink-dim">Энэ шалгалт ангид оноогдоогүй байна.</p>}
        <ul className="space-y-3">
          {assigned.map((c) => {
            const mode = c.reviewMode ?? "AUTO";
            const autoDays =
              c.reviewAutoAt && c.assignedAt
                ? Math.round((new Date(c.reviewAutoAt).getTime() - new Date(c.assignedAt).getTime()) / DAY_MS)
                : data.reviewAutoDays;
            return (
              <li key={c.id} className="space-y-3 rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-sm text-ink-dim">
                      <Meta
                        items={[
                          `${c.submittedCount ?? 0}/${c.studentCount ?? 0} өгсөн`,
                          c.assignedAt ? `${dateTimeUB(c.assignedAt).slice(0, 10)}` : null,
                        ]}
                      />
                    </p>
                  </div>
                  {(c.startedCount ?? 0) === 0 && (
                    <Button
                      size="sm"
                      variant="danger"
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(`del-${c.id}`, () =>
                          api<ExamSettings>(`${base}/classes/${encodeURIComponent(c.id)}`, { method: "DELETE" }),
                        "Ангиас хаслаа")
                      }
                    >
                      <Trash2 aria-hidden /> Хасах
                    </Button>
                  )}
                </div>

                <label className="flex flex-wrap items-center gap-2 text-sm text-ink">
                  <CalendarDays className="h-4 w-4 text-ink-dim" aria-hidden />
                  <span>Шалгалтын огноо</span>
                  <input
                    type="date"
                    defaultValue={c.assignedAt ? toLocalInputUB(c.assignedAt).slice(0, 10) : ""}
                    key={c.assignedAt}
                    disabled={busy !== null}
                    onBlur={(e) => {
                      const iso = e.target.value ? fromLocalInputUB(`${e.target.value}T09:00`) : null;
                      if (!iso || (c.assignedAt && toLocalInputUB(c.assignedAt).slice(0, 10) === e.target.value)) return;
                      void run(`date-${c.id}`, () =>
                        api<ExamSettings>(`${base}/classes/${encodeURIComponent(c.id)}`, { method: "PATCH", body: { date: iso } }),
                      "Огноо хадгалагдлаа");
                    }}
                    className="min-h-11 rounded-xl border border-line bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand"
                  />
                </label>

                {gate && (
                  <fieldset className="space-y-2" disabled={busy !== null}>
                    <legend className="text-sm font-semibold text-ink">
                      Бодолт нээх{" "}
                      <Badge tone={c.reviewLevel === "NONE" ? "neutral" : "success"}>
                        Одоо: {REVIEW.find((r) => r.value === c.reviewLevel)?.label ?? "Хаалттай"}
                      </Badge>
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                      {REVIEW.map((r) => {
                        const on = mode === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() =>
                              !on &&
                              void run(`rev-${c.id}`, () =>
                                api<ExamSettings>(`${base}/classes/${encodeURIComponent(c.id)}`, {
                                  method: "PATCH",
                                  body: { reviewLevel: r.value },
                                }),
                              )
                            }
                            className={cn(
                              "min-h-11 rounded-xl border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand",
                              on ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink hover:bg-ink/5",
                            )}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    {mode === "AUTO" ? (
                      <label className="flex flex-wrap items-center gap-2 text-sm text-ink-dim">
                        <span>Автоматаар</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={365}
                          defaultValue={autoDays}
                          key={`${c.id}-${autoDays}`}
                          onBlur={(e) => {
                            const n = Math.trunc(Number(e.target.value));
                            if (!Number.isFinite(n) || n < 0 || n === autoDays) return;
                            void run(`days-${c.id}`, () =>
                              api<ExamSettings>(`${base}/classes/${encodeURIComponent(c.id)}`, {
                                method: "PATCH",
                                body: { reviewAfterDays: n },
                              }),
                            "Хадгалагдлаа");
                          }}
                          className="h-11 w-20 rounded-xl border border-line bg-surface px-2 text-center tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-brand"
                        />
                        <span>хоногийн дараа бүгд нээгдэнэ</span>
                        {c.reviewAutoAt && <span className="text-xs">({dateTimeUB(c.reviewAutoAt)})</span>}
                      </label>
                    ) : (
                      c.reviewOpenedBy && <p className="text-sm text-ink-dim">{c.reviewOpenedBy} гараар тохируулсан</p>
                    )}
                  </fieldset>
                )}
              </li>
            );
          })}
        </ul>

        {free.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
            <label className="min-w-0 flex-1 text-sm font-semibold text-ink">
              <span className="mb-1 block">Анги оноох</span>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 font-normal text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <option value="">Анги сонгох</option>
                {free.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">
              <span className="mb-1 block">Огноо</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-11 rounded-xl border border-line bg-surface px-3 font-normal text-ink focus-visible:outline-2 focus-visible:outline-brand"
              />
            </label>
            {gate && (
              <label className="text-sm font-semibold text-ink">
                <span className="mb-1 block">Бодолт нээх (хоног)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(e.target.value === "" ? "" : Math.trunc(Number(e.target.value)))}
                  className="h-11 w-24 rounded-xl border border-line bg-surface px-2 text-center font-normal tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-brand"
                />
              </label>
            )}
            <Button
              type="button"
              disabled={!pick || busy !== null}
              onClick={() =>
                void run(
                  "assign",
                  async () => {
                    const res = await api<ExamSettings>(`${base}/classes/${encodeURIComponent(pick)}`, {
                      method: "POST",
                      body: {
                        ...(date ? { date: fromLocalInputUB(`${date}T09:00`) } : {}),
                        ...(gate && days !== "" ? { reviewAfterDays: days } : {}),
                      },
                    });
                    setPick("");
                    return res;
                  },
                  "Ангид оноолоо",
                )
              }
            >
              <Plus aria-hidden /> Оноох
            </Button>
          </div>
        )}
      </Section>

      <Section icon={Clock} title="Хугацаа">
        {data.permissions.canEditTime ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`minutes-${testId}`}>
              Хугацаа (минут)
            </label>
            <input
              id={`minutes-${testId}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value === "" ? "" : Math.trunc(Number(e.target.value)))}
              className="h-11 w-24 rounded-xl border border-line bg-surface px-2 text-center tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
            <span className="text-sm text-ink-dim">минут</span>
            <Button
              size="sm"
              type="button"
              disabled={busy !== null || minutes === "" || minutes === data.test.timeLimitMin}
              onClick={() =>
                void run(
                  "time",
                  async () => {
                    await api(`/tests/${encodeURIComponent(testId)}`, {
                      method: "PATCH",
                      body: { timeLimitMin: minutes, expectedVersion: data.test.version },
                    });
                  },
                  "Хугацаа хадгалагдлаа",
                )
              }
            >
              <Save aria-hidden /> Хадгалах
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink">{data.test.timeLimitMin ? `${data.test.timeLimitMin} минут` : "Хугацаагүй"}</p>
        )}
      </Section>

      {fills.length > 0 && (
        <Section icon={Workflow} title="2-р хэсгийн оноожуулалт">
          <div className="space-y-3">
            {fills.map((p, i) => (
              <ScoringGroupsEditor
                key={`${p.problemId}:${JSON.stringify(p.groups ?? null)}`}
                testId={testId}
                problem={p}
                partIndex={i + 1}
                canEdit={data.permissions.canEditContent}
                locked={data.test.taken}
                onSaved={(next) => {
                  apply(next);
                  onChanged();
                }}
                onReload={() => void load()}
              />
            ))}
          </div>
        </Section>
      )}

      {data.permissions.canSetPrice && (
        <Section icon={Tag} title="Үнэ">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`price-${testId}`}>
              Үнэ (төгрөг)
            </label>
            <input
              id={`price-${testId}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Math.max(0, Math.trunc(Number(e.target.value))))}
              className="h-11 w-32 rounded-xl border border-line bg-surface px-2 text-right tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
            <span className="text-sm text-ink-dim">төгрөг</span>
            <Button
              size="sm"
              type="button"
              disabled={busy !== null || (price === "" ? null : price) === (data.test.price ?? null)}
              onClick={() =>
                void run(
                  "price",
                  async () => {
                    await api(`/tests/${encodeURIComponent(testId)}`, {
                      method: "PATCH",
                      body: { price: price === "" ? null : price, expectedVersion: data.test.version },
                    });
                  },
                  "Үнэ хадгалагдлаа",
                )
              }
            >
              <Save aria-hidden /> Хадгалах
            </Button>
          </div>
        </Section>
      )}
    </div>
  );
}
