"use client";

interface UnassignedStudent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentProfile?: { grade?: number };
}

interface UnassignedStudentsSectionProps {
  unassigned: UnassignedStudent[];
  onEnroll: (studentId: string) => void;
}

/**
 * Ангид ороогүй сурагчдыг харуулж, энэ ангид оруулах үйлдэл хийнэ.
 * Зөвхөн ADMIN/TEACHER_PLUS эрхтэй хэрэглэгч харж болно.
 */
export default function UnassignedStudentsSection({
  unassigned,
  onEnroll,
}: UnassignedStudentsSectionProps) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
      <h2 className="mb-4 font-bold text-brand-soft">Ангид ороогүй сурагчид</h2>

      {unassigned.length === 0 ? (
        <p className="text-sm text-ink-dim">Хүлээгдэж буй сурагч алга</p>
      ) : (
        <div className="space-y-2">
          {unassigned.map((student) => (
            <div
              key={student.id}
              className="flex flex-col gap-3 rounded-lg border border-white/8 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-2"
            >
              {/* Student Info */}
              <div className="text-sm">
                <p className="font-medium">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-ink-dim">
                  {student.phone}
                  {student.studentProfile?.grade &&
                    ` · ${student.studentProfile.grade}-р анги`}
                </p>
              </div>

              {/* Enroll Button */}
              <button
                onClick={() => onEnroll(student.id)}
                className="rounded-lg bg-brand-bright px-4 py-2 text-xs font-bold transition hover:bg-brand-bright/90 md:whitespace-nowrap"
              >
                Энэ ангид оруулах
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
