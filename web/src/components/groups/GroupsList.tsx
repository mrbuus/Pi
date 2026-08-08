'use client';

import { Card } from '../ui/Surface';
import { SkeletonLine } from '../ui/Skeleton';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  createdAt: string;
}

interface GroupsListProps {
  groups: Group[] | undefined;
  isLoading?: boolean;
}

export function GroupsList({ groups, isLoading = false }: GroupsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <SkeletonLine height={60} />
          </Card>
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <Card>
        <p className="text-center text-ink-dim py-8">
          Өнөө хүртэл ангийн бүлэг үүсгээгүй байна
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Link key={group.id} href={`/app/groups/${group.id}`}>
          <Card className="hover:bg-bg cursor-pointer transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium">{group.name}</h3>
                <div className="flex gap-4 mt-2 text-xs text-ink-dim">
                  <span>Сурагч: {group.memberCount}</span>
                  <span>
                    {new Date(group.createdAt).toLocaleDateString('mn-MN')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold bg-panel px-2 py-1 rounded">
                  {group.joinCode}
                </div>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
