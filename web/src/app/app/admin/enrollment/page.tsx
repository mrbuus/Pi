'use client';

import { useState } from 'react';
import EnrollmentClient from '@/components/enrollment/EnrollmentClient';
import PendingApprovalList from '@/components/enrollment/PendingApprovalList';

type Tab = 'windows' | 'approval';

export default function EnrollmentAdminPage() {
  const [tab, setTab] = useState<Tab>('windows');

  return (
    <div className="min-h-screen bg-bg">
      {/* Табын төрлүүд */}
      <div className="border-b border-line">
        <div className="max-w-4xl mx-auto">
          <div className="flex">
            <button
              onClick={() => setTab('windows')}
              className={`
                px-4 py-3 font-medium border-b-2 transition-colors
                ${
                  tab === 'windows'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-dim hover:text-ink'
                }
              `}
            >
              Элсэлтийн цонхо
            </button>
            <button
              onClick={() => setTab('approval')}
              className={`
                px-4 py-3 font-medium border-b-2 transition-colors
                ${
                  tab === 'approval'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-dim hover:text-ink'
                }
              `}
            >
              Зөвшөөрөл хүлээгч
            </button>
          </div>
        </div>
      </div>

      {/* Табын агуулга */}
      <div className="max-w-4xl mx-auto">
        {tab === 'windows' && <EnrollmentClient />}
        {tab === 'approval' && <PendingApprovalList />}
      </div>
    </div>
  );
}
