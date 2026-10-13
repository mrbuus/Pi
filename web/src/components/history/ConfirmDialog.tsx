"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/kit/button";
import HistoryDialog from "./HistoryDialog";

/** Батлах цонх — «Хадгалаагүй өөрчлөлт байна», «N-р хувилбар руу буцаах уу?» гэх мэт. */
export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Болих",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <HistoryDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) onCancel();
      }}
      title={title}
      description={description}
      role="alertdialog"
      footer={
        <>
          <Button variant="ghost" type="button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "default"} type="button" disabled={busy} onClick={onConfirm}>
            {busy ? "Түр хүлээнэ үү" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </HistoryDialog>
  );
}
