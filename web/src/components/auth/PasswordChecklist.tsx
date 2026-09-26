"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_MIN_LENGTH, passwordChecks } from "@/lib/passwordPolicy";

/* Шинэ нууц үгийн шаардлагыг бичих зуур шууд харуулна — илгээгээд буцаж
   алдаа авах нь цаг алдуулна. Хоосон үед саарал, биелсэн мөр ногоон. */
export default function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  const c = passwordChecks(value);
  const rows: { ok: boolean; label: string }[] = [
    { ok: c.length, label: `${PASSWORD_MIN_LENGTH}+ тэмдэгт` },
    { ok: c.letter, label: "Үсэг" },
    { ok: c.digit, label: "Тоо" },
  ];
  const empty = value.length === 0;
  return (
    <ul id={id} className="mt-1.5 space-y-0.5 text-xs" aria-live="polite">
      {rows.map((r) => {
        const Icon = r.ok ? Check : X;
        const tone = r.ok ? "text-success" : empty ? "text-ink-dim" : "text-error";
        return (
          <li key={r.label} className={`flex items-center gap-1.5 ${tone}`}>
            <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span>
              {r.label}
              <span className="sr-only">{r.ok ? ": биелсэн" : ": дутуу"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
