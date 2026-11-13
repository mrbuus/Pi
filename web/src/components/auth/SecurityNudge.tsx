"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import GoogleMark from "@/components/auth/GoogleMark";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { api, setAuth } from "@/lib/api";
import { isPasswordStrong } from "@/lib/passwordPolicy";
import {
  clearSecurityNudge,
  loginPassword,
  readSecurityNudge,
  type SecurityNudge as Nudge,
} from "@/lib/securityNudge";

type Step = "password" | "google" | "done";

/* Нэвтэрсний дараа нууц үг нь утасны дугаар хэвээр хэрэглэгчид зөөлөн сануулга
   (эзэн 2026-11-14): 1) шинэ нууц үг, 2) Gmail холбох. Хүчлэхгүй — алхам бүр
   «Дараа» товчтой, хаавал энэ нэвтрэлтэд дахин гарахгүй. Сервер анхны
   нэвтрэлтэд биш, дараагийнх бүрт `securityNudge` өгдөг (auth.service.ts). */
export default function SecurityNudge() {
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [step, setStep] = useState<Step>("password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [askCurrent, setAskCurrent] = useState(false);

  useEffect(() => {
    const n = readSecurityNudge();
    if (!n?.passwordIsPhone) return;
    // Хуудас дахин ачаалсан бол нэвтрэхэд бичсэн нууц үг санах ойд алга — асууна
    queueMicrotask(() => {
      setAskCurrent(!loginPassword());
      setNudge(n);
    });
  }, []);

  function close() {
    clearSecurityNudge();
    setNudge(null);
  }

  async function goGoogleOrFinish() {
    if (nudge?.googleLinked) return setStep("done");
    try {
      const s = await api<{ enabled: boolean; linked: boolean }>("/auth/google/status");
      setStep(s.enabled && !s.linked ? "google" : "done");
    } catch {
      setStep("done");
    }
  }

  const canSave = isPasswordStrong(next) && next === confirm && (!askCurrent || !!current);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ accessToken?: string; role?: string }>("/auth/change-password", {
        method: "POST",
        body: { currentPassword: askCurrent ? current : (loginPassword() ?? ""), newPassword: next },
      });
      // Сервер бусад сессийг таслана — энэ табын токеныг шинээр хадгална
      if (res.accessToken && res.role) setAuth(res.accessToken, res.role);
      clearSecurityNudge();
      await goGoogleOrFinish();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      // Санах ойн нууц үг таарахгүй бол (өөр төхөөрөмж дээр сольсон г.м.) асууна
      if (!askCurrent && /Одоогийн/.test(msg)) setAskCurrent(true);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function linkGoogle() {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/auth/google/link", { method: "POST" });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
      setBusy(false);
    }
  }

  if (!nudge) return null;

  const input =
    "w-full rounded-xl border border-line bg-bg px-4 py-3 text-base text-ink transition focus:border-brand";

  return (
    <Drawer open onOpenChange={(open) => !open && close()}>
      <DrawerContent className="mx-auto w-full max-w-md">
        <div className="overflow-y-auto px-5 pb-6 pt-3">
          {step === "password" && (
            <form onSubmit={save} noValidate>
              <DrawerTitle className="cyrillic-heading flex items-center gap-2 text-lg font-bold text-ink">
                <KeyRound aria-hidden className="h-5 w-5 text-brand" />
                Нууц үгээ шинэчилье
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-ink-dim">
                Таны нууц үг одоо утасны дугаартай ижил байна. Өөрийн гэсэн нууц үг тавьбал
                бүртгэл тань илүү найдвартай болно
              </DrawerDescription>

              <div className="mt-4 space-y-3">
                {askCurrent && (
                  <div>
                    <label htmlFor="nudge-current" className="mb-1 block text-sm font-medium text-ink">
                      Одоогийн нууц үг (утасны дугаар)
                    </label>
                    <input
                      id="nudge-current"
                      type={show ? "text" : "password"}
                      inputMode="numeric"
                      autoComplete="current-password"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      className={input}
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="nudge-new" className="mb-1 block text-sm font-medium text-ink">
                    Шинэ нууц үг
                  </label>
                  <div className="relative">
                    <input
                      id="nudge-new"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={next}
                      onChange={(e) => {
                        setNext(e.target.value);
                        setError("");
                      }}
                      aria-describedby="nudge-rules"
                      className={`${input} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? "Нууц үгийг нуух" : "Нууц үгийг харах"}
                      aria-pressed={show}
                      className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-ink-dim transition hover:text-ink"
                    >
                      {show ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
                    </button>
                  </div>
                  <PasswordChecklist id="nudge-rules" value={next} />
                </div>
                <div>
                  <label htmlFor="nudge-confirm" className="mb-1 block text-sm font-medium text-ink">
                    Дахин бичих
                  </label>
                  <input
                    id="nudge-confirm"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    aria-invalid={!!confirm && confirm !== next}
                    className={input}
                  />
                  {confirm && confirm !== next && (
                    <p className="mt-1 text-xs text-error">Шинэ нууц үгтэйгээ таарахгүй байна</p>
                  )}
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Дараа
                </Button>
                <Button type="submit" disabled={!canSave || busy}>
                  {busy ? "Хадгалж байна…" : "Хадгалах"}
                </Button>
              </div>
            </form>
          )}

          {step === "google" && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <Check aria-hidden className="h-4 w-4" />
                Нууц үг шинэчлэгдлээ
              </p>
              <DrawerTitle className="cyrillic-heading mt-3 flex items-center gap-2 text-lg font-bold text-ink">
                <GoogleMark />
                Gmail-ээ холбох уу?
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-ink-dim">
                Холбочихвол нууц үгээ мартсан ч Gmail-ээрээ нэг товчоор нэвтэрнэ
              </DrawerDescription>
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Дараа
                </Button>
                <Button type="button" onClick={linkGoogle} disabled={busy}>
                  {busy ? "Шилжиж байна…" : "Gmail холбох"}
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div>
              <DrawerTitle className="cyrillic-heading flex items-center gap-2 text-lg font-bold text-ink">
                <Check aria-hidden className="h-5 w-5 text-success" />
                Нууц үг шинэчлэгдлээ
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-ink-dim">
                Дараагийн удаа шинэ нууц үгээрээ нэвтэрнэ
              </DrawerDescription>
              <Button type="button" className="mt-5 w-full" onClick={close}>
                Ойлголоо
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
