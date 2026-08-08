'use client';

import { useState } from 'react';
import { Card } from '../ui/Surface';
import InfoHint from '../ui/InfoHint';
import { api } from '@/lib/api';

interface JoinGroupFormProps {
  onSuccess: () => void;
}

export function JoinGroupForm({ onSuccess }: JoinGroupFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api('/teacher-groups/join', {
        method: 'POST',
        body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
      });

      setJoinCode('');
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Ангийн бүлэгт нэгдэх үед алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-success text-white rounded font-medium hover:bg-success"
      >
        Ангийн бүлэгт нэгдэх
      </button>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold mb-3">Ангийн бүлэгт нэгдэх</h2>

      <InfoHint>
        Багш өгөх join code-оо оруулж ангийн бүлэгт нэгд.
      </InfoHint>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium mb-1">Join код</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
            placeholder="Жишээ: ABC1234"
            maxLength={8}
            className="w-full px-3 py-2 border border-line rounded font-mono text-lg tracking-widest"
          />
        </div>

        {error && (
          <div className="p-3 border border-error/30 bg-error/10 rounded text-error text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2 bg-success text-white rounded font-medium hover:bg-success disabled:opacity-50"
          >
            {isLoading ? 'Нэгдэж байна...' : 'Нэгдэх'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setJoinCode('');
              setError(null);
            }}
            className="flex-1 py-2 bg-panel text-ink-dim rounded font-medium hover:bg-panel"
          >
            Болих
          </button>
        </div>
      </form>
    </Card>
  );
}
