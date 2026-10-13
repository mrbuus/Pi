"use client";

import { MetaTitle } from "@/components/ui/Meta";
import type { RestoreResult } from "@/lib/revisions";
import HistoryDialog from "./HistoryDialog";
import HistoryPanel from "./HistoryPanel";

/** Тестийн «⋯ → Өөрчлөлтийн түүх» (тест засах хуудсанд ч). */
export default function TestHistoryDialog({
  testId,
  title,
  open,
  onOpenChange,
  dirty = false,
  onRestored,
}: {
  testId: string;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dirty?: boolean;
  onRestored?: (result: RestoreResult) => void;
}) {
  return (
    <HistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Өөрчлөлтийн түүх"
      description={title ? <MetaTitle>{title}</MetaTitle> : undefined}
      wide
    >
      {open && <HistoryPanel entity="TEST" id={testId} dirty={dirty} onRestored={onRestored} />}
    </HistoryDialog>
  );
}
