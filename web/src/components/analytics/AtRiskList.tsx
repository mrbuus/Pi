"use client";

import Link from "next/link";
import type { AtRiskStudent } from "./types";

const REASON_LABEL: Record<string, { label: string; colorClass: string }> = {
  INACTIVE: { label: "Идэвхгүй", colorClass: "bg-error/15 text-error" },
  DECLINING: { label: "Амжилт буурч байна", colorClass: "bg-warning/15 text-warning" },
};

function formatLastActive(iso: string | null): string {
  if (!iso) return "Идэвх бүртгэгдээгүй";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Өнөөдөр";
  if (days === 1) return "Өчигдөр";
  return `${days} хоногийн өмнө`;
}

function pct(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 100)}%`;
}

// 🚨 admin/students модулийг өөр агент яг одоо тусад нь хөгжүүлж байгаа тул
// сурагчийн профайл хуудасны яг зам ({studentId}-ийн routing) баталгаажаагүй.
// Одоогийн /app/admin/students/[id] гэсэн таамаглалыг ашиглаж байна — тэр
// хуудас нийтлэгдсэний дараа шаардлагатай бол зам засах хэрэгтэй.
function studentHref(studentId: string): string {
  return `/app/admin/students/${studentId}`;
}

export default function AtRiskList({ students }: { students: AtRiskStudent[] }) {
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-dim">
        Одоогоор эрсдэлтэй тэмдэглэгдсэн сурагч алга — сайн байна.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {students.map((s) => (
        <li
          key={s.studentId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
        >
          <div className="min-w-0">
            <Link
              href={studentHref(s.studentId)}
              className="font-medium text-ink hover:text-brand hover:underline"
            >
              {s.name}
            </Link>
            <p className="text-xs text-ink-dim">
              {s.classroomName} · {formatLastActive(s.lastActiveAt)}
              {s.recentSuccessRate !== null && (
                <>
                  {" "}
                  · Амжилт: {pct(s.recentSuccessRate)}
                  {s.priorSuccessRate !== null && ` (өмнө нь ${pct(s.priorSuccessRate)})`}
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {s.reasons.map((r) => (
              <span
                key={r}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${REASON_LABEL[r].colorClass}`}
              >
                {REASON_LABEL[r].label}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
