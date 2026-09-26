import RefundDetail from '@/components/tuition/RefundDetail';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ joinedOn?: string | string[] }>;
}

export default async function RefundDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const joinedOn = typeof query.joinedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.joinedOn)
    ? query.joinedOn
    : undefined;
  return <RefundDetail refundId={id} joinedOn={joinedOn} />;
}
