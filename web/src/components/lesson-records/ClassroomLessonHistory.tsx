"use client";

import { History } from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { formatMinutes } from "@/components/schedule/types";
import type { LessonRecord } from "./types";

/** Ангийн батлагдсан хичээлийн түүх — ажилтанд (Багш, Багш+, Админ). */
export default function ClassroomLessonHistory({
  classroom,
  onClose,
}: {
  classroom: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const { data, status, error, reload } = useSection<LessonRecord[]>(
    classroom ? `/lesson-records/classroom/${classroom.id}` : null,
    [],
  );

  return (
    <Drawer open={classroom !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <History className="h-5 w-5 text-brand-soft" aria-hidden />
          <DrawerTitle className="font-bold text-brand-soft">
            {classroom?.name.replace(/\s*\([^)]*\)$/, "")} — хийсэн хичээлүүд
          </DrawerTitle>
        </div>
        <div className="overflow-y-auto px-4 pb-6">
          {status === "loading" && <LoadingState rows={4} />}
          {status === "error" && <ErrorState message={error} onRetry={reload} />}
          {status === "ready" && data.length === 0 && (
            <EmptyState icon={History} title="Батлагдсан хичээл алга" hint="Өдрийн хуваарийн мөр дээр «Батлах» дарахад энд нэмэгдэнэ." />
          )}
          {status === "ready" && data.length > 0 && (
            <ul className="divide-y divide-line/60 rounded-xl border border-line">
              {data.map((r) => (
                <li key={r.id} className="grid grid-cols-[3.5rem_1fr] gap-x-3 px-3 py-2.5 text-sm">
                  <span className="font-mono text-xs font-bold text-brand-soft">
                    {r.date.slice(5).replace("-", ".")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{r.topic ?? <span className="italic text-ink-dim">Сэдэвгүй</span>}</p>
                    <p className="mt-0.5 text-xs text-ink-dim">
                      <Meta
                        items={[
                          `${formatMinutes(r.startMinute)}–${formatMinutes(r.endMinute)}`,
                          r.leadTeacherName,
                          r.assistantTeacherName,
                          `Тест ${r.testCount}`,
                          r.attendanceMarked > 0 ? `Ирсэн ${r.presentCount}/${r.enrolledCount}` : `${r.enrolledCount} сурагч`,
                        ]}
                      />
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
