"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { HwSentIcon } from "@/components/attendance/marks";
import { dayLabel } from "@/components/makeup/types";
import { todayKeyUB } from "@/components/homework-practice/lib";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import PhotoSetSender from "./PhotoSetSender";
import { HOMEWORK_MAX_PAGES, type HomeworkPhoto } from "./photo-types";

/**
 * Гэрийн даалгаврын дэвтрийн зураг — тухайн хичээлийн өдөрт миний илгээсэн (≤6 хуудас,
 * 7 хоног хадгална). Илгээх, харах, дахин илгээх, устгах. Сервер `canSend`-ийг
 * дахин шалгана (POST /homework/photos, DELETE /homework/photos/:id).
 */
export default function HomeworkPhotoPanel({
  classroomId,
  date,
  photo,
  canSend,
  onChange,
  expanded,
}: {
  classroomId: string;
  date: string;
  photo: HomeworkPhoto | null;
  canSend: boolean;
  onChange?: (photo: HomeworkPhoto | null) => void;
  /** Илгээгээгүй үед сонгох хэсгийг шууд нээх (өгөгдмөл: зөвхөн өнөөдрийн өдөрт) */
  expanded?: boolean;
}) {
  const [current, setCurrent] = useState(photo);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- эцгийн шинэ утгыг дагана
    setCurrent(photo);
  }, [photo]);

  function update(next: HomeworkPhoto | null) {
    setCurrent(next);
    onChange?.(next);
  }

  async function save(keys: string[], pages: number) {
    const next = await api<HomeworkPhoto>("/homework/photos", {
      method: "POST",
      body: { classroomId, date, fileKey: keys[0], pages },
    });
    update(next);
  }

  async function remove() {
    if (!current) return;
    await api(`/homework/photos/${encodeURIComponent(current.id)}`, { method: "DELETE" });
    update(null);
  }

  const sent = !!current;
  const open = expanded ?? date === todayKeyUB();

  return (
    <section
      aria-label="Дэвтрийн зураг"
      className={cn(
        "rounded-xl border p-3 sm:p-4",
        sent ? "border-success/35 bg-success/5" : canSend ? "border-brand-bright/40 bg-brand-bright/5" : "border-line bg-panel",
      )}
    >
      {!sent && (
        <div className="mb-3 flex items-center gap-2">
          <HwSentIcon className="size-5 shrink-0 text-brand-soft" />
          <h3 className="font-bold text-ink">Дэвтрийн зураг</h3>
          <span className="ml-auto text-xs tabular-nums text-ink-dim">{HOMEWORK_MAX_PAGES} хүртэл хуудас</span>
        </div>
      )}
      <PhotoSetSender
        sent={current ? { keys: [current.fileKey], pages: current.pages, at: current.uploadedAt } : null}
        canEdit={canSend}
        onSave={save}
        onDelete={remove}
        purpose="homework"
        maxPages={HOMEWORK_MAX_PAGES}
        crop
        fileName={`daalgavar-${date}.pdf`}
        viewerTitle="Дэвтрийн зураг"
        viewerSubtitle={dayLabel(date)}
        collapsed={!open}
      />
      {!sent && !canSend && (
        <p className="flex items-center gap-1.5 text-sm text-ink-dim">
          <Clock className="size-4 shrink-0" aria-hidden />
          Илгээх хугацаа дууссан
        </p>
      )}
      {sent && <p className="mt-2 text-xs text-ink-dim">7 хоног хадгална</p>}
    </section>
  );
}
