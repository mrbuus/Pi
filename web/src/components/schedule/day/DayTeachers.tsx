"use client";

import { ChevronDown, GraduationCap, Star, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface TeacherLoad {
  id: string;
  name: string;
  plus: boolean;
  lead: number;
  assistant: number;
  clash: boolean;
}

const GROUPS = [
  { plus: true, label: "Багш+", icon: Star, solid: "bg-brand-bright text-on-brand", tint: "bg-brand-bright/15 text-brand-soft" },
  { plus: false, label: "Багш", icon: GraduationCap, solid: "bg-accent-teal text-on-teal", tint: "bg-accent-teal/15 text-accent-teal" },
] as const;

function initials(name: string) {
  const parts = name.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  return (parts.at(-1)?.[0] ?? "").toUpperCase() + (parts.length > 1 ? (parts[0][0] ?? "").toUpperCase() : "");
}

/**
 * «Ажиллах багш нар»: «Багшийн ажлын өдөр» хүснэгтээр (сондгой/тэгш 7 хоног,
 * онцгой өдөр, хүчинтэй хугацаа — server resolveTeacherRoster) тухайн өдөр ажиллах
 * багш, хэн хэдэн хичээлд орох. Хүснэгтэд ороогүй ч оноогдсон багш тусдаа.
 * Багш+ чип дарж «сонгоод» хоосон Ахлах/Туслах нүдэнд нэг товшилтоор ононо.
 */
export default function DayTeachers({
  loads,
  extra,
  inRange,
  armedId,
  onArm,
  className,
}: {
  /** «Багшийн ажлын өдөр» хүснэгтээр тухайн өдөр ажиллах багш */
  loads: TeacherLoad[];
  /** Хүснэгтэд ороогүй ч энэ өдөр оноогдсон */
  extra: TeacherLoad[];
  inRange: boolean;
  armedId: string | null;
  onArm: ((id: string | null) => void) | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const busy = loads.length;
  const armed = [...loads, ...extra].find((l) => l.id === armedId) ?? null;
  const groups = [
    ...GROUPS.map((g) => ({ ...g, list: loads.filter((l) => l.plus === g.plus) })),
    { ...GROUPS[1], label: "Хүснэгтэд ороогүй ч оноогдсон", plus: false, list: extra, solid: "bg-ink/8 text-ink-dim" },
  ];
  return (
    <section aria-labelledby="day-teachers" className={cn("rounded-xl border border-line bg-surface", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="day-teachers-body"
        className="flex min-h-11 w-full items-center gap-2 border-line px-3 py-2 text-left lg:pointer-events-none lg:border-b"
      >
        <h2 id="day-teachers" className="text-sm font-bold text-ink">
          Ажиллах багш нар
        </h2>
        <span className="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-bold tabular-nums text-ink-dim">{busy}</span>
        <ChevronDown className={cn("ml-auto size-4 text-ink-dim transition lg:hidden", open && "rotate-180")} aria-hidden />
      </button>
      <div id="day-teachers-body" className={cn("space-y-3 p-2", !open && "hidden lg:block")}>
        {armed && onArm && (
          <p className="flex items-center gap-1.5 rounded-lg bg-info/10 px-2 py-1 text-xs text-info">
            <span className="min-w-0 flex-1">
              <b>{armed.name}</b> — хоосон нүдэнд дарж оноо
            </span>
            <button
              type="button"
              onClick={() => onArm(null)}
              aria-label="Сонголт цуцлах"
              className="inline-flex size-9 items-center justify-center rounded-md hover:bg-info/10"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </p>
        )}
        {!inRange && (
          <p className="rounded-lg bg-warning/10 px-2 py-1.5 text-xs font-semibold text-warning">Ажлын хүснэгтийн хугацаа энэ өдрийг хамрахгүй</p>
        )}
        {loads.length === 0 && <p className="px-1 py-2 text-sm text-ink-dim">Ажлын хүснэгтэд энэ өдөр багш алга</p>}
        {groups.map((g) => {
          const group = g.list;
          if (!group.length) return null;
          return (
            <div key={g.label}>
              <p className={cn("mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold", g.solid)}>
                <g.icon className="size-3.5" aria-hidden />
                {g.label}
                <span className="ml-auto tabular-nums opacity-90">{group.length}</span>
              </p>
              <ul>
                {group.map((l) => {
                  const total = l.lead + l.assistant;
                  const detail = [l.lead ? `ахлах ${l.lead}` : "", l.assistant ? `туслах ${l.assistant}` : ""].filter(Boolean).join(", ");
                  const body = (
                    <>
                      <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", g.tint)}>
                        {initials(l.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{l.name}</span>
                        {detail && <span className="block truncate text-xs text-ink-dim">{detail}</span>}
                      </span>
                      {l.clash && (
                        <span title="Нэгэн зэрэг хоёр ангид хичээлтэй" className="inline-flex shrink-0 text-warning">
                          <TriangleAlert className="size-4" aria-hidden />
                          <span className="sr-only">Нэгэн зэрэг хоёр ангид хичээлтэй</span>
                        </span>
                      )}
                      <span className={cn("shrink-0 text-right text-sm font-bold tabular-nums", total ? "text-ink" : "text-ink-dim")}>
                        {total}
                        <span className="ml-1 text-xs font-medium text-ink-dim">хичээл</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {onArm ? (
                        <button
                          type="button"
                          aria-pressed={armedId === l.id}
                          onClick={() => onArm(armedId === l.id ? null : l.id)}
                          className={cn(
                            "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-ink/[0.03]",
                            armedId === l.id && "ring-2 ring-brand-bright",
                          )}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
