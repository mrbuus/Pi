"use client";

import { BadgeCheck, Send } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { WarnBadge } from "./parts";

interface Props {
  /** «Ням, 10-р сарын 18» маягийн маргаашийн огноо */
  dateLabel: string;
  lessons: number;
  teachers: number;
  students: number;
  /** Давчуу танхимын тоо ба нэгэн зэрэг хоёр ангид орсон багшийн тоо */
  overCount: number;
  clashCount: number;
  /** Нийтэлсэн бол цаг ба хүлээн авагчийн тоо (бодит PublishDayButton-тэй адил) */
  published: { at: string; recipients: number } | null;
  onPublish: () => void;
}

/**
 * «Нийтлэх» товч + баталгаажуулах popover. Демо: зөвхөн мэдэгдэл (toast) гарна.
 * Бодит: Teacher+ орой маргаашийн хуваарийг нийтэлнэ, багш болон сурагчдад push/SMS очно.
 */
export default function PublishButton({ dateLabel, lessons, teachers, students, overCount, clashCount, published, onPublish }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    confirm.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      } else if (e.key === "Tab") {
        // Фокус popover-оос гарахгүй: товчнуудын хооронд эргэлдэнэ
        const items = root.current?.querySelectorAll<HTMLElement>('[data-pop] button, [data-pop] a[href]');
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const send = () => {
    setOpen(false);
    onPublish();
    trigger.current?.focus();
  };

  return (
    <div ref={root} className="relative">
      <Button
        ref={trigger}
        variant={published ? "secondary" : "default"}
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 rounded-xl px-3.5 sm:min-h-9"
      >
        {published ? <BadgeCheck aria-hidden /> : <Send aria-hidden />}
        {published ? "Нийтэлсэн" : "Нийтлэх"}
      </Button>

      {open && (
        <div
          id={panelId}
          data-pop
          role="dialog"
          aria-labelledby={titleId}
          className="elev-3 absolute right-0 top-full z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-line bg-surface p-4"
        >
          <div className="space-y-1">
            <h2 id={titleId} className="text-base font-bold text-ink">
              Хуваарь нийтлэх
            </h2>
            <p className="text-sm text-ink">Маргаашийн хуваарийг багш, сурагчдад мэдэгдэх</p>
            {published && (
              <p className="flex items-center gap-1.5 pt-0.5 text-xs font-semibold text-success">
                <BadgeCheck className="size-3.5" aria-hidden />
                Нийтэлсэн {published.at} — {published.recipients} хүнд очсон
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-xl bg-bg px-3 py-2.5 text-sm">
            <p className="font-semibold text-ink">{dateLabel}</p>
            <p className="text-ink-dim">
              <Meta items={[`${lessons} хичээл`, `${teachers} багш`, `${students} сурагч`]} />
            </p>
            {(overCount > 0 || clashCount > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {overCount > 0 && <WarnBadge>{overCount} танхим давчуу</WarnBadge>}
                {clashCount > 0 && <WarnBadge>{clashCount} багш давхцсан</WarnBadge>}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 sm:min-h-9">
              Болих
            </Button>
            <Button ref={confirm} size="sm" onClick={send} className="min-h-11 rounded-lg px-3.5 sm:min-h-9">
              <Send aria-hidden />
              {published ? "Өөрчлөлт илгээх" : "Нийтлэх"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
