"use client";
import Link from "next/link";
export const PRIVACY_VERSION = "2026-09-26-draft";
export interface ConsentValue {
  acceptTerms: boolean;
  isMinor: boolean | null;
  guardianConsent: boolean;
}
export const EMPTY_CONSENT: ConsentValue = {
  acceptTerms: false,
  isMinor: null,
  guardianConsent: false,
};
export function consentReady(v: ConsentValue) {
  return (
    v.acceptTerms && v.isMinor !== null && (!v.isMinor || v.guardianConsent)
  );
}
export default function ConsentFields({
  value,
  onChange,
  disabled = false,
}: {
  value: ConsentValue;
  onChange: (v: ConsentValue) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="space-y-3 rounded-xl border border-line p-3"
    >
      <legend className="px-1 text-sm font-semibold text-ink">
        Нөхцөл ба зөвшөөрөл
      </legend>
      <p className="text-sm text-ink-dim">
        Бодлого нь хуульчаар хянуулах төсөл. Зөвшөөрөл бүрийг та өөрөө сонгоно.
      </p>
      <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={value.acceptTerms}
          onChange={(e) =>
            onChange({ ...value, acceptTerms: e.target.checked })
          }
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>
          <Link href="/terms" target="_blank" className="text-brand underline">
            Үйлчилгээний нөхцөл
          </Link>
          ,{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-brand underline"
          >
            нууцлалын бодлогыг
          </Link>{" "}
          уншиж зөвшөөрч байна.
        </span>
      </label>
      <label className="block text-sm text-ink">
        Насны ангилал
        <select
          aria-label="Насны ангилал"
          value={
            value.isMinor === null ? "" : value.isMinor ? "minor" : "adult"
          }
          onChange={(e) =>
            onChange({
              ...value,
              isMinor:
                e.target.value === "" ? null : e.target.value === "minor",
              guardianConsent: false,
            })
          }
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-ink"
        >
          <option value="">Сонгоно уу</option>
          <option value="minor">18 нас хүрээгүй</option>
          <option value="adult">18 ба түүнээс дээш</option>
        </select>
      </label>
      {value.isMinor && (
        <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.guardianConsent}
            onChange={(e) =>
              onChange({ ...value, guardianConsent: e.target.checked })
            }
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>
            Эцэг эх, хууль ёсны төлөөлөгчтэйгөө бодлогыг уншиж, зөвшөөрлийг нь
            авсан.
          </span>
        </label>
      )}
      {value.isMinor && (
        <p className="text-sm text-ink-dim">
          Энэ нь таны мэдүүлэг. Төв шаардлагатай үед төлөөлөгчтэй холбогдон
          баталгаажуулна.
        </p>
      )}
    </fieldset>
  );
}
