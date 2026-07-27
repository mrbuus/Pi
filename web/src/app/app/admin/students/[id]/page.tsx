import StudentDetail from "@/components/students/StudentDetail";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentDetail studentId={id} />;
}
