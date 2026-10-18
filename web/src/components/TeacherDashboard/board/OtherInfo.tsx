"use client";

import { ChevronDown, LayoutList, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AnnouncementCompose from "@/components/AnnouncementCompose";
import ClassWeekCard from "@/components/activity/ClassWeekCard";
import OnlineHomeworkSection from "@/components/homework/OnlineHomeworkSection";
import AttentionSection, { type AttentionResponse } from "@/components/TeacherDashboard/AttentionSection";
import ParentRequestsSection from "@/components/TeacherDashboard/ParentRequestsSection";
import SummarySection from "@/components/TeacherDashboard/SummarySection";
import UnassignedStudentsSection from "@/components/TeacherDashboard/UnassignedStudentsSection";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { readStore, ubNowMinute, ubTodayKey, writeStore } from "./lib";

const OPEN_KEY = "pi_board_other_open";

interface Summary {
  stats: {
    studentsTotal: number;
    studentsMarked: number;
    totalAttempts: number;
    byState: Record<string, number>;
    byChapter: Record<string, { total: number; failed: number }>;
  };
}
interface Unassigned {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentProfile?: { grade?: number };
}
interface ParentRequest {
  id: string;
  parent: { firstName: string; lastName: string; phone: string };
  student: { firstName: string; lastName: string; phone: string; studentProfile?: { grade?: number } };
}

type Load<T> = { status: "loading" | "ready" | "error"; data: T | null; error: string };
const LOADING = { status: "loading", data: null, error: "" } as const;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Алдаа гарлаа");

function Failed({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
      <div className="inline-flex items-center gap-1.5">
        <TriangleAlert className="size-4" aria-hidden /> {title}: {message}
      </div>
    </section>
  );
}

/**
 * «Ангийн бусад мэдээлэл» — хуучин самбарын хэсгүүд (функц устгахгүй, эзний дүрэм):
 * оройн тэмдэглэгээний дүгнэлт, анхаарах сурагч, долоо хоногийн идэвх, онлайн ангийн
 * даалгавар, эцэг эхийн холболт, ангигүй сурагч, зар. Нээх хүртэл юу ч ачаалахгүй.
 */
export default function OtherInfo({
  classId,
  classType,
  date,
  canManage,
}: {
  classId: string;
  classType: string;
  date: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(() => readStore(OPEN_KEY) === "1");
  const toggle = () => {
    setOpen((o) => {
      writeStore(OPEN_KEY, o ? "0" : "1");
      return !o;
    });
  };
  return (
    <section aria-label="Ангийн бусад мэдээлэл" className="rounded-xl border border-line bg-surface">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="board-other-info"
          onClick={toggle}
          className="flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold text-ink hover:bg-ink/[0.03]"
        >
          <LayoutList className="size-4 shrink-0 text-brand" aria-hidden />
          Ангийн бусад мэдээлэл
          <ChevronDown className={cn("ml-auto size-4 shrink-0 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {open && (
        <div id="board-other-info" className="space-y-5 border-t border-line p-3 sm:p-4">
          <OtherBody classId={classId} classType={classType} date={date} canManage={canManage} />
        </div>
      )}
    </section>
  );
}

function OtherBody({ classId, classType, date, canManage }: { classId: string; classType: string; date: string; canManage: boolean }) {
  // Өдрийн дүгнэлт шөнө 23:30-д бодогддог — өнөөдрийнхийг түүнээс өмнө асуувал 400 (консолд алдаа).
  // Анги/өдөр солигдоход эцэг нь шинээр mount хийнэ (ClassView key).
  const [skipSummary] = useState(() => date === ubTodayKey() && ubNowMinute() < 23 * 60 + 35);
  const [summary, setSummary] = useState<Load<Summary>>(() => (skipSummary ? { status: "ready", data: null, error: "" } : LOADING));
  const [attention, setAttention] = useState<Load<AttentionResponse>>(LOADING);
  const [unassigned, setUnassigned] = useState<Load<Unassigned[]>>(LOADING);
  const [requests, setRequests] = useState<Load<ParentRequest[]>>(LOADING);
  const [msg, setMsg] = useState("");

  const loadClass = useCallback(() => {
    const cid = encodeURIComponent(classId);
    if (!skipSummary)
    api<Summary>(`/classrooms/${cid}/daily-summary?date=${date}`)
      .then((d) => setSummary({ status: "ready", data: d, error: "" }))
      // 400 = тухайн өдрийн дүгнэлт бодогдоогүй — алдаа биш, хоосон
      .catch((e) =>
        setSummary(e instanceof ApiError && e.status === 400 ? { status: "ready", data: null, error: "" } : { status: "error", data: null, error: errMsg(e) }),
      );
    api<AttentionResponse>(`/classrooms/${cid}/attention?date=${date}`)
      .then((d) => setAttention({ status: "ready", data: d, error: "" }))
      .catch((e) => setAttention({ status: "error", data: null, error: errMsg(e) }));
  }, [classId, date, skipSummary]);

  const loadAdmin = useCallback(() => {
    if (!canManage) return;
    api<Unassigned[]>("/classrooms/unassigned-students")
      .then((d) => setUnassigned({ status: "ready", data: d, error: "" }))
      .catch((e) => setUnassigned({ status: "error", data: null, error: errMsg(e) }));
    api<ParentRequest[]>("/parent/links/pending")
      .then((d) => setRequests({ status: "ready", data: d, error: "" }))
      .catch((e) => setRequests({ status: "error", data: null, error: errMsg(e) }));
  }, [canManage]);

  useEffect(loadClass, [loadClass]);
  useEffect(loadAdmin, [loadAdmin]);

  const act = async (path: string, ok: string) => {
    try {
      await api(path, { method: "POST" });
      setMsg(ok);
      loadAdmin();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };
  const enroll = async (studentId: string) => {
    try {
      await api(`/classrooms/${encodeURIComponent(classId)}/enroll`, { method: "POST", body: { studentId } });
      setMsg("Сурагчийг ангид нэмлээ");
      loadAdmin();
    } catch (e) {
      setMsg(errMsg(e));
    }
  };

  return (
    <>
      {msg && (
        <p role="status" className="rounded-lg bg-info/10 px-3 py-2 text-sm text-ink">
          {msg}
        </p>
      )}
      {classType === "ONLINE" && <OnlineHomeworkSection key={classId} classroomId={classId} />}
      <ClassWeekCard classroomId={classId} />
      <div className="grid gap-5 md:grid-cols-2">
        {summary.status === "error" ? (
          <Failed title="Дүгнэлт ачаалагдсангүй" message={summary.error} />
        ) : (
          <SummarySection summary={summary.status === "loading" ? null : summary.data} />
        )}
        {attention.status === "error" ? (
          <Failed title="Анхаарах жагсаалт ачаалагдсангүй" message={attention.error} />
        ) : (
          <AttentionSection attention={attention.status === "loading" ? null : attention.data} />
        )}
        {canManage &&
          (unassigned.status === "loading" ? (
            <LoadingState rows={2} label="Ангигүй сурагчид" />
          ) : unassigned.status === "error" ? (
            <ErrorState message={unassigned.error} onRetry={loadAdmin} />
          ) : (
            <UnassignedStudentsSection unassigned={unassigned.data ?? []} onEnroll={enroll} />
          ))}
        {canManage &&
          (requests.status === "loading" ? (
            <LoadingState rows={2} label="Эцэг эхийн хүсэлт" />
          ) : requests.status === "error" ? (
            <ErrorState message={requests.error} onRetry={loadAdmin} />
          ) : (
            <ParentRequestsSection
              parentRequests={requests.data ?? []}
              onVerify={(id) => act(`/parent/links/${id}/verify`, "Эцэг эхийн холболт баталгаажлаа")}
              onReject={(id) => act(`/parent/links/${id}/reject`, "Холболтын хүсэлт цуцлагдлаа")}
            />
          ))}
      </div>
      <AnnouncementCompose />
    </>
  );
}
