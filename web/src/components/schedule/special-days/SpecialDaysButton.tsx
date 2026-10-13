"use client";

import { useState } from "react";
import { CalendarOff } from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import CalendarAdmin from "../CalendarAdmin";
import { todayUBKey } from "../types";
import type { SpecialDay } from "./helpers";
import SpecialDaysDialog from "./SpecialDaysDialog";

/**
 * Хуваарийн булан дахь жижиг «Онцгой өдөр» товч. Жилд 1-2 удаа хэрэглэдэг
 * тул бүтэн таб биш; дарахад жагсаалт + нэмэх маягттай цонх нээгдэнэ.
 * Удахгүй болох онцгой өдрийн тоог тэмдэглэнэ.
 */
export default function SpecialDaysButton({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const today = todayUBKey();
  const { data, reload } = useSection<SpecialDay[]>(
    `/calendar?from=${today}`,
    [],
  );
  const count = data.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand"
      >
        <CalendarOff className="h-4 w-4" aria-hidden />
        Онцгой өдөр
        {count > 0 && (
          <span
            className="rounded-full bg-warning/20 px-1.5 text-xs font-bold text-warning"
            aria-label={`${count} удахгүй болно`}
          >
            {count}
          </span>
        )}
      </button>
      {open && (
        <SpecialDaysDialog title="Онцгой өдөр" onClose={() => setOpen(false)}>
          <CalendarAdmin canEdit={canEdit} onChanged={reload} />
        </SpecialDaysDialog>
      )}
    </>
  );
}
