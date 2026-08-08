'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, PageHeader, SectionHeader } from '@/components/ui/Surface';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateBlock';
import { Meta } from '@/components/ui/Meta';

interface PendingStudent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  grade: number;
  registeredAt: string;
  hasConfirmedPayment: boolean;
}

/**
 * Онлайнаар CLASSROOM-р бүртгүүлсэн сурагчдын зөвшөөрөл хүлээгч жагсаалт.
 * Эзэн шаардлагагаа: нэр, утас, анги, бүртгүүлсэн огноо, эхний сарын төлбөр CONFIRMED эсэх
 */
export default function PendingApprovalList() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<PendingStudent[]>('/users/students/pending-approval');
      setStudents(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Сурагчдын жагсаалтыг ачаалж чадсангүй';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (studentId: string) => {
    try {
      setApproving(studentId);
      await api(`/users/students/${studentId}/approve`, { method: 'POST' });
      // Баталгаажсан сурагчийг жагсаалтаас хаса
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Баталгаажуулахад алдаа гарсан';
      setError(msg);
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} onRetry={loadStudents} />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="Зөвшөөрөл хүлээгч сурагч байхгүй"
          hint="Онлайнаар CLASSROOM ангид бүртгүүлсэн сурагчид энд гарна"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <SectionHeader title={`Зөвшөөрөл хүлээж буй сурагчид (${students.length})`} />

      <div className="space-y-3">
        {students.map((student) => {
          const registeredDate = new Date(student.registeredAt).toLocaleDateString(
            'mn-MN',
            { year: 'numeric', month: '2-digit', day: '2-digit' },
          );

          return (
            <Card
              key={student.id}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface-interactive transition-colors"
            >
              <div className="flex-1 min-w-0">
                {/* Нэр */}
                <div className="font-medium text-ink truncate">
                  {student.lastName} {student.firstName}
                </div>

                {/* Мета мэдээлэл */}
                <Meta
                  items={[
                    student.phone || '(утас байхгүй)',
                    `${student.grade}-р анги`,
                    `Бүртгүүлсэн: ${registeredDate}`,
                    student.hasConfirmedPayment
                      ? '✅ Төлбөр CONFIRMED'
                      : '⚠️ Төлбөргүй',
                  ]}
                />
              </div>

              {/* Зөвшөөрөх товч */}
              <button
                onClick={() => handleApprove(student.id)}
                disabled={approving === student.id}
                className={`
                  px-4 py-2 rounded font-medium whitespace-nowrap
                  transition-colors
                  ${
                    approving === student.id
                      ? 'bg-brand-soft text-brand-soft cursor-wait'
                      : 'bg-brand text-on-brand hover:bg-brand-bright active:opacity-80'
                  }
                  disabled:opacity-60
                `}
              >
                {approving === student.id ? 'Зөвшөөрч байна...' : 'Зөвшөөрөх'}
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
