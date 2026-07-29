"use client";

import {
  AlertTriangle,
  Ban,
  Circle,
  CircleAlert,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/* ============================================================================
 * 🎨 ДАВТАМЖИЙН АНХААРУУЛГА (owner-ийн спек):
 *   - Сүүлийн 30 хоногт 3+ удаа ХИЙГЭЭГҮЙ (NOT_DONE)         → амбар
 *   - Сүүлийн 30 хоногт 3+ удаа ДУТУУ (SUBMITTED/RETURNED)    → шар өнгөтэй ойролцоо
 *     боловч ICON-оор ялгагдана (өнгөөр дангаараа биш — иймд ХИЙГЭЭГҮЙ/ДУТУУ хоёулаа
 *     `warning` дизайн-токен ашигладаг ба зөвхөн ICON+текстээр ялгаатай)
 *   - 5+ аль нэг нь тохиолдвол                                → бор улаан (error)
 *   - Сүүлийн 2 удаа зүгээр л ТЭМДЭГЛЭГДЭЭГҮЙ (30 хоногоос үл хамааран) → саарал
 *
 * Энэ компонент classroomId авдаггүй (эцэг компонент руу шинэ prop нэмэхгүйн тулд,
 * "зөвхөн миний файлууд" дүрмийг баримтална) — оронд нь өгөгдсөн `assignments`
 * жагсаалт (аль хэдийн тухайн ангийнх, createdAt-аар буурахаар эрэмбэлэгдсэн)
 * дотроос сүүлийн 30 хоногийн болон сүүлийн 2 даалгаврын roster-ийг
 * (/assignments/:id/submissions — classroomId шаардахгүй) шууд татаж нэгтгэнэ.
 * ========================================================================== */

interface FreqAssignment {
  id: string;
  createdAt: string;
}

interface RosterEntry {
  student: { id: string; firstName: string; lastName: string };
  state: string;
}

interface StudentFreq {
  student: { id: string; firstName: string; lastName: string };
  notDone: number;
  partial: number;
  lastTwoUnmarked: boolean;
}

const THIRTY_DAYS_MS = 30 * 86_400_000;
// Сүлжээний ачааллыг хязгаарлана — ихэнх ангид 30 хоногт үүнээс хэтэрдэггүй.
const MAX_FETCH = 40;

type Status = "idle" | "loading" | "ready" | "error";

function Badge({
  icon: Icon,
  text,
  tone,
}: {
  icon: LucideIcon;
  text: string;
  tone: "amber" | "red" | "grey";
}) {
  const cls =
    tone === "red"
      ? "border-error/30 bg-error/10 text-error"
      : tone === "amber"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-line bg-ink/5 text-ink-dim";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

export default function TeacherHomeworkFrequencyPanel({
  assignments,
}: {
  assignments: FreqAssignment[];
}) {
  const [rows, setRows] = useState<StudentFreq[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const cutoff = Date.now() - THIRTY_DAYS_MS;
    // assignments аль хэдийн createdAt-аар буурахаар эрэмбэлэгдсэн (API-гийн гэрээ)
    const recent = assignments
      .filter((a) => new Date(a.createdAt).getTime() >= cutoff)
      .slice(0, MAX_FETCH);
    const lastTwo = assignments.slice(0, 2);

    const idSet = new Set<string>();
    for (const a of recent) idSet.add(a.id);
    for (const a of lastTwo) idSet.add(a.id);
    const ids = [...idSet];

    // setState-г үргэлж async callback дотор (effect body-д синхрон биш) дуудахын
    // тулд хоосон тохиолдлуудыг ч Promise chain-ээр дамжуулна.
    if (ids.length === 0) {
      Promise.resolve().then(() => {
        if (!alive) return;
        setRows([]);
        setStatus("ready");
      });
      return () => {
        alive = false;
      };
    }

    setStatus("loading");
    setError("");
    Promise.all(
      ids.map((id) =>
        api<RosterEntry[]>(`/assignments/${id}/submissions`).then(
          (r) => [id, r] as const,
        ),
      ),
    )
      .then((pairs) => {
        if (!alive) return;
        const byAssignment = new Map(pairs);

        const students = new Map<
          string,
          { id: string; firstName: string; lastName: string }
        >();
        for (const roster of byAssignment.values()) {
          for (const row of roster) students.set(row.student.id, row.student);
        }

        const recentIds = recent.map((a) => a.id);
        const lastTwoIds = lastTwo.map((a) => a.id);

        const result: StudentFreq[] = [...students.values()].map(
          (student) => {
            let notDone = 0;
            let partial = 0;
            for (const aid of recentIds) {
              const roster = byAssignment.get(aid) ?? [];
              const row = roster.find((r) => r.student.id === student.id);
              const state = row?.state ?? "NOT_DONE";
              if (state === "NOT_DONE") notDone++;
              else if (state === "SUBMITTED" || state === "RETURNED")
                partial++;
            }
            const lastTwoUnmarked =
              lastTwoIds.length === 2 &&
              lastTwoIds.every((aid) => {
                const roster = byAssignment.get(aid) ?? [];
                const row = roster.find((r) => r.student.id === student.id);
                return (row?.state ?? "NOT_DONE") === "NOT_DONE";
              });
            return { student, notDone, partial, lastTwoUnmarked };
          },
        );

        result.sort((a, b) => b.notDone + b.partial - (a.notDone + a.partial));
        setRows(
          result.filter(
            (r) => r.notDone >= 3 || r.partial >= 3 || r.lastTwoUnmarked,
          ),
        );
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setStatus("error");
      });

    return () => {
      alive = false;
    };
  }, [assignments]);

  if (status === "idle") return null;

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <h3 className="mb-1 text-sm font-bold text-brand-soft">
        Анхаарах шаардлагатай
      </h3>
      <p className="mb-3 text-xs text-ink-dim">
        Сүүлийн 30 хоногт 3+ удаа хийгээгүй/дутуу, эсвэл сүүлийн 2 удаа
        тэмдэглэгдээгүй сурагчид.
      </p>

      {status === "loading" && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Тооцоолж байна…
        </p>
      )}

      {status === "error" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
        </div>
      )}

      {status === "ready" && rows.length === 0 && (
        <p className="text-sm text-ink-dim">
          Одоогоор анхаарах шаардлагатай сурагч алга.
        </p>
      )}

      {status === "ready" && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.student.id}
              className="flex flex-col gap-1.5 rounded-lg border border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium">
                {r.student.firstName} {r.student.lastName}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {r.notDone >= 5 && (
                  <Badge icon={Ban} text={`${r.notDone}× хийгээгүй`} tone="red" />
                )}
                {r.notDone >= 3 && r.notDone < 5 && (
                  <Badge
                    icon={AlertTriangle}
                    text={`${r.notDone}× хийгээгүй`}
                    tone="amber"
                  />
                )}
                {r.partial >= 5 && (
                  <Badge icon={CircleAlert} text={`${r.partial}× дутуу`} tone="red" />
                )}
                {r.partial >= 3 && r.partial < 5 && (
                  <Badge icon={CircleDashed} text={`${r.partial}× дутуу`} tone="amber" />
                )}
                {r.lastTwoUnmarked && (
                  <Badge
                    icon={Circle}
                    text="сүүлийн 2-г тэмдэглээгүй"
                    tone="grey"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
