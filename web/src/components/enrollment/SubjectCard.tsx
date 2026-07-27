import {
  AVAILABILITY_OPTIONS,
  availabilityBtnCls,
  EnrollmentStatus,
  EnrollmentSubject,
  EnrollmentWindow,
  STATUS_BADGE_CLS,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_OPTIONS,
  statusBtnCls,
  SUBJECT_LABEL,
  SubjectAvailability,
} from "./types";
import VisitorPreview from "./VisitorPreview";

export interface DraftState {
  status: EnrollmentStatus;
  availability: SubjectAvailability;
  note: string;
}

interface SubjectCardProps {
  subject: EnrollmentSubject;
  saved: EnrollmentWindow;
  draft: DraftState;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  onDraftChange: (patch: Partial<DraftState>) => void;
  onSave: () => void;
  onDiscard: () => void;
}

// Хичээл тус бүрийн карт: одоо АМЬДРАЛ дээр харагдаж буй төлөв (badge) +
// ноорог (draft) хянагч + зочны урьдчилсан харагдац + хадгалах/цуцлах.
// Багш+/Админ энд өөрсдөө хичээл БҮРийг БИЕ ДААН нээж/хааж чадна.
export default function SubjectCard({
  subject,
  saved,
  draft,
  dirty,
  saving,
  saveError,
  onDraftChange,
  onSave,
  onDiscard,
}: SubjectCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{SUBJECT_LABEL[subject]}</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLS[saved.status]}`}
          title="Одоо сайт дээр харагдаж буй төлөв"
        >
          <span aria-hidden>{STATUS_ICON[saved.status]}</span>
          {STATUS_LABEL[saved.status]}
        </span>
      </div>

      <div>
        <span
          id={`status-label-${subject}`}
          className="mb-1.5 block text-xs font-semibold text-ink-dim"
        >
          Элсэлтийн төлөв
        </span>
        <div
          role="group"
          aria-labelledby={`status-label-${subject}`}
          className="flex flex-wrap gap-1.5"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.v}
              type="button"
              aria-pressed={draft.status === opt.v}
              disabled={saving}
              onClick={() => onDraftChange({ status: opt.v })}
              className={statusBtnCls(draft.status === opt.v, opt.v)}
            >
              {opt.t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span
          id={`avail-label-${subject}`}
          className="mb-1.5 block text-xs font-semibold text-ink-dim"
        >
          Хамрах хэлбэр
        </span>
        <div
          role="group"
          aria-labelledby={`avail-label-${subject}`}
          className="flex flex-wrap gap-1.5"
        >
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.v}
              type="button"
              aria-pressed={draft.availability === opt.v}
              disabled={saving}
              onClick={() => onDraftChange({ availability: opt.v })}
              className={availabilityBtnCls(draft.availability === opt.v)}
            >
              {opt.t}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5" htmlFor={`note-${subject}`}>
        <span className="text-xs font-semibold text-ink-dim">
          Зочдод харуулах тэмдэглэл (заавал биш)
        </span>
        <textarea
          id={`note-${subject}`}
          value={draft.note}
          disabled={saving}
          maxLength={500}
          rows={2}
          onChange={(e) => onDraftChange({ note: e.target.value })}
          placeholder="Жишээ: 12-р ангийн бүлэг дүүрсэн, 9-11-р анги нээлттэй"
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
        />
      </label>

      <div className="rounded-xl border border-dashed border-line bg-panel p-3">
        <p className="text-xs font-semibold text-ink-dim">
          👁 Зочин юу харах вэ (ноорог дээр үндэслэв)
        </p>
        <div className="mt-2">
          <VisitorPreview
            subject={subject}
            status={draft.status}
            availability={draft.availability}
            note={draft.note}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="min-w-0 text-xs">
          {dirty && !saveError && (
            <span className="text-warning">Хадгалаагүй өөрчлөлт бий</span>
          )}
          {saveError && (
            <span className="text-error">⚠ {saveError}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {dirty && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
            >
              Цуцлах
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="rounded-lg bg-brand-bright px-4 py-2.5 text-sm font-bold text-on-brand transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
