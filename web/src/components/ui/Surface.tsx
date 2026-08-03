import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Хуудас/хэсгийн стандарт бүрхүүлүүд.
 *
 * Өмнө нь `rounded-2xl border border-line bg-panel p-6` гэсэн мөр 100 гаруй
 * газар гараар давтагдаж, зарим нь p-4, зарим нь p-6, зарим нь rounded-xl
 * байсан тул хэмнэл алдагдаж байв. Эндээс цаашид нэг эх сурвалж.
 */

/** Агуулгын карт. `interactive` бол hover-т 1px өргөгдөнө. */
export function Card({
  children,
  className = "",
  interactive = false,
  padding = "base",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: "none" | "tight" | "base";
}) {
  const pad = padding === "none" ? "" : padding === "tight" ? "p-4" : "p-5 md:p-6";
  return (
    <div
      className={`rounded-2xl border border-line bg-panel elev-1 ${pad} ${
        interactive ? "surface-interactive" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Хэсгийн толгой — дүрс + гарчиг + (сонголтоор) баруун талын үйлдэл.
 * Гарчгийн хэмжээ, өнгө, зайг нэг мөрөнд барина.
 */
export function SectionHeader({
  icon: Icon,
  title,
  hint,
  actions,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-brand-soft" aria-hidden />}
        <h2 className="font-bold text-brand-soft">{title}</h2>
        {hint}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Хуудасны толгой — H1 + тайлбар + үйлдэл */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-dim">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
