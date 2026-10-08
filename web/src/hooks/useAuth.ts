'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { api, getToken, getRole } from '@/lib/api';
import { navigationRole } from '@/lib/navigation-role';

interface User {
  id?: string;
  role?: string;
}

export function useAuth() {
  const token = useSyncExternalStore(() => () => {}, getToken, () => null);
  const role = useSyncExternalStore(() => () => {}, getRole, () => null);
  const [resolved, setResolved] = useState<{ token: string; user: User } | null>(null);

  useEffect(() => {
    if (!token || (role !== 'TEACHER' && role !== 'TEACHER_PLUS')) return;
    let active = true;
    api<{ role: string; externalTeacherProfile?: { verifiedAt: string | null } | null }>('/auth/me')
      .then((me) => { if (active && getToken() === token) setResolved({ token, user: { role: navigationRole(me) } }); })
      .catch(() => {});
    return () => { active = false; };
  }, [token, role]);

  const user: User | null = !token || !role ? null
    : resolved?.token === token ? resolved.user : { role };
  const loading = !!token && (role === 'TEACHER' || role === 'TEACHER_PLUS') && resolved?.token !== token;
  return { user, loading };
}
