'use client';

import { useState } from 'react';
import { Card } from '../ui/Surface';
import { Copy, Check } from 'lucide-react';

interface JoinGroupCardProps {
  joinCode: string;
  groupName: string;
}

export function JoinGroupCard({ joinCode, groupName }: JoinGroupCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-ink-dim mb-2">Join кодыг хуваалцах</h3>

      <div className="flex gap-2 items-center">
        <div className="flex-1 px-3 py-2 bg-panel rounded font-mono text-lg font-bold tracking-wide">
          {joinCode}
        </div>
        <button
          onClick={handleCopy}
          className="p-2 bg-panel hover:bg-panel rounded transition"
          title="Копи хийх"
        >
          {copied ? (
            <Check size={20} className="text-success" />
          ) : (
            <Copy size={20} className="text-ink-dim" />
          )}
        </button>
      </div>

      <p className="text-xs text-ink-dim mt-2">
        Сурагчид энэ кодоор "{groupName}" ангийн бүлэгт нэгдэнэ.
      </p>
    </Card>
  );
}
