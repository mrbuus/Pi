'use client';

import { useState } from 'react';
import { Card } from '../ui/Surface';
import InfoHint from '../ui/InfoHint';
import { api } from '@/lib/api';

interface CreateGroupFormProps {
  onSuccess: () => void;
}

export function CreateGroupForm({ onSuccess }: CreateGroupFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api('/teacher-groups/create', {
        method: 'POST',
        body: JSON.stringify({ name: groupName }),
      });

      setGroupName('');
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Ангийн бүлэг үүсгэх үед алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
      >
        Шинэ ангийн бүлэг үүсгэх
      </button>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold mb-3">Шинэ ангийн бүлэг үүсгэх</h2>

      <InfoHint>
        Ангийн бүлэг үүсгэсний дараа сурагчдыг join code-оор нэгдүүлнэ.
      </InfoHint>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ангийн бүлгийн нэр</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            placeholder="Жишээ: 12-2 анги"
            className="w-full px-3 py-2 border border-line rounded"
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
            className="flex-1 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Үүсгэж байна...' : 'Үүсгэх'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setGroupName('');
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
