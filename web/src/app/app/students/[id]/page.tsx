import StudentProgress from "@/components/students/progress/StudentProgress";

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentProgress studentId={id} />;
}
