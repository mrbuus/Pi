"use client";

import type { ReactNode } from "react";
import ExamDialog from "@/components/exams/ExamDialog";
import { useUnsavedGuard } from "@/hooks/useUndoable";
import { confirmDiscardUnsaved } from "@/lib/unsavedChanges";

/**
 * «⋯» тестийн цэсийн бүх цонхны НЭГ бүрхүүл.
 *
 * Доор нь «Шалгалт» хэсгийн ExamDialog (Radix Dialog): утсанд доороос гарах
 * хуудас, iPad/компьютерт голдоо цонх; role="dialog", aria-modal, фокус занга,
 * Escape/дэвсгэр дарж хаана (STATUS §6.9). Энд нэмэлтээр:
 *   - хадгалаагүй өөрчлөлттэй бол хаахаас өмнө асууна (хуудас солих үед ч)
 *   - хадгалж байх зуур санамсаргүй хаагдахгүй
 */
export default function ActionDialog({
  title,
  description,
  wide = false,
  dirty = false,
  busy = false,
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: ReactNode;
  wide?: boolean;
  dirty?: boolean;
  busy?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useUnsavedGuard(dirty, "test-menu");
  return (
    <ExamDialog
      open
      wide={wide}
      title={title}
      description={description}
      footer={footer}
      onOpenChange={(open) => {
        if (open || busy) return;
        if (dirty && !confirmDiscardUnsaved()) return;
        onClose();
      }}
    >
      {children}
    </ExamDialog>
  );
}
