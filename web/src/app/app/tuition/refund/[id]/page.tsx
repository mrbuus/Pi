import RefundDetail from '@/components/tuition/RefundDetail';

export default async function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RefundDetail refundId={id} />;
}
