"use client";

import { Camera, CircleCheck, CircleDashed, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import PhotoPages from "@/components/student-hub/PhotoPages";
import { sentTime } from "@/components/student-hub/PhotoSetSender";
import { Meta } from "@/components/ui/Meta";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Day {
  date: string;
  classroomName: string;
  upcoming: boolean;
  uploader: { name: string } | null;
  photos: { id: string; uploaderName: string; isAssigned: boolean; imageKeys: string[]; pages: number; createdAt: string }[];
}

/**
 * Онолын зураг — багшид (эзэн 2026-11-03): тухайн өдрийн хичээлд хэн томилогдсон, хэн хэзээ
 * илгээсэн, илгээсэн зургууд нь нэмэлт дарахгүйгээр харагдана. Эрх байхгүй (өөр ангийн) багшид
 * юу ч харуулахгүй. Хаалттай үед зөвхөн нэг мөр (хэн, илгээсэн эсэх).
 */
export default function TheoryPhotosStaff({
  classroomId,
  date,
  defaultOpen = false,
  className,
}: {
  classroomId: string;
  date: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [day, setDay] = useState<Day | null>(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    let alive = true;
    api<Day>(`/lesson-day/${encodeURIComponent(classroomId)}/${date}/photos`)
      .then((d) => {
        if (!alive) return;
        setDay(d);
        setError(false);
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) setHidden(true);
        else setError(true);
      });
    return () => {
      alive = false;
    };
  }, [classroomId, date]);

  if (hidden) return null;
  if (error) return <p className={cn("text-xs text-ink-dim", className)}>Онолын зургийг ачаалж чадсангүй</p>;
  if (!day) return <div aria-busy className={cn("h-12 animate-pulse rounded-xl bg-ink/[0.05] motion-reduce:animate-none", className)} />;

  const sent = day.photos.length;
  const assigned = day.uploader?.name ?? null;
  // Томилогдсон сурагч илгээсэн эсэх (нэрээр; сервер багшид studentId-г ч өгдөг ч нэр хангалттай)
  const assignedSent = day.photos.some((p) => p.isAssigned);
  if (!sent && !assigned) return null;

  const status = day.upcoming
    ? { icon: CircleDashed, text: "Хичээл болоогүй", tone: "text-ink-dim" }
    : sent
      ? { icon: CircleCheck, text: assignedSent || !assigned ? "Илгээсэн" : "Илгээсэн, томилогдсон сурагч биш", tone: "text-success" }
      : { icon: CircleDashed, text: "Илгээгээгүй", tone: "text-warning" };
  const Icon = status.icon;

  return (
    <section aria-label="Онолын зураг" className={cn("rounded-xl border border-line bg-surface", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-brand">
          <Camera className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">Онолын зураг</span>
          <span className="block truncate text-xs text-ink-dim">
            <Meta items={[assigned ? `Томилогдсон: ${assigned}` : "Томилоогүй", sent ? `${sent} багц` : null]} />
          </span>
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", status.tone)}>
          <Icon className="size-4" aria-hidden />
          {status.text}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3">
          {sent === 0 ? (
            <p className="text-sm text-ink-dim">Одоогоор онолын зураг илгээгээгүй байна</p>
          ) : (
            <ul className="space-y-3" aria-label="Илгээсэн зургууд">
              {[...day.photos]
                .sort((a, b) => Number(b.isAssigned) - Number(a.isAssigned) || a.createdAt.localeCompare(b.createdAt))
                .map((p) => (
                  <li key={p.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-bold text-ink">{p.uploaderName}</span>
                      {p.isAssigned && (
                        <span className="rounded-md bg-brand-bright/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand-soft">Томилогдсон</span>
                      )}
                      <Meta className="tabular-nums text-ink-dim" items={[sentTime(p.createdAt), `${p.pages} хуудас`]} />
                    </div>
                    <PhotoPages keys={p.imageKeys} pages={p.pages} title={`${p.uploaderName} — онолын зураг`} subtitle={day.classroomName} autoLoad />
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
