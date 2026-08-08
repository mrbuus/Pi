'use client';

import { useEffect, useState } from 'react';
import { getToken, getRole } from '@/lib/api';

interface User {
  id?: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (token && role) {
      setUser({ role });
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
