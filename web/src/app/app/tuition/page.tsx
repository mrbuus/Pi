'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';
import RefundCalculator from '../../../components/tuition/RefundCalculator';
import { PageHeader } from '@/components/ui/Surface';

import { api } from "@/lib/api";
export default function TuitionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    studentId: string,
    classroomId: string,
    leftOn: string,
  ) => {
    setSubmitting(true);
    try {
      // api() нь хүсэлтэд суурь хаяг болон эрхийн толгойг өөрөө нэмнэ.
      const refund = await api<{ id: string }>('/tuition/refund', {
        method: 'POST',
        body: { studentId, classroomId, leftOn },
      });
      router.push(`/app/tuition/refund/${encodeURIComponent(refund.id)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Сургалтын төлбөрийн буцаалт" description="Сурагч ангиас гарах үед суусан хичээлийн өдрөөр тооцоолж, буцаалтын ноорог үүсгэнэ." actions={<Link href="/app/tuition/refunds" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ClipboardList size={17} aria-hidden /> Буцаалтын жагсаалт <ArrowRight size={16} aria-hidden /></Link>} />
      <RefundCalculator onCalculate={() => {}} onSubmit={handleSubmit} loading={submitting} />
    </div>
  );
}
