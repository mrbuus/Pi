'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/StateBlock';
import { GroupsList } from '../../../components/groups/GroupsList';
import { CreateGroupForm } from '../../../components/groups/CreateGroupForm';
import { JoinGroupForm } from '../../../components/groups/JoinGroupForm';
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
  const [groups, setGroups] = useState<Group[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Алдааг зөвхөн console руу бичих нь хэрэглэгчийн хувьд «мөнхөд ачаалж
  // байна» гэсэн үр дүн өгнө (DESIGN.md §4 — алдаа гарвал монголоор мессеж
  // + «Дахин оролдох» товч ЗААВАЛ байх ёстой).
  const fetchUserAndGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const me = await api<Me>("/auth/me");
      setIsTeacher(me.role === "TEACHER" || me.role === "TEACHER_PLUS");
      setGroups(await api<Group[]>("/teacher-groups/my-groups"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUserAndGroups();
  }, [fetchUserAndGroups]);

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
