import { PageHeader } from '@/components/ui/Surface';
import { ReconcilePageClient } from './ReconcilePageClient';

export const metadata = {
  title: 'Банкны хуулга',
};

export default function ReconcilePage() {
  return (
    <main className="space-y-6 pb-12">
      <PageHeader title="Банкны хуулга" description="Хуулгын гүйлгээг хүүхдийн төлбөр, ном, бусад орлогод хуваарилах" />
      <ReconcilePageClient />
    </main>
  );
}
