'use client';

import { Card } from '../ui/Surface';
import { SkeletonLine } from '../ui/Skeleton';

interface TestResult {
  id: string;
  testTitle: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  createdAt: string;
}

interface GroupMember {
  id: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  joinedAt: string;
  testResults: TestResult[];
}

interface GroupMembersCardProps {
  members: GroupMember[] | undefined;
  isLoading?: boolean;
  onRemoveStudent?: (studentId: string) => Promise<void>;
}

export function GroupMembersCard({
  members,
  isLoading = false,
  onRemoveStudent,
}: GroupMembersCardProps) {
  if (isLoading) {
    return (
      <Card>
        <SkeletonLine height={40} className="mb-4" />
        <SkeletonLine height={80} className="mb-3" />
        <SkeletonLine height={80} />
      </Card>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <p className="text-center text-ink-dim py-8">
          Энэ ангийн бүлэгт сурагч байхгүй байна
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {member.student.firstName} {member.student.lastName}
              </div>
              <div className="text-xs text-ink-dim mt-1">
                Нэгдсэн: {new Date(member.joinedAt).toLocaleDateString('mn-MN')}
              </div>

              {member.testResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-ink-dim">Шалгалтын дүнгүүд:</div>
                  {member.testResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex justify-between items-center text-xs bg-bg p-2 rounded"
                    >
                      <span className="truncate">{result.testTitle}</span>
                      <span className="font-medium ml-2">
                        {result.totalScore}/{result.maxScore}
                        <span className="text-ink-dim ml-1">
                          ({Math.round(result.percentage)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {onRemoveStudent && (
              <button
                onClick={() => onRemoveStudent(member.student.id)}
                className="text-xs px-2 py-1 text-error hover:bg-red-50 rounded transition"
              >
                Хасах
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
