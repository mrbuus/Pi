'use client';

import { useCallback } from 'react';
import { ErrorState } from '@/components/ui/StateBlock';
import { GroupsList } from '../../../components/groups/GroupsList';
import { CreateGroupForm } from '../../../components/groups/CreateGroupForm';
import { JoinGroupForm } from '../../../components/groups/JoinGroupForm';
import { useAsyncSection } from "@/components/students/progress/useSection";
import { api } from '@/lib/api';

interface Group {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  createdAt: string;
}

interface Me {
  role: string;
}

export default function GroupsPage() {
  const fetchGroups = useCallback(async () => {
    const [me, groups] = await Promise.all([api<Me>("/auth/me"), api<Group[]>("/teacher-groups/my-groups")]);
    return { me, groups };
  }, []);
  const { data, status, error, reload: fetchUserAndGroups } = useAsyncSection("my-groups", fetchGroups, null as { me: Me; groups: Group[] } | null);
  const groups = data?.groups;
  const isTeacher = data?.me.role === "TEACHER" || data?.me.role === "TEACHER_PLUS";
  const isLoading = status === "loading";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">
        {isTeacher ? 'Ангийн бүлгүүд' : 'Нэгдсэн ангийн бүлгүүд'}
      </h1>

      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={() => void fetchUserAndGroups()} />
        </div>
      )}

      <div className="mb-6 flex gap-3">
        {isTeacher && <CreateGroupForm onSuccess={fetchUserAndGroups} />}
        {!isTeacher && <JoinGroupForm onSuccess={fetchUserAndGroups} />}
      </div>

      {isTeacher ? (
        <>
          <h2 className="text-lg font-semibold mb-4">Миний ангийн бүлгүүд</h2>
          <GroupsList groups={groups} isLoading={isLoading} />
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-4">Нэгдсэн бүлгүүд</h2>
          <GroupsList groups={groups} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}
