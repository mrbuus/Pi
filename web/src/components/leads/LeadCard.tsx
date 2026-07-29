import {
  AlarmClock,
  AlertTriangle,
  Check,
  Clock,
  Phone,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import type { KeyboardEvent } from "react";

// ============ Төрлүүд (API-тай яг тохирсон, api/src/leads/) ============
export type LeadSubject = "MATH" | "SOCIAL_STUDIES" | "BOTH";
export type LeadStatusV = "NEW" | "CONTACTED" | "ENROLLED" | "LOST";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  subject: LeadSubject;
  grade: number;
  status: LeadStatusV;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_ORDER: LeadStatusV[] = [
  "NEW",
  "CONTACTED",
  "ENROLLED",
  "LOST",
];

export const STATUS_LABEL: Record<LeadStatusV, string> = {
  NEW: "Шинэ",
  CONTACTED: "Холбогдсон",
  ENROLLED: "Элссэн",
  LOST: "Алдагдсан",
};

export const STATUS_ICON: Record<LeadStatusV, LucideIcon> = {
  NEW: UserPlus,
  CONTACTED: Phone,
  ENROLLED: Check,
  LOST: X,
};

export const SUBJECT_LABEL: Record<LeadSubject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгэм",
  BOTH: "Аль аль нь",
};

/** 8 оронтой дугаарыг "9911 2233" маягаар унших боломжтой болгоно. */
export function formatPhone(phone: string): string {
  if (phone.length === 8) return `${phone.slice(0, 4)} ${phone.slice(4)}`;
  return phone;
}

/** Хугацааны зөрүүг цагийн нэгжид (диаграмаас гадуур ч ашиглагдана). */
function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

/** "2 цагийн өмнө" маягийн монгол харьцангуй хугацаа — лийдийн хамгийн чухал
 * дохио тул хуудасны бүх card дээр анзаарагдахуйц байрлана. */
export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "дөнгөж сая";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} минутын өмнө`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} цагийн өмнө`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} өдрийн өмнө`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} долоо хоногийн өмнө`;
  const month = Math.floor(day / 30);
  return `${month} сарын өмнө`;
}

type Urgency = "normal" | "watch" | "urgent";

/** Зөвхөн "Шинэ" төлөвт байгаа хүсэлтэд л сэрэмжлүүлэг үзүүлнэ — удаан
 * хариу аваагүй байх тусам элсэлт алдагдах магадлал өснө. */
function urgencyOf(status: LeadStatusV, createdAt: string): Urgency {
  if (status !== "NEW") return "normal";
  const h = hoursSince(createdAt);
  if (h >= 12) return "urgent";
  if (h >= 3) return "watch";
  return "normal";
}

const URGENCY_ICON: Record<Urgency, LucideIcon> = {
  normal: Clock,
  watch: AlarmClock,
  urgent: AlertTriangle,
};
const URGENCY_CLASS: Record<Urgency, string> = {
  normal: "text-ink",
  watch: "text-warning",
  urgent: "text-error",
};

interface LeadCardProps {
  lead: Lead;
  updating: boolean;
  error: string | null;
  onStatusChange: (id: string, status: LeadStatusV) => void;
  onRetry: (id: string) => void;
}

export default function LeadCard({
  lead,
  updating,
  error,
  onStatusChange,
  onRetry,
}: LeadCardProps) {
  const urgency = urgencyOf(lead.status, lead.createdAt);
  const selectId = `lead-status-${lead.id}`;
  const UrgencyIcon = URGENCY_ICON[urgency];

  function handleKeyDown(e: KeyboardEvent<HTMLAnchorElement>) {
    // Жинхэнэ <a href> дээр Enter аль хэдийн ажилладаг, харин Space
    // үйлдэл хийдэггүй (зөвхөн товч/checkbox шиг элементүүдэд л ажилладаг) —
    // утасны линк дээр аль алиныг нь дэмжье гэж scroll-ыг нь түгжиж click хийнэ.
    if (e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div
        className={`flex items-center gap-1.5 text-sm font-bold ${URGENCY_CLASS[urgency]}`}
      >
        <UrgencyIcon className="h-3.5 w-3.5" aria-hidden />
        <span>{formatRelativeTime(lead.createdAt)}</span>
        {urgency === "urgent" && (
          <span className="rounded-full bg-error/15 px-2 py-0.5 text-[11px] font-semibold text-error">
            Яаралтай хариу өгөөгүй
          </span>
        )}
      </div>

      <p className="mt-2 truncate text-base font-semibold text-ink">
        {lead.name}
      </p>

      <a
        href={`tel:+976${lead.phone}`}
        onKeyDown={handleKeyDown}
        className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand underline-offset-2 hover:underline"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden /> {formatPhone(lead.phone)}
      </a>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-panel px-2 py-0.5 text-ink-dim">
          {SUBJECT_LABEL[lead.subject]}
        </span>
        <span className="rounded-full bg-panel px-2 py-0.5 text-ink-dim">
          {lead.grade}-р анги
        </span>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <label
          htmlFor={selectId}
          className="mb-1 block text-xs text-ink-dim"
        >
          Төлөв солих
        </label>
        <select
          id={selectId}
          value={lead.status}
          disabled={updating}
          onChange={(e) =>
            onStatusChange(lead.id, e.target.value as LeadStatusV)
          }
          aria-busy={updating}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-60"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {updating && (
          <p className="mt-1 text-xs text-ink-dim" role="status">
            Хадгалж байна…
          </p>
        )}
        {error && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-2.5 py-1.5 text-xs text-error">
            <span>⚠ {error}</span>
            <button
              type="button"
              onClick={() => onRetry(lead.id)}
              className="rounded-md border border-error/40 px-2 py-1 font-semibold transition hover:bg-error/10"
            >
              Дахин оролдох
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
