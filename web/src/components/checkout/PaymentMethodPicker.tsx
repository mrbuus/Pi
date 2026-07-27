"use client";

import type { SVGProps } from "react";
import type { PaymentMethod } from "./types";

/* ---------- Дүрсүүд (энэ санд аль хэдийн байгаа inline SVG хэвшлээр) ---------- */

function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function BankIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10 12 4l9 6" />
      <path d="M4.5 10.5v8M9 10.5v8M15 10.5v8M19.5 10.5v8" />
      <path d="M2.5 20.5h19" />
    </svg>
  );
}

function CashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="1.8" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 8.5v0M18 15.5v0" />
    </svg>
  );
}

function ClockFastIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function ClockSlowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.3l2.2 3.7" />
    </svg>
  );
}

interface MethodDef {
  value: PaymentMethod;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** Хурдны товч тодорхойлолт — өнгөөр ялгаагүй, ClockIcon-той хамт */
  speed: string;
  SpeedIcon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  speedTone: "success" | "warning";
  description: string;
}

const METHODS: MethodDef[] = [
  {
    value: "QPAY",
    label: "QPay",
    Icon: BoltIcon,
    speed: "Автоматаар, шууд баталгаажна",
    SpeedIcon: ClockFastIcon,
    speedTone: "success",
    description: "Банкныхаа аппаар QR уншуулж, эсвэл банкны товч дараад шууд төлнө.",
  },
  {
    value: "BANK_TRANSFER",
    label: "Дансаар шилжүүлэх",
    Icon: BankIcon,
    speed: "Гараар шалгана — 1 ажлын өдөр хүртэл",
    SpeedIcon: ClockSlowIcon,
    speedTone: "warning",
    description: "Дансанд шилжүүлээд, ажилтан гараар шалгаж баталгаажуулна.",
  },
  {
    value: "CASH",
    label: "Бэлнээр",
    Icon: CashIcon,
    speed: "Гараар шалгана — 1 ажлын өдөр хүртэл",
    SpeedIcon: ClockSlowIcon,
    speedTone: "warning",
    description: "Төвд ирж бэлнээр төлнө, ажилтан гараар шалгаж баталгаажуулна.",
  },
];

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
  /** Тухайн UI-д CASH сонголт хамааралгүй бол нуух (жишээ нь: онлайн-л боломжтой захиалга) */
  hideCash?: boolean;
}

/**
 * Төлбөрийн арга сонгох 3 (эсвэл 2) төлөвт удирдлага.
 *
 * Зорилго: QPay нь автомат, бусад нь гараар баталгааждагийг ЯГ ойлгомжтой
 * харуулж, хэрэглэгчийг хурдан аргыг сонгоход хөтлөх. Ялгааг зөвхөн өнгөөр
 * биш — тусдаа дүрс + текстээр илэрхийлнэ.
 */
export default function PaymentMethodPicker({
  value,
  onChange,
  className = "",
  hideCash = false,
}: PaymentMethodPickerProps) {
  const methods = hideCash ? METHODS.filter((m) => m.value !== "CASH") : METHODS;

  return (
    <div
      role="radiogroup"
      aria-label="Төлбөрийн арга сонгох"
      className={`grid gap-3 sm:grid-cols-3 ${className}`}
    >
      {methods.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.value)}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
              active
                ? "border-brand bg-brand-soft/40 ring-1 ring-brand"
                : "border-line bg-surface hover:border-brand/40"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <m.Icon
                  className={`h-5 w-5 shrink-0 ${active ? "text-brand" : "text-ink-dim"}`}
                  aria-hidden="true"
                />
                <span className="font-bold">{m.label}</span>
              </span>
              {active && (
                <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-on-brand">
                  Сонгосон
                </span>
              )}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                m.speedTone === "success"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              }`}
            >
              <m.SpeedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {m.speed}
            </span>

            <span className="text-xs leading-relaxed text-ink-dim">
              {m.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
