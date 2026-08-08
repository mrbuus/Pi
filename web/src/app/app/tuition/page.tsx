'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RefundCalculator from '../../../components/tuition/RefundCalculator';

import { api } from "@/lib/api";
export default function TuitionPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (
    studentId: string,
    classroomId: string,
    leftOn: string
  ) => {
    setSubmitting(true);
    try {
      // api() нь суурь хаяг, эрхийн толгой, алдааны монгол мессежийг өөрөө
      // зохицуулна. Түүхий fetch("/api/…") нь прод дээр 404 болно.
      const refund = await api<{ id: string }>('/tuition/refund', {
        method: 'POST',
        body: { studentId, classroomId, leftOn },
      });
      router.push(`/app/tuition/refund/${refund.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-ink mb-2">
          Сургалтын төлбөрийн буцаалт
        </h1>
        <p className="text-ink-dim mb-8">
          Сурагч ангиас гарах үед суусан өдрөөр нарийн тооцоолж буцаалт хийнэ.
        </p>

        <RefundCalculator
          onCalculate={() => {}}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>
    </div>
  );
}
