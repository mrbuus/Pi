import {
  AVAILABILITY_LABEL,
  EnrollmentStatus,
  EnrollmentSubject,
  STATUS_BADGE_CLS,
  STATUS_ICON,
  STATUS_LABEL,
  SUBJECT_LABEL,
  SubjectAvailability,
} from "./types";

interface VisitorPreviewProps {
  subject: EnrollmentSubject;
  status: EnrollmentStatus;
  availability: SubjectAvailability;
  note: string;
}

// Нүүр хуудсан дээр зочин юу харахыг ойролцоогоор дуурайлгана — ажилтан
// товч дарахаасаа ӨМНӨ үр дагаврыг харах ёстой тул энэ бол ХАДГАЛААГҮЙ
// ноорог (draft) утгаас шууд дүрслэгдэнэ, серверийн хадгалагдсан утгаас биш.
export default function VisitorPreview({
  subject,
  status,
  availability,
  note,
}: VisitorPreviewProps) {
  const trimmedNote = note.trim();
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-ink">{SUBJECT_LABEL[subject]}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLS[status]}`}
        >
          <span aria-hidden>{STATUS_ICON[status]}</span>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-ink-dim">
        {status === "CLOSED"
          ? "Одоогоор шинэ элсэлт авахгүй байна."
          : status === "COMING_SOON"
            ? "Тун удахгүй элсэлт эхэлнэ."
            : `Хамрах хэлбэр: ${AVAILABILITY_LABEL[availability]}`}
      </p>
      {trimmedNote && (
        <p className="text-xs italic text-ink-dim">„{trimmedNote}”</p>
      )}
    </div>
  );
}
