'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { JoinGroupCard } from '../../../../components/groups/JoinGroupCard';
import { GroupMembersCard } from '../../../../components/groups/GroupMembersCard';
import { Card } from '../../../../components/ui/Surface';
import { LoadingState, ErrorState, EmptyState } from '../../../../components/ui/StateBlock';
import { api } from '@/lib/api';

interface GroupDetails {
  id: string;
  name: string;
  joinCode: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
  members: any[];
  createdAt: string;
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupDetails>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api<GroupDetails>(`/teacher-groups/${groupId}`);
      setGroup(data);
    } catch (err: any) {
      setError(err.message || 'Бүлэгийн мэдээлэл авахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Энэ сурагчийг бүлгээс хасах уу?')) {
      return;
    }

    setRemoveError(null);
    try {
      await api(`/teacher-groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      });
      setRemoveError(null);
      fetchGroupDetails();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Сурагчийг хасахад алдаа гарлаа';
      setRemoveError(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <LoadingState rows={5} label="Бүлгийн мэдээлэл ачаалж байна" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ErrorState
          message={error || 'Бүлэг олдсонгүй'}
          onRetry={fetchGroupDetails}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
        <p className="text-sm text-ink-dim">
          Багш: {group.owner.firstName} {group.owner.lastName}
        </p>
      </div>

      <div className="mb-6">
        <JoinGroupCard joinCode={group.joinCode} groupName={group.name} />
      </div>

      {removeError && (
        <div className="mb-6">
          <ErrorState
            message={removeError}
            onRetry={() => setRemoveError(null)}
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Ангийн сурагчид ({group.members.length})
        </h2>
        <GroupMembersCard
          members={group.members}
          onRemoveStudent={handleRemoveStudent}
        />
      </div>
    </div>
  );
}
