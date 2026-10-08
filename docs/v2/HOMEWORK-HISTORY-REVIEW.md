# Homework, theory attachments and history review

Scope: existing homework/activity/theory components and assignments API. All edits are in the v2 checkout. No production records, credentials, payments or SMS were used.

## Existing behavior and concrete fixes

| Existing behavior | Changed behavior |
|---|---|
| Teacher roster endpoint returned submitted images but the review card ignored them. | Review card discloses original uploads, submission/check timestamps, pupil-visible teacher assessment and revision history before review actions. |
| Teacher `review.note` overwrote the same field as the student answer. Resubmission left stale check metadata. | Additive `studentNote` and `reviewNote` fields preserve distinct authorship; teacher review does not write student note; resubmission clears current review/check metadata while history retains it. |
| Submission upsert replaced prior image keys and answer without a user-visible history. | Atomic submission/review snapshots record files, notes, state and time. Advisory transaction lock serializes writes for each assignment/student. The first subsequent write snapshots legacy material with uncertain note provenance, without inventing authorship. |
| Multi-photo upload stopped at the first failure and lost unprocessed file selection. | Sequential uploads attempt every selected file; failures retain File objects with per-file retry/removal. Successful uploads are retained. Submit stays disabled while any attachment is pending/failed. Invalid extension/25MB limit are checked before transfer. |
| Submit optimistically showed success and a fabricated client timestamp before API confirmation. | Server-confirmed state/timestamps are shown. Failure leaves draft text/uploads intact while the page remains open; there is no claim of durable offline autosave. |
| Images were small noninteractive thumbnails; theory image failures were invisible. PDF could be uploaded by the API but not chosen in homework UI. | Existing approved image/PDF chooser, reusable accessible drawer for image detail, external original-size view and PDF opening. Failed images expose retry. Theory keeps its full inline image, with enlargement action. |
| Teacher assignment upload retried all earlier successful files after any failure. | Successful keys are retained against File objects within the open create form; retry uploads only uncompleted files. |
| Student assignment history disappeared after classroom transfer. | Assignments from enrollment date windows are retained, and soft-deleted assignments with the pupil’s submission remain in read-only history; current work and previous history are separate filters. |
| Student classroom marks exposed only fourteen recent days. | Existing default remains, with authenticated annual history via `homework-marks/my?year=YYYY`; range is validated and scoped to JWT student. |
| Annual heatmap had hundreds of tiny keyboard focus stops with only hover tooltips, and errors lacked retry. | Visual grid has one accessible date selector and explicit selected-day description; retry supported; previous/next year controls meet 44px target. |
| `todayIso` used UTC, moving the school day around midnight; historical year showed current global streak, optional streak failures hid the yearly history. | School-date helper uses Asia/Ulaanbaatar. Current global streak is shown only for current-year self view; auxiliary streak failure does not discard yearly history. Teacher approximation is labeled. |
| Weekly weekday abbreviations were incorrect; problem average was labeled hours; rounded hours plus remainder double-counted time and commentary invented thresholds. | Correct weekday names, actual problem/test/day/minute summaries and progressive daily table. No invented success threshold or ranking. |

## Data contract

Revision schema/migration is coordinated with root. Each new event is retained in `SubmissionRevision`; relation uses Restrict. Normal assignment deletion already uses soft-delete, preserving data. Review notes are explicitly pupil-visible feedback, not a place for private staff notes. Legacy shared notes remain unchanged and visibly ambiguous. No attempt is made to reconstruct data that was already overwritten before this migration.

Root owns verified-parent API access and app page integration. `SubmissionRecord` is reusable for authorized parent displays, showing pupil effort separately from assessment/check state. No unauthorized parent endpoint or fabricated records are added here.

## Remaining limits

Uploaded storage durability still depends on configured persistent disk/object storage; UI cannot make the production ephemeral filesystem durable. Pending local Files are retained only while this page is mounted; no background upload or durable offline queue is claimed. Mobile native PDF handling differs by browser; the full PDF opens in a new tab rather than a brittle embedded viewer. There is no unsupported parent access added to student-only annual marks. Historical records predating separate notes/revisions cannot recover previously lost originals. New snapshots retain original uploads by key; root storage retention must avoid deleting referenced files.

Validation: web TypeScript and production build passed (72 shared routes); changed homework/theory/weekly/grid files lint clean. Annual activity components retain their existing synchronous-effect lint warnings. Assignment regression suites pass 17/17, covering separate authorship, legacy ambiguity, retained prior files/reviews, stale check reset, omitted-note clearing, transferred/archived history and annual student scoping. API TypeScript now passes with regenerated additive fields. Live isolated API submit → return → resubmit → verified parent history passes; online browser controls await an ONLINE fixture. No production accounts were used. The work preserves existing submit, approve, return and in-class review endpoints.

## Attachment ownership follow-up

Submission attachment checks now cap the list at ten, validate stored MIME/size, and require newly attached keys to belong to the JWT pupil. Retained ownerless legacy keys are accepted only when they were already present on that pupil’s same assignment submission. Known foreign owners are rejected, including keys already present in an old record. This prevents turning an arbitrary private upload key into a new submission-based file grant. The mobile picker reports the ten-file limit before uploading. Fourteen history and teacher attachment regressions pass; live parent/return/resubmit checks are tracked separately in the isolated runtime harness.

Teacher assignment and theory authoring also require newly added attachment keys to belong to the JWT staff author, validate MIME/25MB bounds, and reject new private foreign or ownerless keys. Existing published artifact keys can remain on an update because they were already part of that same object’s access scope. Live HTTP create/update foreign-key rejection passes for both authoring paths.

### Mixed enrollment correction

The student dashboard previously branched on `studentProfile.type`, hiding online submissions for a pupil who also belonged to an online class. It now requests JWT-scoped active, nonarchived enrollments from `GET /assignments/my-classrooms` and independently renders classroom marks and online homework. Assignment responses include the real classroom type; the online submission list filters `ONLINE` and still retains its historical entries after transfer. Classroom-only pupils do not receive a redundant empty online section. No enrollment or student profile is invented or changed.

Regression coverage verifies both enrollment types, JWT student scoping, exclusion of departed/archived enrollments, and no invented type for empty enrollment. The enrollment and submission-history suites pass 16 tests; scoped web lint and TypeScript pass. The live mobile end-to-end proof is recorded separately after the integrated API restart.

Integrated mobile proof completed against the isolated API3380/Next3381 at 375×812: the mixed pupil saw both sections, an intentionally failed first image upload retained the file and original note and disabled submission, retry uploaded successfully, the pupil submitted, the teacher returned it through the online roster with visible guidance, the pupil reloaded and resubmitted a different note, and the verified parent history displayed the exact original note, revised note and teacher response. Student, teacher and parent had no horizontal overflow. Script `.runtime/interface-online-qa.cjs`; private synthetic fixture only. Initial script selector errors were corrected; the final run used the actual APIs, with only the first upload503 intentionally intercepted.

This exercise also found a shared API-helper contract change double-serializing existing teacher review bodies. Owned online homework create/update/review callers now supply structured bodies; root was notified to preserve compatibility for legacy serialized callers elsewhere. Fresh scoped regression total:76 passing tests (feedback38, theory13, submissions14, enrollments2, upload/controller/hidden-directory serving9). API and web TypeScript pass.
