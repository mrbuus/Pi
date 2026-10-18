"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { api, getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { rosterNames } from "@/lib/personName";
import ChangeClassDialog from "./ChangeClassDialog";

/**
 * Анхаарах сурагчид (эзэн 2026-10-18): «бүртгэлтэй атал ирэхгүй байх нь том
 * алдаа». Ангид хуваарилагдаагүй эсвэл ангид байгаа ч хичээлдээ ирэхгүй байгаа
 * хүүхдийг ТОД харуулна. GET /classrooms/attention-students (Багш+/Админ).
 * Эрхгүй (403/404) эсвэл алдаа гарвал чимээгүй нуугдана.
 */

export interface UnassignedRow {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
  phone: string | null;
  registered: string;
  joinedOn: string | null;
  waitingSince: string;
}
export interface NotAttendingRow {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
  classroomId: string;
  classroomName: string;
  lastAttended: string | null;
  missedCount: number;
}
export interface AttentionData {
  unassigned: UnassignedRow[];
  notAttending: NotAttendingRow[];
}
export type AttentionKind = "unassigned" | "absent";

const canSee = () => {
  const role = getRole();
  return role === "ADMIN" || role === "TEACHER_PLUS";
};

/** Өгөгдлийг ачаална; эрхгүй эсвэл алдаа бол `data` null хэвээр (чимээгүй). */
export function useAttentionStudents(enabled = true) {
  const [data, setData] = useState<AttentionData | null>(null);
  const reload = useCallback(() => {
    if (!enabled || !canSee()) return;
    api<AttentionData>("/classrooms/attention-students")
      .then((d) => setData({ unassigned: d.unassigned ?? [], notAttending: d.notAttending ?? [] }))
      .catch(() => setData(null));
  }, [enabled]);
  useEffect(() => {
    const t = window.setTimeout(reload, 0);
    return () => window.clearTimeout(t);
  }, [reload]);
  return { data, reload };
}

const ROWS = 6;

export default function AttentionBanner({
  data: external,
  onChanged,
  onShow,
  className,
}: {
  /** Жагсаалтын хуудас өөрөө ачаалж дамжуулж болно; өгөхгүй бол өөрөө ачаална */
  data?: AttentionData | null;
  /** Анги оноосны дараа (жагсаалтыг шинэчлэх) */
  onChanged?: () => void;
  /** Өгвөл «Бүгдийг харах» нь жагсаалтыг шүүнэ; үгүй бол сурагчдын хуудас руу */
  onShow?: (kind: AttentionKind) => void;
  className?: string;
}) {
  const own = useAttentionStudents(external === undefined);
  const data = external === undefined ? own.data : external;
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState<{ id: string; name: string; classId: string | null } | null>(null);

  const names = useMemo(
    () => rosterNames([...(data?.unassigned ?? []), ...(data?.notAttending ?? [])]),
    [data],
  );
  if (!data) return null;
  const nU = data.unassigned.length;
  const nA = data.notAttending.length;
  if (nU + nA === 0) return null;

  const changed = () => {
    own.reload();
    onChanged?.();
  };

  return (
    <section aria-label="Анхаарах сурагчид" className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-2.5 text-left transition hover:bg-error/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
      >
        <TriangleAlert className="h-5 w-5 shrink-0 text-error" aria-hidden />
        <Meta
          className="min-w-0 flex-1 text-sm font-semibold text-ink"
          items={[
            nU > 0 && `${nU} хүүхэд ангид хуваарилагдаагүй`,
            nA > 0 && `${nA} хүүхэд хичээлдээ ирэхгүй байна`,
          ]}
        />
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mt-2 space-y-4 rounded-2xl border border-line bg-surface p-3 sm:p-4">
          {nU > 0 && (
            <List
              title="Ангид хуваарилагдаагүй"
              total={nU}
              kind="unassigned"
              onShow={onShow}
              rows={data.unassigned.slice(0, ROWS).map((s) => ({
                id: s.id,
                name: names.get(s.id) ?? s.firstName,
                full: `${s.lastName} ${s.firstName}`.trim(),
                code: s.studentCode,
                meta: ["Ангигүй", `${formatMnDate(s.waitingSince)}-аас хүлээж байна`],
                classId: null,
                cta: "Анги оноох",
              }))}
              onAssign={setAssigning}
            />
          )}
          {nA > 0 && (
            <List
              title="Хичээлдээ ирэхгүй байгаа"
              total={nA}
              kind="absent"
              onShow={onShow}
              rows={data.notAttending.slice(0, ROWS).map((s) => ({
                id: s.id,
                name: names.get(s.id) ?? s.firstName,
                full: `${s.lastName} ${s.firstName}`.trim(),
                code: s.studentCode,
                meta: [
                  s.classroomName,
                  s.lastAttended ? `Сүүлд ${formatMnDate(s.lastAttended)}-нд ирсэн` : "Нэг ч удаа ирээгүй",
                  `${s.missedCount} хичээл тасалсан`,
                ],
                classId: s.classroomId,
                cta: "Анги солих",
              }))}
              onAssign={setAssigning}
            />
          )}
        </div>
      )}

      {assigning && (
        <ChangeClassDialog
          studentId={assigning.id}
          studentName={assigning.name}
          currentClassId={assigning.classId}
          onClose={() => setAssigning(null)}
          onChanged={changed}
        />
      )}
    </section>
  );
}

interface Row {
  id: string;
  name: string;
  full: string;
  code: string | null;
  meta: string[];
  classId: string | null;
  cta: string;
}

function List({
  title,
  total,
  kind,
  rows,
  onShow,
  onAssign,
}: {
  title: string;
  total: number;
  kind: AttentionKind;
  rows: Row[];
  onShow?: (kind: AttentionKind) => void;
  onAssign: (s: { id: string; name: string; classId: string | null }) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-bold text-ink">
        {title} <span className="font-normal tabular-nums text-ink-dim">{total}</span>
      </h3>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate text-sm font-semibold text-ink">
                {r.name}
                {r.code && <span className="ml-2 font-mono text-xs font-normal text-ink-dim">{r.code}</span>}
              </p>
              <Meta className="text-xs text-ink-dim" items={r.meta} />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="min-h-11"
                onClick={() => onAssign({ id: r.id, name: r.full, classId: r.classId })}
              >
                {r.cta}
              </Button>
              <Button size="sm" variant="ghost" asChild className="min-h-11">
                <Link href={`/app/students/${r.id}`} aria-label={`${r.full} — хуудас нээх`}>
                  Нээх
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {total > rows.length &&
        (onShow ? (
          <button
            type="button"
            onClick={() => onShow(kind)}
            className="mt-1 min-h-11 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Бүгдийг харах ({total})
          </button>
        ) : (
          <Link
            href="/app/admin/students"
            className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
          >
            Сурагчдын жагсаалтаас бүгдийг харах ({total})
          </Link>
        ))}
    </div>
  );
}
