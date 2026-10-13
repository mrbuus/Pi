"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClassStudentDetail } from "@/components/exams/ClassStudentDialog";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import ChangeClassDialog from "../ChangeClassDialog";
import StudentNotesPanel from "../StudentNotesPanel";
import RequireRole from "@/components/nav/RequireRole";
import { useSection } from "./useSection";
import {
  canEditProfile,
  canSeeGuardianPhones,
  fullName,
  type StudentDetailData,
  type StudentPaymentHistory,
} from "../types";
import ClassProgressTab from "./ClassProgressTab";
import IndependentProgressTab from "./IndependentProgressTab";
import StudentOverview, { type ClassSummary } from "../hub/StudentOverview";
import LessonHistoryTab from "../hub/LessonHistoryTab";
import PaymentsTab from "../hub/PaymentsTab";
import StudentInfoTab from "../hub/StudentInfoTab";

type TabKey = "class" | "exams" | "lessons" | "payments" | "notes" | "independent" | "info";
const ALL_TABS: TabKey[] = ["class", "exams", "lessons", "payments", "notes", "independent", "info"];
const TAB_LABELS: Record<TabKey, string> = {
  class: "Ангийн явц",
  exams: "Шалгалт",
  lessons: "Хичээлийн түүх",
  payments: "Төлбөр",
  notes: "Тэмдэглэл",
  independent: "Бие даасан явц",
  info: "Мэдээлэл",
};

/**
 * Сурагчийн нэгдсэн хуудас (/app/students/:id) — Багш/Багш+/Админ.
 * Дээр нь «хувийн хэрэг» (анги, сургууль, хугацаа, төлбөр, ирц, шалгалт,
 * эцэг эхийн утас, ирээдүйн оноонууд), доор нь табууд. Таб ?tab=-д хадгалагдана.
 * /app/admin/students/:id энд шилжүүлдэг (хуучин StudentDetail-ийн бүх функц
 * «Мэдээлэл», «Төлбөр», «Тэмдэглэл», «Бие даасан явц» табуудад).
 */
function StudentProgressContent({ studentId }: { studentId: string }) {
  const role = getRole();
  const canSeeMoney = role === "ADMIN" || role === "TEACHER_PLUS";
  // Анги солих — Багш+ ба Админ (эзний шийдвэр 2026-10-11)
  const canMove = role === "ADMIN" || role === "TEACHER_PLUS";
  const tabs = useMemo(() => ALL_TABS.filter((t) => t !== "payments" || canSeeMoney), [canSeeMoney]);

  const detailQ = useSection<StudentDetailData>(`/users/${studentId}`);
  const { data: detail, status, error, reload: load } = detailQ;
  const classId = detail?.currentClassroom?.id ?? null;
  const paymentsQ = useSection<StudentPaymentHistory | null>(
    canSeeMoney ? `/payments/student/${studentId}` : null,
    null,
  );
  const summaryQ = useSection<ClassSummary | null>(
    classId ? `/exams/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}` : null,
    null,
  );

  const params = useSearchParams();
  const fromUrl = params.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(fromUrl && tabs.includes(fromUrl) ? fromUrl : "class");
  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
  }, []);
  const [moving, setMoving] = useState(false);

  // Жилийн төлбөрөө бүтэн төлсөн сурагчид PAYMENT тэмдэглэл шаардлагагүй
  // (notes.service assertPaymentNoteAllowed-тэй ижил). Мэдэхгүй бол хаахгүй — сервер хэлнэ.
  const payments = paymentsQ.data;
  // Зөвхөн жилийн төлбөрөө БҮТЭН төлсөн үед хаана (урьдчилгаатай бол амлалтын
  // тэмдэглэл хэрэгтэй — notes.service-тэй ижил, 2026-10-13).
  const paymentNotesBlocked = !!(
    payments &&
    payments.tuitionPlan === "FULL_YEAR" &&
    payments.payments.some((p) => p.status === "CONFIRMED") &&
    payments.summary.outstanding <= 0
  );

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="min-w-0 space-y-5">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-dim transition hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          Буцах
        </button>

        {status === "loading" && <OverviewSkeleton />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}

        {status === "ready" && detail && (
          <StudentOverview
            detail={detail}
            canMove={canMove}
            onMove={() => setMoving(true)}
            canSeeMoney={canSeeMoney}
            payments={{ status: paymentsQ.status, data: paymentsQ.data }}
            summary={{ status: summaryQ.status, data: summaryQ.data }}
          />
        )}

        {/* Табууд — утсан дээр зөвхөн мөр нь хөндлөн гүйнэ, хуудас биш */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div role="tablist" aria-label="Сурагчийн хэсгүүд" className="flex w-max min-w-full border-b border-line">
            {tabs.map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => changeTab(key)}
                className={cn(
                  "min-h-11 shrink-0 whitespace-nowrap px-3 text-sm font-semibold transition md:px-4",
                  tab === key ? "border-b-2 border-brand-bright text-brand" : "text-ink-dim hover:text-ink",
                )}
              >
                {TAB_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {tab === "class" && <ClassProgressTab studentId={studentId} />}
        {tab === "independent" && <IndependentProgressTab studentId={studentId} />}
        {tab === "lessons" && <LessonHistoryTab studentId={studentId} />}
        {tab === "exams" &&
          (status === "loading" ? (
            <LoadingState rows={4} label="Шалгалт" />
          ) : classId ? (
            <ClassStudentDetail key={classId} classId={classId} studentId={studentId} />
          ) : (
            <EmptyState title="Сурагч ангид бүртгэлгүй" hint="Ангид оруулсны дараа ангийн шалгалтын дүн энд гарна." />
          ))}
        {tab === "payments" && canSeeMoney && (
          <PaymentsTab
            profile={detail?.studentProfile ?? null}
            status={paymentsQ.status}
            data={paymentsQ.data}
            error={paymentsQ.error}
            onRetry={paymentsQ.reload}
          />
        )}
        {tab === "notes" && (
          <StudentNotesPanel
            studentId={studentId}
            paymentNotesBlocked={paymentNotesBlocked}
            paymentNotesBlockedReason="Жилийн төлбөрөө бүтэн төлсөн — төлбөрийн тэмдэглэл шаардлагагүй"
          />
        )}
        {tab === "info" &&
          (detail ? (
            <StudentInfoTab
              studentId={studentId}
              detail={detail}
              setDetail={detailQ.setData}
              reload={() => {
                load();
                paymentsQ.reload();
              }}
              canEdit={canEditProfile(role)}
              showGuardians={canSeeGuardianPhones(role)}
              canSeeMoney={canSeeMoney}
            />
          ) : (
            status === "loading" && <LoadingState rows={6} label="Мэдээлэл" />
          ))}

        {moving && detail && (
          <ChangeClassDialog
            studentId={studentId}
            studentName={fullName(detail)}
            currentClassId={classId}
            onClose={() => setMoving(false)}
            onChanged={load}
          />
        )}
      </div>
    </RequireRole>
  );
}

function OverviewSkeleton() {
  return (
    <div className="chunky p-4 md:p-6" aria-busy="true" role="status" aria-label="Ачаалж байна">
      <SkeletonLine width="45%" height={22} />
      <SkeletonLine width="30%" height={12} className="mt-2" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-line p-3">
            <SkeletonLine width="35%" height={10} />
            <SkeletonLine width="65%" height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentProgress({ studentId }: { studentId: string }) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <StudentProgressContent key={studentId} studentId={studentId} />
    </Suspense>
  );
}
