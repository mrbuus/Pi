import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "../world";
import { ROLE } from "./parts";
import type { TeacherLoad } from "./util";

const ORDER = ["TEACHER_PLUS", "TEACHER"] as const;

/**
 * Тухайн өдөр ажиллах багш нар: Багш+ ба Багш тусдаа өнгөт блокоор, өдөрт хэдэн хичээлтэйг харуулна.
 * Бодит: teachersOnDate = тэр өдрийн LessonStaffing-ээс (ахлах + туслах) гарсан өвөрмөц багш нар.
 */
export default function TeacherPanel({ loads, className }: { loads: TeacherLoad[]; className?: string }) {
  return (
    <section aria-labelledby="sch-teachers" className={cn("rounded-xl border border-line bg-surface", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <h2 id="sch-teachers" className="text-sm font-bold text-ink">
          Ажиллах багш нар
        </h2>
        <span className="rounded-full bg-ink/8 px-2 py-0.5 text-xs font-bold tabular-nums text-ink-dim">{loads.length}</span>
      </header>

      {loads.length === 0 ? (
        <p className="px-3 py-4 text-sm text-ink-dim">Энэ өдөр ажиллах багш алга</p>
      ) : (
        <div className="space-y-3 p-2">
          {ORDER.map((role) => {
            const group = loads.filter((l) => l.teacher.role === role);
            if (!group.length) return null;
            const { label, icon: Icon, solid, tint } = ROLE[role];
            return (
              <div key={role}>
                <p className={cn("mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold", solid)}>
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                  <span className="ml-auto tabular-nums opacity-90">{group.length}</span>
                </p>
                <ul>
                  {group.map(({ teacher, lead, assistant, clash }) => (
                    <li key={teacher.id} className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5">
                      <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", tint)}>
                        {initials(teacher.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{teacher.name}</span>
                        <span className="block truncate text-xs text-ink-dim">
                          {[lead ? `ахлах ${lead}` : "", assistant ? `туслах ${assistant}` : ""].filter(Boolean).join(", ")}
                        </span>
                      </span>
                      {clash && (
                        <span title="Нэгэн зэрэг хоёр ангид хичээлтэй" className="inline-flex shrink-0 text-warning">
                          <TriangleAlert className="size-4" aria-hidden />
                          <span className="sr-only">Нэгэн зэрэг хоёр ангид хичээлтэй</span>
                        </span>
                      )}
                      <span className="shrink-0 text-right text-sm font-bold tabular-nums text-ink">
                        {lead + assistant}
                        <span className="ml-1 text-xs font-medium text-ink-dim">хичээл</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
