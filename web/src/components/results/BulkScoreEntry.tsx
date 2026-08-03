"use client";

/* ============================================================================
 * BulkScoreEntry — цаасан шалгалтын дүнг бүх ангиар нэг дор оруулах горим.
 *
 * Багш 40 хариултын хуудастай сууж, ангийн жагсаалтыг дараалан бөглөнө.
 * Enter/↓ дараагийн сурагч руу, ↑ өмнөх рүү шилжинэ — гар (keyboard)-аар л
 * бүгдийг хийж болно. Аль хэдийн дүнтэй сурагчийг түгжиж (locked), "Дахин
 * оруулах" товчоор л дарж бичихийг зөвшөөрнө — багшийн санамсаргүй дарж
 * бичихээс хамгаална (сервер талд ONLINE дүнг дарж бичихгүй байдгийг UI
 * талд ийнхүү тусгав).
 * ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import type { ClassroomOption, ResultRow, RosterStudent } from "./types";
import { fullName, sourceLabel } from "./types";

function todayUBKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date());
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

interface EntryState {
  value: string;
  locked: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError?: string;
}

// value нь maxScore-той харьцуулахад хүчинтэй эсэхийг шалгана
function rangeError(value: string, maxScore: number): string | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return "Тоо оруулна уу";
  if (n < 0 || n > maxScore) return `0–${maxScore} хооронд байх ёстой`;
  return null;
}

export default function BulkScoreEntry({
  testId,
  classroomOptions,
  classroomsLoading,
  existingResults,
  onSaved,
}: {
  testId: string;
  classroomOptions: ClassroomOption[];
  classroomsLoading: boolean;
  existingResults: ResultRow[];
  onSaved: () => void;
}) {
  const [classroomId, setClassroomId] = useState("");
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [entries, setEntries] = useState<Record<string, EntryState>>({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const controlRefs = useRef<(HTMLInputElement | HTMLButtonElement | null)[]>([]);
  const rosterRequestId = useRef(0);

  // Анги сонголт: тестэд оноогдсон анги(уудаас) эхнийхийг автоматаар сонгоно
  useEffect(() => {
    if (!classroomId && classroomOptions.length > 0) {
      setClassroomId(classroomOptions[0].id);
    }
  }, [classroomId, classroomOptions]);

  const existingByStudent = useMemo(
    () => new Map(existingResults.map((r) => [r.student.id, r])),
    [existingResults],
  );

  // Анги сонгогдох бүрд бүртгэлийн жагсаалт (roster) татна
  const loadRoster = useCallback((id: string) => {
    const requestId = ++rosterRequestId.current;
    setRosterLoading(true);
    setRosterError("");
    api<{ student: RosterStudent; status: string | null }[]>(
      `/classrooms/${id}/attendance?date=${todayUBKey()}`,
    )
      .then((rows) => {
        if (rosterRequestId.current !== requestId) return;
        setRoster(rows.map((r) => r.student));
      })
      .catch((e) => {
        if (rosterRequestId.current !== requestId) return;
        setRosterError(errMsg(e));
      })
      .finally(() => {
        if (rosterRequestId.current === requestId) setRosterLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!classroomId) {
      setRoster(null);
      return;
    }
    loadRoster(classroomId);
  }, [classroomId, loadRoster]);

  // Roster ирэх бүрд оруулах талбаруудыг эхлүүлнэ — аль хэдийн дүнтэй
  // сурагчийг түгжиж (locked), одоогийн дүнг нь урьдчилж харуулна
  useEffect(() => {
    if (!roster) return;
    setEntries(() => {
      const next: Record<string, EntryState> = {};
      for (const s of roster) {
        const existing = existingByStudent.get(s.id);
        next[s.id] = {
          value: existing ? String(existing.totalScore) : "",
          locked: !!existing,
          saveState: "idle",
        };
      }
      return next;
    });
    controlRefs.current = roster.map(() => null);
    setBanner(null);
    // roster солигдох үед л дахин эхлүүлнэ — existingResults дараа нь
    // сэргэхэд (Хадгалсны дараа) тухайн мөрийн утгыг арилгахгүй
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster]);

  const maxScoreNum = Number(maxScore);
  const maxScoreValid = Number.isFinite(maxScoreNum) && maxScoreNum > 0;

  const filledCount =
    roster?.filter((s) => (entries[s.id]?.value ?? "").trim() !== "").length ?? 0;

  function focusControl(idx: number) {
    const el = controlRefs.current[idx];
    el?.focus();
  }

  function handleNavKey(e: KeyboardEvent, idx: number) {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusControl(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusControl(idx - 1);
    }
  }

  function setValue(studentId: string, value: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], value, saveState: "idle", saveError: undefined },
    }));
  }

  function unlock(studentId: string, idx: number) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], locked: false },
    }));
    requestAnimationFrame(() => focusControl(idx));
  }

  async function saveAll() {
    setBanner(null);
    if (!roster) return;
    if (!maxScoreValid) {
      setBanner({ tone: "error", text: "Нийт оноог 1-ээс дээш тоогоор бичнэ үү" });
      return;
    }
    const candidates = roster.filter((s) => {
      const e = entries[s.id];
      if (!e || e.locked) return false;
      return e.value.trim() !== "" && rangeError(e.value, maxScoreNum) === null;
    });
    if (candidates.length === 0) {
      setBanner({ tone: "error", text: "Хадгалах шинэ дүн алга байна" });
      return;
    }

    setSaving(true);
    setEntries((prev) => {
      const next = { ...prev };
      for (const s of candidates) next[s.id] = { ...next[s.id], saveState: "saving" };
      return next;
    });

    const outcomes = await Promise.all(
      candidates.map(async (s) => {
        try {
          await api(`/tests/${testId}/results`, {
            method: "POST",
            body: {
              studentId: s.id,
              totalScore: Number(entries[s.id].value),
              maxScore: maxScoreNum,
            },
          });
          return { id: s.id, ok: true as const };
        } catch (e) {
          return { id: s.id, ok: false as const, message: errMsg(e) };
        }
      }),
    );

    setEntries((prev) => {
      const next = { ...prev };
      for (const o of outcomes) {
        next[o.id] = {
          ...next[o.id],
          saveState: o.ok ? "saved" : "error",
          saveError: o.ok ? undefined : o.message,
          locked: o.ok ? true : next[o.id].locked,
        };
      }
      return next;
    });
    setSaving(false);

    const failed = outcomes.filter((o) => !o.ok);
    if (failed.length > 0) {
      setBanner({
        tone: "error",
        text: `${failed.length} мөр хадгалагдсангүй — доор улаанаар тэмдэглэсэн бөгөөд утга нь хэвээр байна. Дахин "Хадгалах"-ыг дарж үзнэ үү.`,
      });
    } else {
      setBanner({ tone: "ok", text: `${outcomes.length} сурагчийн дүн хадгалагдлаа` });
    }
    onSaved();
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-1 text-lg font-bold text-brand-soft">Бөөнөөр дүн оруулах</h2>
      <p className="mb-4 text-base text-ink-dim">
        Ангийн жагсаалтаас дараалан оноогоо бичээд Enter дарж дараагийнх руу шилжинэ.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="bulk-classroom" className="text-sm font-semibold text-ink-dim">
            Анги
          </label>
          <select
            id="bulk-classroom"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            disabled={classroomsLoading || classroomOptions.length === 0}
            className="h-11 rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus-visible:border-brand"
          >
            {classroomOptions.length === 0 && <option value="">Анги олдсонгүй</option>}
            {classroomOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bulk-max" className="text-sm font-semibold text-ink-dim">
            Нийт оноо
          </label>
          <input
            id="bulk-max"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            inputMode="numeric"
            className={`h-11 w-24 rounded-lg border bg-surface px-3 text-base text-ink outline-none focus-visible:border-brand ${
              maxScoreValid ? "border-line" : "border-error"
            }`}
          />
        </div>
        {roster && (
          <p className="text-base font-semibold text-ink" aria-live="polite">
            {filledCount} / {roster.length} оруулсан
          </p>
        )}
      </div>

      {classroomsLoading && (
        <p className="text-base text-ink-dim" aria-live="polite">
          Ангиудыг ачааллаж байна…
        </p>
      )}
      {!classroomsLoading && classroomOptions.length === 0 && (
        <p className="rounded-lg border border-line bg-panel p-4 text-base text-ink-dim">
          Энэ тестэд ямар ч анги оноогдоогүй тул бөөнөөр оруулах боломжгүй. Доорх
          хайлтаар сурагчийг нэг нэгээр нь нэмнэ үү.
        </p>
      )}

      {rosterLoading && (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg border border-line bg-panel" />
          ))}
          <p className="sr-only">Ангийн жагсаалт ачаалж байна…</p>
        </div>
      )}

      {!rosterLoading && rosterError && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4">
          <p className="text-base font-semibold text-error">{rosterError}</p>
          <button
            type="button"
            onClick={() => loadRoster(classroomId)}
            className="mt-2 h-11 rounded-lg border border-line px-4 text-base font-semibold text-ink transition hover:bg-panel"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {!rosterLoading && !rosterError && roster && roster.length === 0 && (
        <p className="rounded-lg border border-line bg-panel p-4 text-base text-ink-dim">
          Энэ ангид идэвхтэй сурагч алга байна.
        </p>
      )}

      {!rosterLoading && !rosterError && roster && roster.length > 0 && (
        <div className="space-y-1.5">
          {roster.map((s, idx) => {
            const entry = entries[s.id] ?? { value: "", locked: false, saveState: "idle" as const };
            const existing = existingByStudent.get(s.id);
            const error = entry.locked ? null : rangeError(entry.value, maxScoreValid ? maxScoreNum : 0);
            const n = Number(entry.value);
            const suspicious = Boolean(
              !entry.locked &&
                entry.value.trim() !== "" &&
                Number.isFinite(n) &&
                n === 0 &&
                existing &&
                existing.totalScore > 0,
            );

            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2"
              >
                <span className="w-6 shrink-0 text-sm text-ink-dim">{idx + 1}.</span>
                <span className="min-w-[9rem] flex-1 text-base font-medium text-ink">
                  {fullName(s)}
                </span>

                {entry.locked && existing && (
                  <>
                    <span className="text-sm text-ink-dim">
                      Одоо: <span className="font-semibold text-ink">{existing.totalScore}/{existing.maxScore}</span>{" "}
                      · {sourceLabel(existing.source)}
                    </span>
                    <button
                      type="button"
                      ref={(el) => {
                        controlRefs.current[idx] = el;
                      }}
                      onClick={() => unlock(s.id, idx)}
                      onKeyDown={(e) => handleNavKey(e, idx)}
                      className="h-11 min-w-11 rounded-lg border border-line px-3 text-sm font-semibold text-brand transition hover:bg-panel"
                    >
                      Дахин оруулах
                    </button>
                  </>
                )}

                {!entry.locked && (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <label htmlFor={`score-${s.id}`} className="sr-only">
                      {fullName(s)} авсан оноо
                    </label>
                    <input
                      id={`score-${s.id}`}
                      ref={(el) => {
                        controlRefs.current[idx] = el;
                      }}
                      value={entry.value}
                      onChange={(e) => setValue(s.id, e.target.value)}
                      onKeyDown={(e) => handleNavKey(e, idx)}
                      inputMode="numeric"
                      placeholder="Оноо"
                      aria-invalid={!!error}
                      aria-describedby={error ? `score-err-${s.id}` : undefined}
                      className={`h-11 w-24 rounded-lg border bg-surface px-3 text-base text-ink outline-none focus-visible:border-brand ${
                        error ? "border-error" : "border-line"
                      }`}
                    />
                    <span className="text-sm text-ink-dim">/ {maxScoreValid ? maxScoreNum : "—"}</span>
                    {error && (
                      <span id={`score-err-${s.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-error">
                        <TriangleAlert className="h-3 w-3" aria-hidden />
                        {error}
                      </span>
                    )}
                    {!error && suspicious && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-warning">
                        <TriangleAlert className="h-3 w-3" aria-hidden />
                        Өмнө нь {existing!.totalScore}/{existing!.maxScore} дүнтэй байсан, шалгана уу
                      </span>
                    )}
                    {entry.saveState === "saving" && (
                      <span className="text-sm text-ink-dim">Хадгалж байна…</span>
                    )}
                    {entry.saveState === "saved" && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                        <Check className="h-3 w-3" aria-hidden />
                        Хадгалагдсан
                      </span>
                    )}
                    {entry.saveState === "error" && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-error">
                        <X className="h-3 w-3" aria-hidden />
                        {entry.saveError ?? "Алдаа гарлаа"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {roster && roster.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="h-11 rounded-lg bg-brand-bright px-5 text-base font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Хадгалж байна…" : "Бүгдийг хадгалах"}
          </button>
          {banner && (
            <p
              role="status"
              aria-live="polite"
              className={`text-base font-medium ${banner.tone === "ok" ? "text-success" : "text-error"}`}
            >
              {banner.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
