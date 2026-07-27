import { ActivePassInfo } from "./types";
import { formatDate } from "./format";

const EXPIRING_SOON_DAYS = 7;

export default function PassBadge({
  activePass,
  className = "",
}: {
  activePass: ActivePassInfo | null;
  className?: string;
}) {
  if (!activePass) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-1 text-sm font-semibold text-ink-dim">
          <span aria-hidden>—</span>
          Эрхгүй
        </span>
      </div>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(activePass.expiresAt).getTime() - Date.now()) / 86400000,
  );
  const expiringSoon = daysLeft <= EXPIRING_SOON_DAYS;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
          expiringSoon ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
        }`}
      >
        <span aria-hidden>{expiringSoon ? "⏳" : "✅"}</span>
        {expiringSoon ? "Удахгүй дуусна" : "Хүчинтэй"}
      </span>
      <span className="text-xs text-ink-dim">
        {activePass.name} · Дуусах: {formatDate(activePass.expiresAt)}
      </span>
    </div>
  );
}
