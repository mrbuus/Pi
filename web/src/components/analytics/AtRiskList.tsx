"use client";

import Link from "next/link";
import InfoHint from "@/components/ui/InfoHint";
import type { AtRiskStudent } from "./types";

const REASON_LABEL: Record<string, { label: string; colorClass: string }> = {
  INACTIVE: { label: "Идэвхгүй", colorClass: "bg-error/15 text-error" },
  DECLINING: { label: "Амжилт буурч байна", colorClass: "bg-warning/15 text-warning" },
};

// api/src/analytics/analytics.service.ts-тэй тохирсон шалгуур — эндээс
// тайлбарыг гараар бичсэн тул логик өөрчлөгдвөл энд ч засах хэрэгтэй.
function reasonHint(reason: string, windowDays: number): string {
  if (reason === "INACTIVE") {
    return `Сүүлийн ${windowDays} хоногт нэвтэрч, ямар нэгэн үйлдэл хийгээгүй.`;
  }
  return "Сүүлийн үеийн амжилтын хувь өмнөх мөн урттай хугацаанаас 15 нэгжээс их буурсан (хоёр хугацаанд тус бүр дор хаяж 5 бодлого бодсон байх шаардлагатай).";
}

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

export default function AtRiskList({
  students,
  windowDays,
}: {
  students: AtRiskStudent[];
  windowDays: number;
}) {
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
              {s.classroomName} — {formatLastActive(s.lastActiveAt)}
              {s.recentSuccessRate !== null && (
                <>
                  {" "}
                  — Амжилт: {pct(s.recentSuccessRate)}
                  {s.priorSuccessRate !== null && ` (өмнө нь ${pct(s.priorSuccessRate)})`}
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {s.reasons.map((r) => (
              <span
                key={r}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${REASON_LABEL[r].colorClass}`}
              >
                {REASON_LABEL[r].label}
                <InfoHint label={`"${REASON_LABEL[r].label}" гэж юу вэ`}>
                  {reasonHint(r, windowDays)}
                </InfoHint>
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
