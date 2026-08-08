import Link from "next/link";
import { Meta } from "@/components/ui/Meta";
import { OnlineStudentListItem } from "./types";
import { formatRelative } from "./format";
import EngagementBadge from "./EngagementBadge";
import PassBadge from "./PassBadge";

// Роостерын нэг мөр — гар утсан дээр багана болж давхарлагдана (хажуу тийш
// гүйлгэх шаардлагагүй), том дэлгэц дээр нэг мөрөнд байрлана.
export default function StudentRosterCard({
  student,
  highlight,
}: {
  student: OnlineStudentListItem;
  highlight?: boolean;
}) {
  return (
    <Link
      href={`/app/online/${student.studentId}`}
      className={`block rounded-2xl border p-4 transition hover:border-brand focus-visible:border-brand ${
        highlight ? "border-error/40 bg-error/5" : "border-line bg-panel"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{student.name}</p>
          <p className="text-sm text-ink-dim">
            <Meta
              items={[
                student.studentCode ?? "Код тодорхойгүй",
                student.grade ? `${student.grade}-р анги` : null,
              ]}
            />
          </p>
        </div>
        <EngagementBadge level={student.engagement} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <PassBadge activePass={student.activePass} />
        <div>
          <p className="text-xs text-ink-dim">Сүүлд идэвхтэй</p>
          <p className="font-semibold text-ink">{formatRelative(student.lastActiveAt)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim">30 хоногийн бодлого</p>
          <p className="font-semibold text-ink">{student.problemsAttempted.last30d}</p>
        </div>
        <div>
          <p className="text-xs text-ink-dim">Амжилтын хувь</p>
          <p className="font-semibold text-ink">
            {student.successRate === null ? "—" : `${student.successRate}%`}
          </p>
        </div>
      </div>
    </Link>
  );
}
