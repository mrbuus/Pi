"use client";

import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { useOpenMakeups } from "./MakeupNavBadge";
import { dayLabel } from "./types";

/**
 * Сурагчийн хуудасны хамгийн дээр (эзэн 2026-11-03): багш хичээлийг баталсны дараа ирээгүй/чөлөөтэй/хоцорсон
 * хичээл АВТОМАТААР «нөхөх»-өөр гарна — багш «заавал нөх» гэж оруулахгүй. Нөхөх зүйл байхгүй бол харагдахгүй.
 */
export default function MakeupBanner() {
  const items = useOpenMakeups();
  if (!items.length) return null;
  const shown = items.slice(0, 2);
  return (
    <Link
      href="/app/my-class?tab=makeup"
      className="mb-4 flex min-h-14 items-center gap-3 rounded-xl border border-brand-bright/50 bg-brand-bright/10 px-4 py-3 transition hover:bg-brand-bright/15 focus-visible:ring-2 focus-visible:ring-brand-bright"
    >
      <ListChecks className="size-5 shrink-0 text-brand-soft" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">Ирээгүй хичээлээ нөхөх</span>
        <Meta
          className="mt-0.5 text-sm text-ink-dim"
          items={[
            ...shown.map((i) => `${dayLabel(i.date, false)} ${i.classroomName}`),
            items.length > shown.length ? `дахин ${items.length - shown.length}` : null,
          ]}
        />
      </span>
      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-error px-2 text-xs font-bold leading-6 tabular-nums text-on-error">
        {items.length}
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
    </Link>
  );
}
