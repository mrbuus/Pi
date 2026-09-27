import WeeklyReportClient from "@/components/reports/WeeklyReportClient";

type PageProps = { searchParams: Promise<{ studentId?: string; week?: string }> };
export default async function ParentWeeklyPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const studentId = typeof query.studentId === "string" ? query.studentId : "";
  const week = typeof query.week === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(query.week) ? query.week : "";
  return <WeeklyReportClient initialStudentId={studentId} initialWeek={week} />;
}
