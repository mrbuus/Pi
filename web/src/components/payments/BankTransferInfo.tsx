"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BANK } from "@/lib/orgInfo";
import CopyButton from "./CopyButton";

interface Me {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-dim">{label}</dt>
        <dd className="[overflow-wrap:anywhere] font-semibold tabular-nums tracking-tight text-ink">{value}</dd>
      </div>
      {copy && <CopyButton text={value} label={label} />}
    </div>
  );
}

/**
 * Дансаар шилжүүлэх мэдээлэл (тестэрийн санал 2026-11-05): данс, IBAN, хүлээн авагч, мөн ХУУЛЖ
 * АВАХ гүйлгээний утга (овог нэр, утас) — ажилтан тулгахад хялбар. Худалдан авагчийн хуудас ба
 * дэлгүүрийн төлбөрт нэг ижил.
 */
export default function BankTransferInfo({ className = "" }: { className?: string }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    api<Me>("/auth/me")
      .then((m) => alive && setMe(m))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const contact = me?.phone || me?.email || "";
  const note = me ? [`${me.lastName} ${me.firstName}`.trim(), contact].filter(Boolean).join(", ") : "";

  return (
    <div className={`rounded-xl border border-line bg-surface px-4 py-2 ${className}`}>
      <p className="pt-2 text-xs font-semibold text-ink-dim">Дараах данс руу шилжүүлээрэй</p>
      <dl className="divide-y divide-line">
        <Row label="Банк" value={BANK.name} />
        <Row label="Дансны дугаар" value={BANK.account} copy />
        <Row label="IBAN" value={BANK.iban} copy />
        <Row label="Хүлээн авагч" value={BANK.holder} />
        {note && <Row label="Гүйлгээний утга" value={note} copy />}
      </dl>
      <p className="pb-2 text-xs text-ink-dim">
        Гүйлгээний утгыг хуулж оруулбал ажилтан төлбөрийг хурдан баталгаажуулна
      </p>
    </div>
  );
}
