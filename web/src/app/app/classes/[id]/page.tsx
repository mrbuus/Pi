import ClassDashboardClient from "@/components/classes/ClassDashboardClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Ангийн самбар" };

export default async function ClassDashboardPage({ params }: PageProps) {
  const { id } = await params;
  return <ClassDashboardClient key={id} classroomId={id} />;
}
