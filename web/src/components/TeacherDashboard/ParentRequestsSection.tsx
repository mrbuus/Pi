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
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
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
              className="rounded-lg border border-white/8 p-4"
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
                <div className="rounded-lg bg-white/5 px-3 py-2 text-sm">
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
                    className="rounded bg-teal-400/20 px-4 py-2 text-xs font-bold text-teal-200 transition hover:bg-teal-400/30"
                  >
                    Батлах
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    className="rounded bg-red-400/20 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-400/30"
                  >
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
