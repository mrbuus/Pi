"use client";
import AttachmentPreview from "./AttachmentPreview";
import { StatusBadge } from "./StatusBadge";
import { formatMnDateTime } from "@/lib/dateMn";

export interface SubmissionRevision {
  id: string;
  action: string;
  state: string;
  studentNote?: string | null;
  reviewNote?: string | null;
  legacyNote?: string | null;
  imageKeys: string[];
  at: string;
}
export interface SubmissionRecordData {
  state: string;
  note?: string | null;
  studentNote?: string | null;
  reviewNote?: string | null;
  imageKeys?: string[];
  submittedAt?: string | null;
  checkedAt?: string | null;
  revisions?: SubmissionRevision[];
}
const dateLabel = (value: string) =>
  formatMnDateTime(value, { timeZone: "Asia/Ulaanbaatar" });
export default function SubmissionRecord({
  submission,
}: {
  submission: SubmissionRecordData;
}) {
  const legacy =
    submission.studentNote == null &&
    submission.reviewNote == null &&
    submission.note;
  return (
    <div className="space-y-3 text-sm">
      {submission.studentNote && (
        <div>
          <p className="font-semibold">Сурагчийн тайлбар</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-ink-dim">
            {submission.studentNote}
          </p>
        </div>
      )}
      {submission.reviewNote && (
        <div className="rounded-lg border border-line bg-panel p-3">
          <p className="font-semibold">Багшийн үнэлгээ, зөвлөмж</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-ink-dim">
            {submission.reviewNote}
          </p>
        </div>
      )}
      {legacy && (
        <div>
          <p className="font-semibold">Өмнөх тэмдэглэл</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-ink-dim">
            {submission.note}
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            Энэ хуучин тэмдэглэлд сурагчийн тайлбар, багшийн зөвлөмж тусдаа
            хадгалагдаагүй.
          </p>
        </div>
      )}
      {!!submission.imageKeys?.length && (
        <div>
          <p className="mb-2 font-semibold">Сурагчийн илгээсэн хавсралт</p>
          <div className="flex flex-wrap gap-3">
            {submission.imageKeys.map((key, i) => (
              <AttachmentPreview
                key={key}
                fileKey={key}
                label={`Илгээсэн хавсралт ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1 text-xs text-ink-dim">
        {submission.submittedAt && (
          <p>Илгээсэн: {dateLabel(submission.submittedAt)}</p>
        )}
        {submission.checkedAt && (
          <p>Багш шалгасан: {dateLabel(submission.checkedAt)}</p>
        )}
        {submission.state === "SUBMITTED" && <p>Багш шалгахыг хүлээж байна.</p>}
      </div>
      {!!submission.revisions?.length && (
        <details className="rounded-lg border border-line">
          <summary className="min-h-11 cursor-pointer px-3 py-3 font-semibold">
            Илгээлт, шалгалтын түүх ({submission.revisions.length})
          </summary>
          <ol className="space-y-4 border-t border-line p-3">
            {[...submission.revisions].reverse().map((rev) => (
              <li key={rev.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge state={rev.state} />
                  <span className="text-xs text-ink-dim">
                    {dateLabel(rev.at)}
                  </span>
                </div>
                {rev.studentNote && (
                  <p className="whitespace-pre-wrap break-words">
                    Сурагч: {rev.studentNote}
                  </p>
                )}
                {rev.reviewNote && (
                  <p className="whitespace-pre-wrap break-words">
                    Багш: {rev.reviewNote}
                  </p>
                )}
                {rev.legacyNote && (
                  <p className="whitespace-pre-wrap break-words text-ink-dim">
                    Өмнөх тэмдэглэл: {rev.legacyNote}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {rev.imageKeys.map((key, i) => (
                    <AttachmentPreview
                      key={key}
                      fileKey={key}
                      label={`Түүхэн хавсралт ${i + 1}`}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
