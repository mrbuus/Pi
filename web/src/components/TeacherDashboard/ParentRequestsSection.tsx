"use client";

interface ParentRequest {
  id: string;
  parent: { firstName: string; lastName: string; phone: string };
  student: {
    firstName: string;
    lastName: string;
    phone: string;
    studentProfile?: { grade?: number };
  };
}

interface ParentRequestsSectionProps {
  parentRequests: ParentRequest[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}

import { Check, X } from "lucide-react";

/**
 * Эцэг эхийн холболтын хүсэлтүүдийг батлах эсвэл цуцлах.
 * Зөвхөн ADMIN/TEACHER_PLUS эрхтэй хэрэглэгч үйлдэл хийж болно.
 */
export default function ParentRequestsSection({
  parentRequests,
  onVerify,
  onReject,
}: ParentRequestsSectionProps) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <h2 className="mb-4 font-bold text-brand-soft">
        Эцэг эхийн холболтын хүсэлт
      </h2>

      {parentRequests.length === 0 ? (
        <p className="text-sm text-ink-dim">Хүлээгдэж буй хүсэлт алга</p>
      ) : (
        <div className="space-y-3">
          {parentRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-line p-4"
            >
              <div className="flex flex-col gap-3 md:gap-4">
                {/* Parent Info */}
                <div className="text-sm">
                  <p className="font-semibold">
                    {request.parent.firstName} {request.parent.lastName}
                  </p>
                  <p className="text-xs text-ink-dim">{request.parent.phone}</p>
                </div>

                {/* Student Info */}
                <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm">
                  <p className="text-xs text-ink-dim mb-1">Хүүхэд:</p>
                  <p className="font-medium">
                    {request.student.firstName} {request.student.lastName}
                  </p>
                  <p className="text-xs text-ink-dim">
                    {request.student.phone}
                    {request.student.studentProfile?.grade &&
                      ` · ${request.student.studentProfile.grade}-р анги`}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onVerify(request.id)}
                    className="inline-flex items-center gap-1 rounded bg-success/20 px-4 py-2 text-xs font-bold text-success transition hover:bg-success/30"
                  >
                    <Check className="h-3 w-3" aria-hidden />
                    Батлах
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    className="inline-flex items-center gap-1 rounded bg-error/20 px-4 py-2 text-xs font-bold text-error transition hover:bg-error/30"
                  >
                    <X className="h-3 w-3" aria-hidden />
                    Цуцлах
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
