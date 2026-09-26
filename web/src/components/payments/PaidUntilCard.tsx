"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarClock, CalendarX } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";

/* «Хэдий хүртэл төлсөн» карт (G26). Сурагч өөрийнхийг (/tuition/paid-until/my),
   эцэг эх баталгаажсан хүүхдийнхээ (/tuition/paid-until/:studentId) харна.
   Серверийн тооцоо ирц, амралтыг тооцдог. Өнгө + дүрс + үгээр төлөв. */

// @db.Date / ISO огноог UTC-ээр уншина (бүсээс хамааран өдөр гулсахгүй).
export function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

function daysUntil(iso: string): number {
  const end = new Date(iso);
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endUtc - todayUtc) / 86_400_000);
}


type Status = "loading" | "ready" | "error";

export default function PaidUntilCard({ studentId, compact = false }: { studentId?: string; compact?: boolean }) {
  const path = studentId ? `/tuition/paid-until/${studentId}` : "/tuition/paid-until/my";
  const [data, setData] = useState<{ paidUntil: string | null }>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<{ paidUntil: string | null }>(path)
      .then((d) => {
        if (!alive) return;
        setData(d);
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
  }, [path, tick]);
  const q = { data, status, error, reload: () => { setStatus("loading"); setTick((t) => t + 1); } };

  if (q.status === "loading") {
    return (
      <section className={`chunky ${compact ? "p-4" : "p-5"}`}>
        <LoadingState rows={2} label="Төлбөрийн хугацаа" />
      </section>
    );
  }
  if (q.status === "error") return <ErrorState message={q.error} onRetry={q.reload} />;

  const paidUntil = q.data?.paidUntil ?? null;
  const left = paidUntil ? daysUntil(paidUntil) : null;

  // Өнгө + дүрс + үг гурвуулаа утга илэрхийлнэ (өнгө дангаараа биш).
  const view =
    left === null
      ? {
          tone: "bg-ink/5 text-ink-dim",
          icon: CalendarClock,
          title: "Төлбөрийн хугацаа тооцогдоогүй байна",
          hint: "Анги, төлбөрийн мэдээлэл бүртгэгдмэгц энд харагдана.",
        }
      : left < 0
        ? {
            tone: "bg-error/10 text-error",
            icon: CalendarX,
            title: `${Math.abs(left)} хоногийн өмнө дууссан`,
            hint: "Хичээлээ тасалдуулахгүйн тулд төлбөрөө төлөөрэй.",
          }
        : left <= 7
          ? {
              tone: "bg-warning/10 text-warning",
              icon: CalendarClock,
              title: left === 0 ? "Өнөөдөр дуусна" : `${left} хоногийн дараа дуусна`,
              hint: "Удахгүй дуусах гэж байна — дараагийн сарын төлбөрөө бэлдээрэй.",
            }
          : {
              tone: "bg-success/10 text-success",
              icon: CalendarCheck,
              title: `${left} хоног үлдсэн`,
              hint: "Бүх зүйл хэвийн. Хичээлдээ анхаараарай!",
            };
  const Icon = view.icon;

  return (
    <section aria-labelledby="paid-until-title" className="overflow-hidden chunky">
      <div className={`flex items-center gap-4 p-5 ${view.tone}`}>
        <span className={`flex shrink-0 items-center justify-center rounded-2xl bg-panel/70 ${compact ? "h-12 w-12" : "h-16 w-16"}`}>
          <Icon className={compact ? "h-7 w-7" : "h-9 w-9"} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="paid-until-title" className="text-sm font-semibold text-ink-dim">
            Хэдий хүртэл төлсөн
          </h2>
          <p className={`font-display font-bold ${compact ? "text-2xl" : "text-3xl"} leading-tight text-ink tabular-nums`}>
            {paidUntil ? dateLabel(paidUntil) : "—"}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{view.title}</p>
        </div>
      </div>
      <p className="px-5 py-3 text-sm text-ink-dim">{view.hint}</p>
    </section>
  );
}

