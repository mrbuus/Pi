"use client";

import { Check, Copy, Landmark, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

/* ============================================================================
 * Багшийн цалингийн данс (эзэн 2026-11-08). Хүснэгтэд нэр дээр дарахад нээгдэнэ.
 * Бүх ажилтан харна. Засах: өөрийнхөө дансыг хүн бүр, бусдынхыг зөвхөн цаг
 * бөглөх эрхтэй хүн — сервер шийднэ (canEdit), энд зөвхөн товчийг нуух/харуулах.
 * ========================================================================== */

interface AccountResponse {
  teacherId: string;
  fullName: string;
  canEdit: boolean;
  isSelf: boolean;
  account: {
    bankName: string;
    accountNumber: string;
    holderName: string;
    updatedAt: string;
    updatedBy: string | null;
  } | null;
}

/** Монголын арилжааны банкууд — жагсаалтад байхгүй бол «Бусад банк» */
const BANKS = [
  "Хаан банк",
  "Голомт банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Хас банк",
  "Капитрон банк",
  "Ариг банк",
  "Богд банк",
  "Үндэсний хөрөнгө оруулалтын банк",
  "Тээвэр хөгжлийн банк",
  "М банк",
  "Чингис хаан банк",
  "Кредит банк",
];
const OTHER = "__other";

const field =
  "mt-1 block min-h-12 w-full rounded-xl border-2 border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand";

function errText(e: unknown) {
  return e instanceof Error ? e.message : "Алдаа гарлаа. Дахин оролдоно уу";
}

export default function AccountDrawer({
  teacherId,
  name,
  onClose,
  onSaved,
}: {
  teacherId: string | null;
  name: string;
  onClose: () => void;
  onSaved: (teacherId: string) => void;
}) {
  return (
    <Drawer open={!!teacherId} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-lg">
        {teacherId && <AccountBody key={teacherId} teacherId={teacherId} name={name} onSaved={onSaved} />}
      </DrawerContent>
    </Drawer>
  );
}

function AccountBody({
  teacherId,
  name,
  onSaved,
}: {
  teacherId: string;
  name: string;
  onSaved: (teacherId: string) => void;
}) {
  const [data, setData] = useState<AccountResponse | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api<AccountResponse>(`/teacher-hours/accounts/${encodeURIComponent(teacherId)}`)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setError("");
        // Данс байхгүй, өөрөө засах эрхтэй бол шууд маягт
        if (!r.account && r.canEdit) setEditing(true);
      })
      .catch((e) => alive && setError(errText(e)));
    return () => {
      alive = false;
    };
  }, [teacherId, tick]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Хуулж чадсангүй");
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-3">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-bright/15 text-brand-soft">
          <Landmark className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <DrawerTitle className="text-lg font-bold text-ink">{data?.fullName ?? name}</DrawerTitle>
          <DrawerDescription className="text-sm text-ink-dim">Цалингийн данс</DrawerDescription>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => setTick((t) => t + 1)} />}

      {!error && !data && (
        <div className="space-y-3" aria-busy="true">
          <SkeletonLine width="60%" height={20} />
          <SkeletonLine width="80%" height={28} />
          <SkeletonLine width="50%" height={20} />
        </div>
      )}

      {data && !editing && (
        <>
          {data.account ? (
            <dl className="space-y-3 rounded-2xl border border-line bg-panel p-4">
              <div>
                <dt className="text-xs text-ink-dim">Банк</dt>
                <dd className="font-semibold text-ink">{data.account.bankName}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-dim">Дансны дугаар</dt>
                <dd className="flex items-center gap-2">
                  <span className="min-w-0 break-all font-display text-lg font-bold tabular-nums text-ink sm:text-xl">
                    {data.account.accountNumber}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Дансны дугаар хуулах"
                    className="shrink-0"
                    onClick={() => copy(data.account!.accountNumber)}
                  >
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  </Button>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-dim">Данс эзэмшигч</dt>
                <dd className="font-semibold text-ink">{data.account.holderName}</dd>
              </div>
            </dl>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-panel p-4 text-sm text-ink-dim">
              {data.isSelf ? "Та дансаа хараахан оруулаагүй байна" : "Данс хараахан оруулаагүй байна"}
            </p>
          )}
          {data.canEdit && (
            <Button type="button" variant="outline" onClick={() => setEditing(true)} className="self-start">
              <Pencil aria-hidden />
              {data.account ? "Данс засах" : "Данс оруулах"}
            </Button>
          )}
        </>
      )}

      {data && editing && (
        <AccountForm
          teacherId={teacherId}
          initial={data}
          onCancel={data.account ? () => setEditing(false) : undefined}
          onSaved={() => {
            setEditing(false);
            setTick((t) => t + 1);
            onSaved(teacherId);
            toast.success("Данс хадгалагдлаа");
          }}
        />
      )}
    </div>
  );
}

function AccountForm({
  teacherId,
  initial,
  onCancel,
  onSaved,
}: {
  teacherId: string;
  initial: AccountResponse;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const prevBank = initial.account?.bankName ?? "";
  const known = BANKS.includes(prevBank);
  const [bank, setBank] = useState(prevBank ? (known ? prevBank : OTHER) : "");
  const [otherBank, setOtherBank] = useState(known ? "" : prevBank);
  const [number, setNumber] = useState(initial.account?.accountNumber ?? "");
  const [holder, setHolder] = useState(initial.account?.holderName ?? initial.fullName.replace(/\+$/, ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const bankName = bank === OTHER ? otherBank.trim() : bank;
  const digits = number.replace(/[\s-]/g, "");
  const ready = bankName.length >= 2 && digits.length >= 5 && holder.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/teacher-hours/accounts/${encodeURIComponent(teacherId)}`, {
        method: "PUT",
        body: { bankName, accountNumber: number, holderName: holder },
      });
      onSaved();
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="block text-sm font-semibold text-ink">
        Банк
        <select value={bank} onChange={(e) => setBank(e.target.value)} className={field} required>
          <option value="" disabled>
            Банкаа сонгоно уу
          </option>
          {BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={OTHER}>Бусад банк</option>
        </select>
      </label>
      {bank === OTHER && (
        <label className="block text-sm font-semibold text-ink">
          Банкны нэр
          <input value={otherBank} onChange={(e) => setOtherBank(e.target.value)} maxLength={60} className={field} />
        </label>
      )}
      <label className="block text-sm font-semibold text-ink">
        Дансны дугаар
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          maxLength={40}
          placeholder="ж: 5012345678"
          className={`${field} tabular-nums tracking-wide`}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Данс эзэмшигч
        <input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={80} className={field} />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Болих
          </Button>
        )}
        <Button type="submit" disabled={!ready || busy}>
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </Button>
      </div>
    </form>
  );
}
