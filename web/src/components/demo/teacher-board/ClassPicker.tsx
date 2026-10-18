"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Users } from "lucide-react";
import { Fragment } from "react";
import { Dot } from "@/components/ui/Meta";
import type { Branch, DemoClass } from "../world";

const BRANCHES: Branch[] = ["Баруун 4", "Зүүн 4"];

/** Ангийн сонголт: ангийн нэр ба сурагчийн тоо үргэлж харагдана; жагсаалт салбараар */
export default function ClassPicker({
  classes,
  value,
  onChange,
}: {
  classes: DemoClass[];
  value: string;
  onChange: (id: string) => void;
}) {
  const cur = classes.find((c) => c.id === value) ?? classes[0];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Анги сонгох, одоо ${cur.name}, ${cur.students.length} сурагч`}
          className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-2 text-sm transition-colors hover:bg-ink/5"
        >
          <Users className="size-4 shrink-0 text-brand" aria-hidden />
          <span className="truncate font-bold text-ink">{cur.name}</span>
          <Dot />
          <span className="shrink-0 whitespace-nowrap text-ink-dim">{cur.students.length} сурагч</span>
          <ChevronDown className="size-4 shrink-0 text-ink-dim" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="elev-3 z-50 max-h-[min(70dvh,var(--radix-dropdown-menu-content-available-height))] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-ink"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>
            {BRANCHES.map((b) => (
              <Fragment key={b}>
                <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-dim">{b}</DropdownMenu.Label>
                {classes
                  .filter((c) => c.branch === b)
                  .map((c) => (
                    <DropdownMenu.RadioItem
                      key={c.id}
                      value={c.id}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1 data-[highlighted]:bg-ink/5 sm:min-h-9"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.label}</span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-dim">{c.students.length} сурагч</span>
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <DropdownMenu.ItemIndicator>
                          <Check className="size-4 text-brand" aria-hidden />
                        </DropdownMenu.ItemIndicator>
                      </span>
                    </DropdownMenu.RadioItem>
                  ))}
              </Fragment>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
