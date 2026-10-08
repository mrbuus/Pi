import { AlertCircle, Banknote, CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { REFUND_STATUS, type RefundStatus } from './types';

const STATUS_ICON = {
  DRAFT: FileText,
  PENDING_APPROVAL: Clock3,
  APPROVED: CheckCircle2,
  PAID: Banknote,
  CANCELLED: XCircle,
} satisfies Record<RefundStatus, typeof FileText>;

export default function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const Icon = STATUS_ICON[status] ?? AlertCircle;
  const info = REFUND_STATUS[status];
  return <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${info.className}`}>
    <Icon className="h-4 w-4 shrink-0" aria-hidden />
    {info.label}
  </span>;
}
