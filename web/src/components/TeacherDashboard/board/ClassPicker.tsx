"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Users } from "lucide-react";
import { Dot } from "@/components/ui/Meta";
import { hm, type DayClass } from "./lib";

/**
 * Ангийн сонголт (D9): ЗӨВХӨН сонгосон өдөр хичээлтэй ангиуд, цагаар нь эрэмбэлсэн.
 * Ангийн нэр ба сурагчийн тоо үргэлж харагдана.
 */
export default function ClassPicker({
  classes,
  value,
  current,
  onChange,
  loading,
}: {
  classes: DayClass[];
  value: string | null;
  /** Сонгосон анги энэ өдөр хичээлгүй байж болно — нэр, тоог нь тусад нь */
  current: { name: string; studentCount: number | null } | null;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const label = current
    ? `Анги сонгох, одоо ${current.name}${current.studentCount !== null ? `, ${current.studentCount} сурагч` : ""}`
    : "Анги сонгох";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={loading && !current}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-2 text-sm transition-colors hover:bg-ink/5 disabled:opacity-60"
        >
          <Users className="size-4 shrink-0 text-brand" aria-hidden />
          <span className="truncate font-bold text-ink">{current?.name ?? (loading ? "Ачаалж байна" : "Анги сонгох")}</span>
          {current?.studentCount != null && (
            <>
              <Dot />
              <span className="shrink-0 whitespace-nowrap text-ink-dim">{current.studentCount} сурагч</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-ink-dim" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="elev-3 z-50 max-h-[min(70dvh,var(--radix-dropdown-menu-content-available-height))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-ink"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-dim">Энэ өдөр хичээлтэй</DropdownMenu.Label>
          {classes.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-dim">Энэ өдөр танд хичээлтэй анги алга</p>
          ) : (
            <DropdownMenu.RadioGroup value={value ?? ""} onValueChange={onChange}>
              {classes.map((c) => (
                <DropdownMenu.RadioItem
                  key={c.id}
                  value={c.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1 data-[highlighted]:bg-ink/5 sm:min-h-9"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block text-xs tabular-nums text-ink-dim">
                      {c.lessons.map((l) => `${hm(l.startMinute)}–${hm(l.endMinute)}`).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-dim">{c.studentCount} сурагч</span>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <DropdownMenu.ItemIndicator>
                      <Check className="size-4 text-brand" aria-hidden />
                    </DropdownMenu.ItemIndicator>
                  </span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
