import { PageHeader } from '@/components/ui/Surface';
import { ReconcilePageClient } from './ReconcilePageClient';

export const metadata = {
  title: 'Банкны тулгалт',
};

export default function ReconcilePage() {
  return (
    <main className="space-y-6 pb-12">
      <PageHeader
        title="Банкны тулгалт"
        description="Банкны гүйлгээг сурагчтай холбоод удирдах"
      />
      <ReconcilePageClient />
    </main>
  );
}
