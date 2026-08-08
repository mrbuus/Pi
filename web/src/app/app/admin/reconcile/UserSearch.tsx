'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { X } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface UserSearchProps {
  selectedUser: { id: string; name: string } | null;
  onUserSelect: (user: { id: string; name: string } | null) => void;
}

export function UserSearch({
  selectedUser,
  onUserSelect,
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api<{ items: User[] }>(`/users/search?q=${encodeURIComponent(query)}&limit=10`, {
          method: 'GET',
        });

        setResults(response.items || []);
        setShowResults(true);
      } catch (err: any) {
        setError(err?.message || 'Хайлт амжилтгүй');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {selectedUser ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-info/10 border border-info rounded">
          <div className="flex-1">
            <p className="text-sm font-medium text-info">{selectedUser.name}</p>
          </div>
          <button
            onClick={() => onUserSelect(null)}
            className="text-info hover:bg-info/20 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Нэр, утас эсвэл имэйлээр хайх…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            className="w-full px-3 py-2 border border-line rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />

          {loading && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin">⏳</div>
            </div>
          )}

          {error && (
            <p className="text-xs text-error mt-1">{error}</p>
          )}

          {showResults && results.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-panel border border-line rounded shadow-lg z-10 max-h-64 overflow-y-auto">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onUserSelect({
                      id: user.id,
                      name: `${user.firstName} ${user.lastName}`,
                    });
                    setQuery('');
                    setShowResults(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface border-b border-line/50 last:border-b-0 transition"
                >
                  <p className="text-sm font-medium text-ink">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-ink-dim font-mono">
                    {user.phone}
                  </p>
                </button>
              ))}
            </div>
          )}

          {showResults && results.length === 0 && !loading && query.length >= 2 && (
            <div className="absolute top-full mt-1 w-full bg-panel border border-line rounded p-3 text-center text-sm text-ink-dim">
              Сурагч олдсонгүй
            </div>
          )}
        </div>
      )}
    </div>
  );
}
