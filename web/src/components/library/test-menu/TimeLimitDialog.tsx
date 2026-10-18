"use client";

import { useId, useState } from "react";
import { Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import ActionDialog from "./ActionDialog";
import { errorMessage, variantName, useVariantSettings, type MenuTest } from "./shared";

const PRESETS = [30, 40, 45, 60, 90];
const MAX_MIN = 600;

/**
 * «Хугацаа»: A ба B хувилбарт НЭГ утга — PATCH /tests/:id {timeLimitMin,
 * expectedVersion}. Серверийн 409 (сурагч өгч байх үед богиносгох, өөр хүн
 * зэрэг засварласан) мессежийг хувилбарын нэртэй нь шууд харуулна.
 */
export default function TimeLimitDialog({
  tests,
  onSaved,
  onClose,
}: {
  tests: MenuTest[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const settings = useVariantSettings(tests.map((t) => t.id));
  const ready = !settings.loading && !settings.error && tests.every((t) => settings.byId[t.id]);
  const current = tests.map((t) => settings.byId[t.id]?.test.timeLimitMin ?? null);
  const same = new Set(current).size === 1;
  const canEdit = ready && tests.every((t) => settings.byId[t.id]?.permissions.canEditTime);
  const taken = ready && tests.some((t) => settings.byId[t.id]?.test.taken);

  // Анхны утга: бүгд ижил бол тэр, эс бөгөөс хамгийн их нь (богиносгохгүйгээр эхэлнэ)
  const finite = current.filter((v): v is number => v !== null);
  const initial = same ? current[0] : finite.length > 0 ? Math.max(...finite) : null;
  const [draft, setDraft] = useState<{ minutes: string; unlimited: boolean } | null>(null);
  const minutes = draft?.minutes ?? (initial === null ? "" : String(initial));
  const unlimited = draft?.unlimited ?? (ready && initial === null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const hintId = useId();

  const value = unlimited ? null : Number(minutes);
  const invalid = !unlimited && (!/^\d+$/.test(minutes) || value === null || value < 1 || value > MAX_MIN);
  const changed = ready && current.some((v) => v !== value);
  const dirty = draft !== null && changed;

  async function save() {
    if (!canEdit || invalid || saving) return;
    setSaving(true);
    setError("");
    const failures: string[] = [];
    for (const [i, t] of tests.entries()) {
      const s = settings.byId[t.id];
      if (!s || s.test.timeLimitMin === value) continue;
      try {
        await api(`/tests/${encodeURIComponent(t.id)}`, {
          method: "PATCH",
          body: { timeLimitMin: value, ...(s.test.version !== undefined ? { expectedVersion: s.test.version } : {}) },
        });
      } catch (e) {
        failures.push(`${variantName(t, i)}: ${errorMessage(e)}`);
      }
    }
    setSaving(false);
    if (failures.length === 0) {
      toast.success(value === null ? "Хугацааны хязгаар хасагдлаа" : `Хугацаа ${value} минут боллоо`);
      onSaved();
      onClose();
      return;
    }
    setError(failures.join(" — "));
    onSaved();
    settings.reload();
  }

  return (
    <ActionDialog
      title="Хугацаа"
      description="A, B хувилбарт хамт үйлчилнэ"
      dirty={dirty}
      busy={saving}
      onClose={onClose}
      footer={
        canEdit ? (
          <>
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              Болих
            </Button>
            <Button type="button" disabled={invalid || !changed || saving} onClick={() => void save()}>
              {saving ? "Хадгалж байна" : "Хадгалах"}
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={onClose}>
            Хаах
          </Button>
        )
      }
    >
      {settings.error ? (
        <ErrorState message={settings.error} onRetry={settings.reload} />
      ) : !ready ? (
        <LoadingState rows={3} label="Хугацааг ачаалж байна" />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
            <p className="text-ink-dim">Одоогийн хугацаа</p>
            {same ? (
              <p className="font-semibold text-ink">{current[0] === null ? "Хугацаагүй" : `${current[0]} минут`}</p>
            ) : (
              <ul className="mt-0.5 space-y-0.5">
                {tests.map((t, i) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span className="text-ink-dim">{variantName(t, i)}</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {current[i] === null ? "Хугацаагүй" : `${current[i]} минут`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!canEdit ? (
            <p className="flex items-start gap-2 text-sm text-ink-dim">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Хугацааг тестийг үүсгэсэн багш, Багш+ эсвэл админ өөрчилнө
            </p>
          ) : (
            <>
              <div>
                <label htmlFor={inputId} className="mb-1 block text-sm font-semibold text-ink">
                  Шинэ хугацаа (минут)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id={inputId}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_MIN}
                    step={5}
                    value={unlimited ? "" : minutes}
                    disabled={unlimited || saving}
                    aria-invalid={invalid}
                    aria-describedby={hintId}
                    onChange={(e) => setDraft({ minutes: e.target.value, unlimited: false })}
                    className="h-11 w-28 rounded-xl border border-line bg-bg px-3 text-center text-base tabular-nums text-ink outline-none focus:border-brand disabled:opacity-50"
                  />
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Түгээмэл хугацаа">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={saving}
                        aria-pressed={!unlimited && value === p}
                        onClick={() => setDraft({ minutes: String(p), unlimited: false })}
                        className={cn(
                          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-brand",
                          !unlimited && value === p
                            ? "border-transparent bg-brand-bright text-on-brand"
                            : "border-line bg-surface text-ink hover:bg-ink/5",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <p id={hintId} className={cn("mt-1 text-xs", invalid ? "text-error" : "text-ink-dim")}>
                  {invalid ? `1-ээс ${MAX_MIN} хүртэлх бүхэл минут оруулна уу` : "Сурагч эхэлмэгц сервер цагийг барина"}
                </p>
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={unlimited}
                  disabled={saving}
                  onChange={(e) => setDraft({ minutes, unlimited: e.target.checked })}
                  className="h-5 w-5 accent-brand-bright"
                />
                Хугацаа хязгаарлахгүй
              </label>

              {!same && (
                <p className="flex items-start gap-2 text-sm text-ink-dim">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Хувилбаруудын хугацаа одоо ялгаатай — хадгалахад хоёулаа ижил болно
                </p>
              )}
              {taken && (
                <p className="flex items-start gap-2 text-sm text-ink-dim">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  Сурагч өгч эхэлсэн тест: уртасгаж болно, өгч байх үед богиносгох боломжгүй
                </p>
              )}
            </>
          )}

          {error && <ErrorState message={error} />}
        </form>
      )}
    </ActionDialog>
  );
}
