"use client";

import { useEffect, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import {
  ROLE_LABEL,
  type DeletionRequest,
  type DeletionStatus,
} from "./types";

export type ReviewAction = "IN_REVIEW" | "RESOLVED" | "REJECTED";

const COPY: Record<
  ReviewAction,
  { title: string; confirm: string; variant: "default" | "danger" | "secondary" }
> = {
  IN_REVIEW: {
    title: "Хянаж эхлэх",
    confirm: "Хянаж эхлэх",
    variant: "secondary",
  },
  RESOLVED: {
    title: "Хүсэлтийг зөвшөөрөх",
    confirm: "Зөвшөөрөх",
    variant: "default",
  },
  REJECTED: {
    title: "Хүсэлтээс татгалзах",
    confirm: "Татгалзах",
    variant: "danger",
  },
};

function errText(e: unknown): string {
  return e instanceof Error && e.message
    ? e.message
    : "Хадгалж чадсангүй. Дахин оролдоно уу";
}

/**
 * Устгах хүсэлтийн шийдвэрийг баталгаажуулах цонх. Сервер зөвхөн төлөв ба
 * тэмдэглэлийг хадгална, хэрэглэгчийн өгөгдөл устахгүй. Бодит арга хэмжээг
 * (жишээ нь бүртгэлийг идэвхгүй болгох) бодлогын дагуу админ гараар хийнэ.
 */
export default function ReviewDialog({
  request,
  action,
  onClose,
  onSaved,
}: {
  request: DeletionRequest | null;
  action: ReviewAction | null;
  onClose: () => void;
  onSaved: (updated: { id: string; status: DeletionStatus }) => void;
}) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = request !== null && action !== null;

  useEffect(() => {
    if (open) {
      setNote(request?.reviewNote ?? "");
      setError(null);
      setSaving(false);
    }
  }, [open, request]);

  async function submit() {
    if (!request || !action) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/deletion-requests/${request.id}`, {
        method: "PATCH",
        body: { status: action, note: note.trim() || undefined },
      });
      onSaved({ id: request.id, status: action });
    } catch (e) {
      setError(errText(e));
      setSaving(false);
    }
  }

  const copy = action ? COPY[action] : null;
  const name = request ? `${request.user.firstName} ${request.user.lastName}` : "";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content className="elev-3 fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 outline-none md:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="cyrillic-heading text-lg font-bold text-ink">
                {copy?.title}
              </Dialog.Title>
              {request && (
                <Dialog.Description className="mt-0.5 text-sm text-ink-dim">
                  <Meta
                    items={[
                      name,
                      ROLE_LABEL[request.user.role] ?? request.user.role,
                    ]}
                  />
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Хаах"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-bright/60"
            >
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>

          {action === "RESOLVED" && (
            <div className="mb-4 flex gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-ink">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
              <span>
                Энэ нь хүсэлтийг боловсруулсан гэж тэмдэглэнэ, хэрэглэгчийн
                өгөгдөл устахгүй. Бодит арга хэмжээг (жишээ нь бүртгэлийг
                идэвхгүй болгох, архивлах) бодлогын дагуу «Сурагчид» хэсгээс
                гараар хийнэ
              </span>
            </div>
          )}

          <label htmlFor={noteId} className="mb-1 block text-sm font-semibold text-ink">
            Тэмдэглэл (заавал биш)
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-brand"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Болих
            </Button>
            <Button
              variant={copy?.variant ?? "default"}
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Хадгалж байна" : copy?.confirm}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
