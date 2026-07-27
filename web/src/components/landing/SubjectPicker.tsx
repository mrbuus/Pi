"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { api } from "@/lib/api";

// ============ Төрлүүд (сервертэй яг тохирсон байх ёстой) ============
//
// GET /enrollment-windows →
//   [{ subject, status, availability, note? }]
//
// Аль ч хичээл ЗӨВХӨН энэ өгөгдлөөр удирддаг — танхим/онлайн зөвшөөрлийн
// дүрмийг энд hardcode хийхгүй (availability талбар нь эх сурвалж).

export type Subject = "MATH" | "SOCIAL_STUDIES" | "SAT";
export type StudentType = "CLASSROOM" | "ONLINE";
export type EnrollmentStatus = "OPEN" | "CLOSED" | "COMING_SOON";
export type SubjectAvailability = "CLASSROOM_ONLY" | "ONLINE_ONLY" | "BOTH";

export interface EnrollmentWindow {
  subject: Subject;
  status: EnrollmentStatus;
  availability: SubjectAvailability;
  note?: string | null;
}

// UI-д харуулах дараалал, Монгол нэр — өгөгдөл биш, зөвхөн танилцуулга.
export const SUBJECT_ORDER: Subject[] = ["MATH", "SOCIAL_STUDIES", "SAT"];
export const SUBJECT_LABELS: Record<Subject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгэм судлал",
  SAT: "SAT",
};

// API амжилтгүй болвол хаалттай харагдуулахаас илүү нээлттэй гэж үзсэн нь
// дээр — хаалттай дэлгүүр шиг харагдвал бодит лийд алдана, харин нээлттэй
// гэж үзээд дараа нь татгалзах нь хямд алдаа. (5-р шаардлага)
function fallbackOpenWindows(): EnrollmentWindow[] {
  return SUBJECT_ORDER.map((subject) => ({
    subject,
    status: "OPEN",
    availability: "BOTH",
  }));
}

// `enabled=false` үед fetch хийхгүй — SubjectPicker өөрөө windows prop-оор
// өгөгдөл авсан үед (жишээ нь LeadForm аль хэдийн татаж авсан) давхар
// сүлжээний хүсэлт явуулахгүйн тулд.
export function useEnrollmentWindows(enabled = true) {
  const [windows, setWindows] = useState<EnrollmentWindow[] | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [failedOpen, setFailedOpen] = useState(false);

  // Гараар дахин татах (жишээ нь LeadForm-ийн 400 алдааны дараа) — эффект
  // дотор шууд дуудагдахгүй тул "effect дотор synchronous setState" гэсэн
  // lint дүрэмд орохгүй.
  const refetch = useCallback(async (): Promise<EnrollmentWindow[]> => {
    setLoading(true);
    try {
      const result = await api<EnrollmentWindow[]>("/enrollment-windows", {
        auth: false,
      });
      setWindows(result);
      setFailedOpen(false);
      return result;
    } catch (err) {
      // Зориуд: хаалттай биш, нээлттэй fallback ашиглаж байгааг
      // мониторинг/консолд мэдэгдэнэ.
      console.error(
        "GET /enrollment-windows амжилтгүй боллоо — бүх хичээлийг сонгох боломжтой гэж үзэв.",
        err,
      );
      const fallback = fallbackOpenWindows();
      setWindows(fallback);
      setFailedOpen(true);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // `loading`-ийг эндээс эхлүүлж synchronous setState хийхгүй — анхны
    // утга нь `enabled` дагаж аль хэдийн true байдаг (дээрх useState).
    api<EnrollmentWindow[]>("/enrollment-windows", { auth: false })
      .then((result) => {
        if (!alive) return;
        setWindows(result);
        setFailedOpen(false);
      })
      .catch((err) => {
        if (!alive) return;
        // Зориуд: хаалттай биш, нээлттэй fallback ашиглаж байгааг консолд
        // мэдэгдэнэ.
        console.error(
          "GET /enrollment-windows амжилтгүй боллоо — бүх хичээлийг сонгох боломжтой гэж үзэв.",
          err,
        );
        setWindows(fallbackOpenWindows());
        setFailedOpen(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { windows, loading, failedOpen, refetch };
}

function statusIcon(status: EnrollmentStatus) {
  if (status === "OPEN") return "✓";
  if (status === "COMING_SOON") return "⏳";
  return "✕";
}

function statusText(status: EnrollmentStatus): string {
  if (status === "OPEN") return "сонгох боломжтой";
  if (status === "COMING_SOON") return "идэвхгүй · Удахгүй";
  return "идэвхгүй · Элсэлт одоогоор дууссан";
}

interface LockInfo {
  locked: true;
  reason: string;
}
interface UnlockInfo {
  locked: false;
}
type LockState = LockInfo | UnlockInfo;

function lockStateFor(
  win: EnrollmentWindow,
  studentType: StudentType | undefined,
): LockState {
  if (win.status !== "OPEN") {
    const reason =
      win.status === "COMING_SOON"
        ? `${SUBJECT_LABELS[win.subject]}-ийн элсэлт хараахан зарлагдаагүй байна`
        : `${SUBJECT_LABELS[win.subject]}-ийн элсэлт одоогоор дууссан байна`;
    return { locked: true, reason };
  }
  if (
    studentType === "ONLINE" &&
    win.availability === "CLASSROOM_ONLY"
  ) {
    return {
      locked: true,
      reason: `${SUBJECT_LABELS[win.subject]} зөвхөн танхимын ангид байдаг`,
    };
  }
  return { locked: false };
}

interface SubjectPickerProps {
  /** Сонгосон хичээлүүд (эцэг компонент удирдана). */
  value: Subject[];
  onChange: (next: Subject[]) => void;
  /**
   * Мэдэгдэж байгаа бол (жишээ нь бүртгэлийн хуудсанд) зөвхөн танхимын
   * ангийн хичээлийг онлайн сурагчид идэвхгүй болгоно. Мэдэгдэхгүй бол
   * (жишээ нь лийдийн маягт) бүх хичээл харуулна, зөвхөн шошгоор мэдээлнэ.
   */
  studentType?: StudentType;
  /** Гаднаас өгвөл дахин fetch хийхгүй, өгөгдлөө хуваалцана (жишээ нь LeadForm). */
  windows?: EnrollmentWindow[] | null;
  loading?: boolean;
  legend?: string;
  className?: string;
}

export default function SubjectPicker({
  value,
  onChange,
  studentType,
  windows: windowsProp,
  loading: loadingProp,
  legend = "Хичээл",
  className = "",
}: SubjectPickerProps) {
  const ownFetch = useEnrollmentWindows(windowsProp === undefined);
  const windows = windowsProp !== undefined ? windowsProp : ownFetch.windows;
  const loading = loadingProp !== undefined ? loadingProp : ownFetch.loading;
  const idPrefix = useId();
  const legendId = `${idPrefix}-legend`;
  const [explainFor, setExplainFor] = useState<Subject | null>(null);

  function toggle(subject: Subject, win: EnrollmentWindow) {
    const { locked } = lockStateFor(win, studentType);
    if (locked) {
      setExplainFor((cur) => (cur === subject ? cur : subject));
      return;
    }
    setExplainFor(null);
    if (value.includes(subject)) {
      onChange(value.filter((s) => s !== subject));
    } else {
      onChange([...value, subject]);
    }
  }

  const orderedWindows = windows
    ? SUBJECT_ORDER.map((s) => windows.find((w) => w.subject === s)).filter(
        (w): w is EnrollmentWindow => !!w,
      )
    : [];

  return (
    <div className={className}>
      <span id={legendId} className="mb-1.5 block text-sm font-semibold text-ink">
        {legend}
      </span>

      {loading && !windows ? (
        <p className="text-sm text-ink-dim">Хичээлүүдийг ачаалж байна…</p>
      ) : (
        <div
          role="group"
          aria-labelledby={legendId}
          className="grid gap-2 sm:grid-cols-2"
        >
          {orderedWindows.map((win) => {
            const subject = win.subject;
            const checked = value.includes(subject);
            const lockState = lockStateFor(win, studentType);
            const locked = lockState.locked;
            const classroomOnly = win.availability === "CLASSROOM_ONLY";
            const checkboxId = `${idPrefix}-${subject}`;
            const explainId = `${idPrefix}-${subject}-explain`;

            return (
              <div key={subject}>
                <label
                  htmlFor={checkboxId}
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-brand bg-brand/10"
                      : locked
                        ? "border-line opacity-60"
                        : "border-line hover:border-brand/50"
                  }`}
                  style={locked ? { cursor: "not-allowed" } : undefined}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    // 🚨 Санаатайгаар native `disabled` ашиглахгүй: disabled input
                    // click/keyboard идэвхжихгүй тул тайлбар харуулах боломжгүй
                    // болно. Оронд нь aria-disabled + onClick-д зогсоож тайлбар
                    // гаргана — товчлуур ХЭЗЭЭ Ч "үхсэн мэт" харагдахгүй.
                    aria-disabled={locked}
                    aria-describedby={
                      locked && explainFor === subject ? explainId : undefined
                    }
                    onClick={(e) => {
                      if (locked) {
                        e.preventDefault();
                        toggle(subject, win);
                      }
                    }}
                    onChange={() => {
                      if (!locked) toggle(subject, win);
                    }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-ink">
                        {SUBJECT_LABELS[subject]}
                      </span>
                      {classroomOnly && (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-dim">
                          (зөвхөн танхимын анги)
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-dim">
                      <span aria-hidden>{statusIcon(win.status)}</span>
                      {statusText(win.status)}
                    </span>
                  </span>
                </label>

                {lockState.locked && explainFor === subject && (
                  <p
                    id={explainId}
                    role="status"
                    className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-dim"
                  >
                    <span aria-hidden>ⓘ</span>
                    {lockState.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-dim">
        {value.length === 0
          ? "Дор хаяж 1 хичээл сонгоно уу."
          : `${value.length} хичээл сонгосон.`}
      </p>
    </div>
  );
}
