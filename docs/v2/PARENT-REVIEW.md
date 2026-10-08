# Verified-parent experience — local v2

The parent page leads with the verified child's latest actual result, then reveals annual history, acknowledgement, attendance/homework and child-specific payment details on demand. Existing linking and result acknowledgement actions remain. No example names, scores, attendance or uploads are rendered. Pending links show the waiting state only.

`myChildren` first selects link verification and basic identity, then reads pupil activity only for verified links. Test result IDs are explicitly selected; acknowledgement dialogs address the actual result. Own persisted acknowledgement timestamps survive reload.

Both acknowledgement stages require this parent's **verified** link to the result's pupil. Pending or unrelated links are denied before sending/verifying an OTP or writing acknowledgement. Verification also enforces the classroom-only rule. OTP purpose is scoped to `RESULT_ACK:<resultId>` so a code for one result cannot acknowledge another. This local implementation does not send external mail.

## Long-term API

| Route | Data |
| --- | --- |
| GET `/parent/children` | identity-only pending links; verified child's bounded recent overview |
| GET `/parent/children/:studentId/history?year=2026&page=1` | full-year aggregate plus paginated actual learning, homework, submissions/revisions, results and attendance |
| GET `/parent/children/:studentId/theory/:chapterId` | verified link plus child's current entitlement; pupil-visible theory text/image keys |

JWT/role guards remain. Parent identity comes solely from JWT; service checks verified ownership before child queries. Strict year accepts 2000 through next year; page accepts 1–1000. Annual `Attempt` aggregation covers the whole selected year independently of pagination. Each category returns 50 details plus `hasMore`, with deterministic timestamp/ID order. The UI says category pages are separate; 50 visible rows do not become the annual total.

Lab evidence accepts only server-issued `lab-first-`/`lab-event-` rows with v1 provenance. Generic event ingestion cannot set those IDs. Only allowlisted first/retry/solution fields reach parents; arbitrary client metadata and timing do not.

Submission history includes records with a revision in the selected year even when latest update is later. Current state is labeled current; revisions are filtered by year. Only id/action/state/studentNote/reviewNote/imageKeys/at are selected. Compare that year's first `SUBMIT` with latest `APPROVE`/`RETURN`/`MARK_IN_CLASS`. `LEGACY` is labeled prior source rather than attributed to a pupil. Actor IDs and ambiguous legacy notes are excluded.

Classroom self-reports and test assessments are named by recorded source. Comparisons link only matching test IDs. The UI never invents a student's first answer from a score or assumes self-report counts and teacher scores have the same scale. Corrected-with-solution remains distinct from first independent response and delayed probe. Missing historical information stays unavailable.

## Visibility boundary

No `StudentNote`, private behavior notes, global finance data, staff contact lists or staff-only analysis are queried. DailyHomeworkMark.comment is pupil-visible in the existing `homework-marks/my` endpoint and may be shown as homework feedback. Split Submission.reviewNote is explicitly pupil-visible; old Submission.note and SubmissionRevision.legacyNote are not promoted into parent feedback. Existing payment overview stays limited to the verified child.

Attachment links use `fileUrl` and actual selected child upload keys. Theory checks the child's `canAccessChapter` entitlement; parent role grants no staff bypass. Substituting another child ID cannot bypass verified linkage. No new broad role or public storage URL is added.

## Verification and limitations

Thirteen parent Jest tests pass and cover pending/unrelated linkage in both OTP stages, classroom-only verification, result-bound OTP purpose, pending links avoiding pupil records, actual result IDs/own persisted acknowledgements, excluded private/ambiguous notes, annual totals versus pages, sanitized metadata, strict year/page bounds and child-specific theory entitlement. Parent UI TypeScript and scoped ESLint pass.

Tests use isolated Prisma/provider doubles and do not prove migration, browser OTP delivery or authorized remote upload rendering. An isolated local PostgreSQL5544 + production-controller HTTP/JWT integration passed, including parallel immutable responses, parent linkage denial, actual dismissal enrollment windows, archived submission/revision visibility and legacy-note exclusion. Fresh fixtures were removed. Browser/remote delivery verification remains separate. No production database, deployment or external email service was used.

Calendar-date and UTC timestamp boundaries match the existing activity convention. The UI does not claim psychological ability, attention, notification delivery, private teacher explanation or complete mastery. Current submission state may differ from selected-year revisions and is labeled accordingly. Teacher-issued ClassDismissal records are shown only within actual historical enrollment calendar-day windows (join day inclusive; left/transfer day excluded for the former class). The parent view says class approximate dismissal is not the child's actual departure; optional lastLeftAt concerns the last pupil of the class, never every child. No live GPS or exact individual attendance claim is made. Absence is never inferred from attendance.
