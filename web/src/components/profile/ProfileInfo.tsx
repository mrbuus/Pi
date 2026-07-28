"use client";

import { Copy, Mail, Phone } from "lucide-react";
import { useState } from "react";

export interface ProfileInfoMe {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  teacherCode?: string | null;
  studentCode?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

// Танигдах код — багш бол teacherCode, сурагч бол studentCode. Бусад role
// (админ, эцэг эх, худалдан авагч)-д код байхгүй тул энэ хэсгийг харуулахгүй.
function CodeRow({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-ink-dim">{label}</p>
        <p className="selectable truncate font-mono text-base font-semibold text-ink">{code}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-dim transition hover:text-ink"
      >
        <Copy className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} />
        {copied ? "Хууллаа ✓" : "Хуулах"}
      </button>
    </div>
  );
}

function FieldRow({
  icon,
  label,
  value,
  placeholder,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  placeholder: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel text-ink-dim">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-dim">{label}</p>
        {value ? (
          href ? (
            <a href={href} className="selectable truncate text-base font-medium text-ink">
              {value}
            </a>
          ) : (
            <p className="selectable truncate text-base font-medium text-ink">{value}</p>
          )
        ) : (
          <p className="text-base text-ink-dim/70 italic">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

// Профайлын үндсэн мэдээлэл — код (хуулах боломжтой), нэр, утас, имэйл.
// Одоогоор эдгээрийг ЗАСАХ endpoint API дээр байхгүй тул зөвхөн уншихад
// зориулсан харагдана (шинэ мэдээлэл зохиохгүй, зөвхөн /auth/me-с ирснийг
// харуулна). Багш нарын имэйл холбогдсон эсэхийг эндээс шууд харна.
export default function ProfileInfo({ me, role }: { me: ProfileInfoMe; role: string }) {
  const code = me.teacherCode ?? me.studentCode;
  const codeLabel = me.teacherCode ? "Багшийн код" : "Сурагчийн код";

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-lg font-bold text-ink">Хувийн мэдээлэл</h2>
      <p className="mt-1 text-sm text-ink-dim">{ROLE_LABEL[role] ?? role}</p>

      {code && (
        <div className="mt-4">
          <CodeRow code={code} label={codeLabel} />
        </div>
      )}

      <div className="mt-4">
        <FieldRow
          icon={<span className="text-sm font-bold">{me.firstName[0]}</span>}
          label="Нэр"
          value={`${me.lastName} ${me.firstName}`}
          placeholder="Нэр байхгүй"
        />
        <FieldRow
          icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} />}
          label="Утас"
          value={me.phone}
          placeholder="Утасны дугаар холбогдоогүй"
          href={me.phone ? `tel:${me.phone}` : undefined}
        />
        <FieldRow
          icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.7} />}
          label="Имэйл"
          value={me.email}
          placeholder="Имэйл холбогдоогүй"
          href={me.email ? `mailto:${me.email}` : undefined}
        />
      </div>
    </section>
  );
}
