"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import ConsentFields, {
  EMPTY_CONSENT,
  PRIVACY_VERSION,
  consentReady,
} from "./ConsentFields";
interface Status {
  needsConsent: boolean;
  privacyVersion: string | null;
  termsAcceptedAt: string | null;
  guardianConsentAt: string | null;
}
export default function ConsentPage() {
  const [status, setStatus] = useState<Status | null>(null),
    [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false),
    [value, setValue] = useState(EMPTY_CONSENT),
    [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    try {
      const result = await api<Status>("/consent/my");
      setFailed(false);
      setStatus(result);
      setOpen(result.needsConsent);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api<Status>("/consent/my").then(result => {
      if (active) { setStatus(result); setOpen(result.needsConsent); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open) dialog.current?.close();
  }, [open]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentReady(value) || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const saved = await api<Status>("/consent/my", {
        method: "POST",
        body: { ...value, privacyVersion: PRIVACY_VERSION },
      });
      setStatus(saved);
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="cyrillic-heading text-2xl font-bold text-ink">
        Миний зөвшөөрөл
      </h1>
      {!status && !failed && <LoadingState rows={4} />}
      {failed && !open && (
        <ErrorState
          message="Зөвшөөрлийн мэдээллийг авч чадсангүй"
          onRetry={() => void load()}
        />
      )}
      {status && !status.needsConsent && (
        <EmptyState
          title="Зөвшөөрөл бүртгэгдсэн"
          hint={`${status.privacyVersion} хувилбарт өгсөн зөвшөөрөл хадгалагдсан.`}
        />
      )}
      {status?.needsConsent && (
        <>
          <p className="text-ink-dim">
            Таны хуучин бүртгэлийг хаахгүй. Бодлогыг уншаад зөвшөөрлөө өгөх
            боломжтой.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-11 rounded-xl bg-brand px-4 text-on-brand"
          >
            Бодлого унших
          </button>
        </>
      )}
      <dialog
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
        aria-labelledby="consent-heading"
        className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl border border-line bg-panel p-5 text-ink backdrop:bg-ink/40"
      >
        <form onSubmit={submit} className="space-y-4">
          <h2 id="consent-heading" className="text-xl font-bold">
            Нөхцөлтэй танилцах
          </h2>
          <ConsentFields value={value} onChange={setValue} disabled={busy} />
          {failed && (
            <ErrorState message="Хадгалж чадсангүй. Дахин оролдоно уу." />
          )}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || !consentReady(value)}
              className="min-h-11 rounded-xl bg-brand px-4 text-on-brand disabled:opacity-50"
            >
              {busy ? "Хадгалж байна" : "Зөвшөөрч хадгалах"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-xl border border-line px-4"
            >
              Дараа унших
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
