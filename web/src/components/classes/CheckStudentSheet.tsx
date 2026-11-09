"use client";

import { useEffect, useState } from "react";
import { Link2, Phone, StickyNote } from "lucide-react";
import CopyButton from "@/components/payments/CopyButton";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import type { CheckPerson, CheckStudentContact, CheckStudentInfo } from "./types";

const KIND_LABEL: Record<CheckStudentContact["kind"], string> = {
  student: "Сурагч",
  father: "Аав",
  mother: "Ээж",
  parent: "Эцэг эх",
};

const KIND_OF: Record<CheckStudentContact["kind"], string> = {
  student: "Сурагчийн",
  father: "Аавын",
  mother: "Ээжийн",
  parent: "Эцэг эхийн",
};

/** tel: холбоост зөвхөн цифр ба «+» */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/**
 * Чекийн жагсаалтаас хүүхдийн нэр дарахад доороос гарах товч мэдээлэл
 * (эзэн 2026-11-10): нэр, код, анги, утаснууд (дарж залгах, хуулах), тэмдэглэл.
 * Төлбөрийн мэдээлэл энд БАЙХГҮЙ — Багш ч харна.
 */
export default function CheckStudentSheet({
  classroomId,
  student,
  open,
  onClose,
}: {
  classroomId: string;
  student: CheckPerson | null;
  open: boolean;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<CheckStudentInfo | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const studentId = student?.id ?? null;

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    const t = window.setTimeout(() => {
      setInfo(null);
      setError("");
      api<CheckStudentInfo>(
        `/classrooms/${encodeURIComponent(classroomId)}/checks/students/${encodeURIComponent(studentId)}`,
      )
        .then((r) => alive && setInfo(r))
        .catch((err) => alive && setError(err instanceof Error ? err.message : "Мэдээлэл ачаалж чадсангүй"));
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [classroomId, studentId, attempt]);

  const shown = info && info.id === studentId ? info : null;
  const fullName = shown ? `${shown.lastName} ${shown.firstName}` : student ? `${student.lastName} ${student.firstName}` : "";

  return (
    <Drawer open={open && !!student} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-md">
        <div className="overflow-y-auto px-4 pb-5 pt-3">
          <DrawerTitle className="cyrillic-heading break-words text-lg font-bold text-ink">{fullName}</DrawerTitle>
          <DrawerDescription asChild>
            <div className="mt-0.5 text-sm text-ink-dim">
              {shown ? (
                <Meta
                  items={[
                    shown.studentCode ? <span key="c" className="font-semibold tabular-nums text-ink">{shown.studentCode}</span> : "Кодгүй",
                    shown.classroomName,
                    shown.inClass ? null : <span key="l" className="font-semibold text-warning">Ангиас гарсан</span>,
                  ]}
                />
              ) : (
                <span>Сурагчийн товч мэдээлэл</span>
              )}
            </div>
          </DrawerDescription>

          <div className="mt-4">
            {error && !shown && <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
            {!shown && !error && (
              <div role="status" aria-label="Мэдээлэл ачаалж байна">
                <SkeletonRows rows={3} />
              </div>
            )}
            {shown && (
              <div className="space-y-4">
                {shown.contacts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-4 text-center text-sm text-ink-dim">Утасны дугаар бүртгэгдээгүй</p>
                ) : (
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {shown.contacts.map((c) => (
                      <li key={`${c.kind}:${c.phone}`} className="flex items-center gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ink-dim">
                            {KIND_LABEL[c.kind]}
                            {c.name ? <span className="font-normal">, {c.name}</span> : null}
                          </p>
                          <a
                            href={telHref(c.phone)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-base font-semibold tabular-nums text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            <Phone className="h-4 w-4 shrink-0" aria-hidden />
                            {c.phone}
                          </a>
                          {c.appLinked && (
                            <p className="flex items-center gap-1 text-xs text-ink-dim">
                              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> Аппад холбогдсон
                            </p>
                          )}
                        </div>
                        <CopyButton text={c.phone} label={`${KIND_OF[c.kind]} дугаар`} />
                      </li>
                    ))}
                  </ul>
                )}
                {shown.guardianNote && (
                  <div className="flex gap-2 rounded-xl bg-bg/60 px-3 py-2.5 text-sm text-ink">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                    <p className="min-w-0 whitespace-pre-line break-words">{shown.guardianNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
