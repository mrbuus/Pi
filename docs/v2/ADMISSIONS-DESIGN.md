# Classroom admissions: additive design, not implemented

Reviewed 2026-10-07 in `pi.mnv2` only. This document is an implementation proposal grounded in the current source, not evidence that the requested admissions workflow works. No authentication, schema, approval, enrollment, or contract code was changed for this design. Existing pupils must retain their current access.

## Required journey and current gaps

The requested journey is **public course introduction → level test → mandatory photographs/PDF of written work → teacher review and call → one or two trial visits → contract later**. Receipt confirmation, a test score, and a trial visit are each separate facts; none alone means enrollment or a signed contract.

| Stage | Existing source and behavior | Required addition |
| --- | --- | --- |
| Course introduction | Landing `HowItWorks.tsx`; anonymous `GET /enrollment-windows` exposes subject status, availability and an authored note. `Lead` records contact interest and staff NEW/CONTACTED/ENROLLED/LOST status. | Reviewed course introduction and explicit admissions entry. EnrollmentWindow contains no schedule or fee. Show only supplied information; unavailable details require staff contact, not invented dates/prices. |
| Applicant identity | Public registration produces BUYER, PARENT or STUDENT. CLASSROOM registration requires the teacher's daily activation code, then sets `activatedAt` and `approvalPending`. | An account-bound application before classroom activation. Recommend existing BUYER account for an adult applicant rather than adding a role. Guardian-owned minor applications need an explicit child-identity policy. |
| Level test | Tests controller requires JWT. Start permits STUDENT/BUYER with access checks. `TestAttemptSession` is unique per test/student, and submission writes official results/attempts. No public placement purpose exists. | Approved placement version and separate application attempt; do not write official TestResult/ranking records. |
| Written work | LessonFlow receipts already validate owned image/PDF uploads, classroom/day access and retry UUIDs. | Separate admissions evidence tied to application/attempt. An unenrolled applicant cannot use a class/day receipt. |
| Review/call | Leads can be marked CONTACTED. Pupil approval records staff/time but has no placement, evidence, call, trial or contract gate. | Assigned reviewer queue, visible assessment, separate private staff notes, actual call outcome. |
| Trial visits | No dedicated admissions trial-visit record found. | One or two individually scheduled/attended visits, without granting normal Enrollment or treating a planned visit as attendance. |
| Contract/enrollment | No admissions contract artifact or prerequisite enforcement found. | Explicit later contract milestone and staff finalization policy. Payment state is not a contract or proof of educational suitability. |

Relevant inspected files: `api/src/auth/auth.service.ts`, `api/src/users/users.service.ts`, `api/src/tests/tests.controller.ts`, `api/src/tests/tests.service.ts`, `api/src/lesson-flow/lesson-flow.controller.ts`, `api/src/lesson-flow/lesson-flow.service.ts`, `api/src/leads/leads.controller.ts`, `api/prisma/schema.prisma`, and `web/src/components/landing/HowItWorks.tsx`.

Approval inventory also found `getPendingApprovalStudents().hasConfirmedPayment` counts REVERSED as CONFIRMED and inspects only the latest payment for a month. This can mislabel reversed or mixed payment history; it is not a safe admission prerequisite. Reported to root for the owned users/finance integration. The inspected month calculation uses server local time, which also needs review against the established UB month helpers.

## Smallest durable model proposal

Names and limits below are proposed contracts, not migrations. Use additive tables, user foreign keys with Restrict, archival/withdrawal instead of cascading removal, immutable evidence/assessment history, and explicit actor IDs from JWT.

| Record | Minimum fields and constraints |
| --- | --- |
| AdmissionApplication | `id`, `applicantUserId`, `clientRequestId`, normalized request hash; `subject`, requested grade, applicant name/contact snapshot, optional guardian identity/relationship fields subject to policy; `state`, `assignedReviewerId?`, `revision`, `createdAt`, `updatedAt`, `closedAt?`, closure reason, `enrolledStudentId?`, `enrollmentId?`. Unique applicant/request UUID. Do not accept an arbitrary existing child user ID as ownership proof. |
| AdmissionPlacementVersion | `id`, subject/grade scope, version, draft/published/retired state, reviewed source provenance, reviewer/time, authored instructions, time limit, supported answer/grading policy and frozen question/key snapshots. Optional source `Test.id`; only explicitly approved definitions become admission material. Publication freezes the version; retirement does not change existing attempts. |
| AdmissionAttempt | `id`, application/version IDs, per-start UUID/hash, attempt ordinal, `startedAt`, server `deadlineAt`, status, persisted answer drafts, `submittedAt?`, immutable first submitted answers, automatic score where valid. Keys remain server-only. No official TestResult, StudyReviewRun or ranking writes. Separate attempts retain previous work. |
| AdmissionEvidence | `id`, application/attempt IDs, author ID, request UUID/hash, ordered owned `fileKeys`, optional pupil note, `submittedAt`. Append-only revisions; replay identical payload returns the same receipt, conflicting reuse returns 409. At least one real permitted image/PDF is mandatory before review submission. |
| AdmissionEvent | `id`, application ID, actor ID, event type, timestamp, request UUID/hash, typed payload. Append-only review outcomes/visible assessment, separately protected private notes, actual call outcome (`REACHED`, `NO_ANSWER`, `CALLBACK_REQUESTED`), withdrawal and state transitions. Do not expose all event JSON through applicant projections. |
| AdmissionTrialVisit | `id`, application ID, ordinal 1/2, staff-selected class/location reference, planned timestamp, scheduling actor, attendance status (`PLANNED`, `ATTENDED`, `MISSED`, `CANCELLED`), recorded actor/time, visible note. Unique application/ordinal; reschedule events preserve prior plans. No invented schedule or capacity. |
| Contract milestone | Until an actual template/signing process is agreed, record only pending/offered/acknowledged facts as events. Do not label acknowledgment “signed”. A real contract later needs template version, consenting parties, evidence/artifact reference, signed timestamps and authorization policy. |

Suggested application states: DRAFT, READY_FOR_REVIEW, REVIEWING, TRIAL, OFFERED, CONTRACT_PENDING, ENROLLED, CLOSED. Test completion, evidence receipt, call and visit counts are independent milestones rather than misleading state shortcuts. Applicant sees a short next-action summary and expandable history. Staff transition checks must be server enforced and concurrency protected using `revision` plus transaction/lock; clients cannot freely PATCH state.

## Proposed API and screens

These routes do not exist yet. The existing anonymous Lead endpoint can remain a separate contact option; it must not be relabeled as a complete admission application.

- Public `/courses` or a landing course section reads actual EnrollmentWindow and reviewed introductions; `GET /admissions/catalog` returns published placement availability/instructions only, without pupil data or keys.
- `/app/admissions/new` creates/resumes an owned draft with `POST /admissions` (UUID before request). `/app/admissions/[id]` uses own GET/list endpoints and shows the next required step, saved drafts, receipt timestamps and visible staff outcomes.
- `POST /admissions/:id/attempts` freezes the selected approved version and server deadline. Draft-answer save and submission routes operate on this attempt. Reload never resets its deadline; expired tests preserve drafts and explain the configured next step.
- Evidence POST accepts owned existing upload keys. Review submission rejects missing/invalid evidence. Reuse actual storage ownership/MIME/byte-count validation, mobile image/PDF preview, retry and stable UUID patterns; choose and document limits before coding. LessonFlow currently uses at most 10 files, 10 MB each, while general uploads allow 25 MB: these are different existing limits, not an agreed admissions policy.
- `/app/admissions/review` is an assigned staff queue. Explicit review, call-log, trial-schedule, trial-attendance, offer and finalize commands use optimistic revision checks and idempotency. A reviewer recommendation is pupil visible only when explicitly published; internal notes stay private.
- Finalization uses one transaction to validate agreed prerequisites, attach the approved student identity, create Enrollment/profile/code as needed, record the transition and return the actual enrollment. Same retry returns the same result. It must not overwrite an existing pupil profile or create duplicate class enrollment.

Applicant authorization is ownership, not role alone. Staff reads/writes require an explicitly assigned admissions capability/scope or agreed admin policy; ordinary teacher status must not expose every applicant. A parent may view an application's child evidence only through a verified relationship or explicit guardian ownership. Foreign IDs and file keys must not grant access. File-serving authorization needs an admissions-reference branch; ownership validation at submit alone does not authorize future reviewers. Preserve current private/no-store response headers. Existing bearer-in-file-URL limitations remain documented in `FILE-ACCESS-REVIEW.md`; this design does not claim signed file tickets exist.

Mobile acceptance: 365/375 px single-column course/test/proof/review status, MathText for mathematics, large labeled controls, keyboard focus/Escape for dialogs, no horizontal overflow. Show one question at a time with a compact progress drawer; do not hide the deadline. Upload network/size/type failure preserves answers, notes and selected files where the browser permits; explain reselecting a file after reload. Unknown-success retries reuse persisted request UUIDs. Offline status never claims receipt. The mandatory proof gate must be enforced by the API, not merely a disabled button. No automated phone call, SMS or provider interaction is implied.

## Source material readiness

`docs/research/PI-BOOKS-SOURCE-INVENTORY.json` inventories 751 source files under `/Users/mr.buus/Desktop/Books` (357 DOCX, 394 PDF). These are **files, not unique problems**; pairs can duplicate content. The inventory snapshot marks every entry not-content-reviewed and leaves problem counts unknown; it is not the final content-review ledger. Subsequent work reviewed an eight-DOCX subset and verified 50 problems. This does not establish that all 751 files are unreviewed, nor that the full collection or a placement instrument has been reviewed. The manifest excludes credentials, hidden/temp/output/logo files and Office lock files. No filename explicitly identifies a validated placement instrument; “Сорил” collections alone are not such validation.

A teacher must choose a small legitimate source set, confirm rights, review exact questions and answer keys, define the intended grade range and document scoring/recommendation limits. Existing verified local mathematical fixtures prove software behavior only and must never appear as a real admissions examination or claim educational validity. Reuse rendering/grading utilities after approved snapshots; do not publish unreviewed Desktop/Books content or bulk import it as admissions material.

## Decisions required before implementation

1. Account-bound start versus a separate secure anonymous resume mechanism; recommend account bound for the smallest safe implementation. Decide guardian ownership, child identity and consent before collecting minor evidence.
2. Approved placement questions, source rights, version publication authority, timing, permitted attempt count, manual grading, accommodations and evidence deadline. A score alone must not auto-assign a class.
3. Reviewer capability/assignment and who may publish assessment, log a call, arrange visits and finalize enrollment. Decide whether a reached call is mandatory or an explicit exception may be audited.
4. Actual trial class availability/capacity, attendance recorder, one-versus-two-visit rule and exception handling. Dates and fees come from staff-entered authoritative data.
5. Meaning and timing of the later contract: template/signature method, guardian participation, payment prerequisites and staff exceptions. These are not settled by this technical proposal.
6. Evidence/contact retention, withdrawal, correction and archival policy; authorization for staff handover; transition rollout for future applicants only. Existing pupils and existing pending approvals must not silently acquire new blockers.

## Verification plan and completion boundary

Before release: real isolated HTTP tests for own/foreign/guardian/staff permissions; mandatory owned photo/PDF and rejected foreign/ownerless keys; concurrent create/start/evidence/finalize retry with exact replay and conflicting-body 409; retained earlier attempts/evidence/reviews; immutable deadline reload; draft failure recovery; trial attendance distinct from planned date; prerequisite failures and atomic enrollment; old pupil access unchanged. Browser tests must execute the complete new applicant → test → upload failure/retry → staff review/call → trial → later contract milestone flow at 365/375 px and keyboard-only.

Current evidence covers existing source inspection only. **AdmissionApplication, admission placement attempts, mandatory admission work proof, review/call queue, trial visits and later contract enforcement are not implemented.** The requested full admissions journey remains a genuine product gap; neither existing Lead collection nor pupil approval can be presented as completion.
