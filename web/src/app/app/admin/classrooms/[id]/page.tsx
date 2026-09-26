import ClassroomDetailClient from '../ClassroomDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Ангийн дэлгэрэнгүй' };

export default async function ClassroomDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ClassroomDetailClient classroomId={id} />;
}
