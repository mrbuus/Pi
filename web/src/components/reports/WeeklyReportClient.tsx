"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";

type ChildLink = { verified: boolean; student: { id: string; firstName: string; lastName: string } };
type WeeklyReport = {
  student: { firstName: string; lastName: string };
  week: { start: string; end: string };
  snapshotAt: string;
  attendance: { present: number; absent: number; excused: number };
  testResultsComplete: boolean;
  testResultLimit: number | null;
  tests: Array<{ title: string; score: number | null; maxScore: number | null; createdAt: string }>;
  practiceCount: number;
  homework: { assignments: { done: number; notDone: number; items: Array<{ title: string; done: boolean }> }; dailyMarks: { done: number; partial: number; notDone: number; unmarked: number } };
  topics: { best: { topic: string; rate: number } | null; weakest: { topic: string; rate: number } | null; complete: boolean; sampleLimit: number | null };
  nextWeekSchedule: Array<{ date: string; startMinute: number; endMinute: number; room: string | null; classroom: string }>;
};
function mondayKey(date: Date) {
  const local = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) + "T00:00:00Z");
  const offset = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - offset);
  return local.toISOString().slice(0, 10);
}
function weekOptions() {
  const current = new Date(`${mondayKey(new Date())}T00:00:00Z`);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(current);
    date.setUTCDate(date.getUTCDate() - index * 7);
    return date.toISOString().slice(0, 10);
  });
}
function timeLabel(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }

export default function WeeklyReportClient({ initialStudentId, initialWeek }: { initialStudentId: string; initialWeek: string }) {
  const weeks = useMemo(() => weekOptions(), []);
  const [children, setChildren] = useState<ChildLink[]>([]);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [week, setWeek] = useState(initialWeek || weeks[0]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childrenReady, setChildrenReady] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    api<ChildLink[]>("/parent/children")
      .then((items) => {
        const verified = items.filter((item) => item.verified);
        setChildren(verified);
        setStudentId((current) => verified.some((item) => item.student.id === current) ? current : verified[0]?.student.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Хүүхдийн жагсаалтыг ачаалж чадсангүй."))
      .finally(() => { setChildrenReady(true); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!childrenReady || !studentId || !week) return;
    let active = true;
    api<WeeklyReport>(`/parents/weekly-report?studentId=${encodeURIComponent(studentId)}&week=${encodeURIComponent(week)}`)
      .then((data) => {
        if (!active) return;
        setReport(data);
        const params = new URLSearchParams(window.location.search);
        params.set("studentId", studentId); params.set("week", week);
        window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Тайлан ачаалж чадсангүй."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [childrenReady, refreshToken, studentId, week]);

  function reloadReport() {
    setLoading(true);
    setError(null);
    setRefreshToken((token) => token + 1);
  }

  if (loading && !report) return <LoadingState rows={5} label="Долоо хоногийн тайлан ачаалж байна" />;
  if (error && !report) return <div className="space-y-4"><PageHeader title="Долоо хоногийн тайлан" /><ErrorState message="Тайлан ачаалж чадсангүй. Дахин оролдоно уу." onRetry={reloadReport} /></div>;
  if (!children.length) return <div className="space-y-5"><PageHeader title="Долоо хоногийн тайлан" /><EmptyState title="Баталгаажсан хүүхэд алга" hint="Баталгаажсан хүүхдийн долоо хоногийн тайлан энд харагдана." /></div>;

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader title="Долоо хоногийн тайлан" description="Хүүхдийнхээ энэ долоо хоногийн хичээл, даалгаврын явцыг харна." actions={<Button variant="secondary" onClick={() => window.print()}><Printer aria-hidden /> Хэвлэх</Button>} />
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Хүүхэд<select aria-label="Хүүхэд" className="min-h-12 rounded-xl border-2 border-line bg-bg px-3" value={studentId} onChange={(event) => { setLoading(true); setReport(null); setStudentId(event.target.value); }}>{children.map((child) => <option key={child.student.id} value={child.student.id}>{child.student.firstName} {child.student.lastName}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">Долоо хоног<select aria-label="Долоо хоног" className="min-h-12 rounded-xl border-2 border-line bg-bg px-3" value={week} onChange={(event) => { setLoading(true); setReport(null); setWeek(event.target.value); }}>{weeks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Button onClick={reloadReport} disabled={loading}>{loading ? "Ачаалж байна" : "Тайлан харах"}</Button>
      </Card>
      {error && <ErrorState message="Тайлан шинэчилж чадсангүй. Дахин оролдоно уу." onRetry={reloadReport} />}
      {loading && report && <LoadingState rows={2} label="Тайлан шинэчилж байна" />}
      {report && <>
        <p className="text-sm font-semibold text-ink-dim">{report.student.firstName} {report.student.lastName} · {report.week.start} – {report.week.end}</p>
        <p className="text-xs text-ink-dim">Мэдээлэл {new Intl.DateTimeFormat("mn-MN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ulaanbaatar" }).format(new Date(report.snapshotAt))} цагийн байдлаар.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm text-ink-dim">Ирц</p><p className="mt-2 text-xl font-extrabold">{report.attendance.present} ирсэн</p><p className="text-sm text-ink-dim">{report.attendance.absent} тасалсан · {report.attendance.excused} чөлөөтэй</p></Card>
          <Card><p className="text-sm text-ink-dim">Тест ба дасгал</p><p className="mt-2 text-xl font-extrabold">{report.tests.length} тест</p><p className="text-sm text-ink-dim">{report.practiceCount} дасгал</p></Card>
          <Card><p className="text-sm text-ink-dim">Даалгаврын явц</p><p className="mt-2 font-extrabold">Даалгавар: {report.homework.assignments.done} хийсэн</p><p className="text-sm text-ink-dim">{report.homework.assignments.notDone} хийгээгүй</p><p className="mt-2 font-bold">Ангийн тэмдэглэгээ: {report.homework.dailyMarks.done} хийсэн</p><p className="text-sm text-ink-dim">{report.homework.dailyMarks.partial} дутуу · {report.homework.dailyMarks.notDone} хийгээгүй</p></Card>
          <Card><p className="text-sm text-ink-dim">Сэдвийн ахиц</p><p className="mt-2 font-bold">Сайн: {report.topics.best?.topic ?? "мэдээлэл алга"}</p><p className="text-sm text-ink-dim">Давтах: {report.topics.weakest?.topic ?? "мэдээлэл алга"}</p>{!report.topics.complete && <p className="mt-2 text-xs text-ink-dim">Эхний {report.topics.sampleLimit?.toLocaleString("mn-MN")} оролдлогод тулгуурлав.</p>}</Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h2 className="mb-3 text-lg font-extrabold">Тест ба дүн</h2>{!report.testResultsComplete && <p className="mb-2 text-sm text-ink-dim">Эхний {report.testResultLimit?.toLocaleString("mn-MN")} бичлэг харуулж байна.</p>}{report.tests.length ? <ul className="divide-y divide-line">{report.tests.map((item, index) => <li key={`${item.title}-${index}`} className="flex justify-between gap-3 py-3"><span>{item.title}</span><strong>{item.score === null || item.maxScore === null ? "Дүн бүртгэгдээгүй" : `${item.score}/${item.maxScore}`}</strong></li>)}</ul> : <p className="text-sm text-ink-dim">Энэ долоо хоногт тест бүртгэгдээгүй.</p>}</Card>
          <Card><h2 className="mb-3 text-lg font-extrabold">Дараа долоо хоногийн хуваарь</h2>{report.nextWeekSchedule.length ? <ul className="divide-y divide-line">{report.nextWeekSchedule.map((item, index) => <li key={`${item.date}-${item.startMinute}-${index}`} className="py-3"><strong>{item.date} · {timeLabel(item.startMinute)}–{timeLabel(item.endMinute)}</strong><p className="text-sm text-ink-dim">{item.classroom}{item.room ? ` · ${item.room}` : ""}</p></li>)}</ul> : <p className="text-sm text-ink-dim">Дараа долоо хоногийн хуваарь бүртгэгдээгүй.</p>}</Card>
        </div>
      </>}
    </div>
  );
}
