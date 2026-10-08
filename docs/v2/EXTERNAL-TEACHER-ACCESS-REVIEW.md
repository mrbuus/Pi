# External teacher privilege boundary — local verification, 2026-10-07

External registration writes role TEACHER plus ExternalTeacherProfile. That registration must not confer the centre's paid-content, global bank curation, answer-key, or official pupil result privileges. The separate teacher-group workflow remains independently owned and is not changed by this patch. This does not add an approval requirement for registering an external teacher.

## Implemented boundary

`api/src/common/access.ts` resolves the active current database user for teaching privilege. ADMIN remains privileged; TEACHER/TEACHER_PLUS require absence of ExternalTeacherProfile; archived/unknown/current nonstaff roles fail. Incoming JWT role claims are not authority. Existing frozen pass snapshots, valid purchase grants, dates, classroom access and free previews remain intact. External teachers can access their normally entitled content without acquiring staff answer keys.

`api/src/content/content.controller.ts` passes authenticated actor identity to problem GET and permits BUYER. `content.service.ts` checks problem/chapter/book deletion and chapter entitlement; returns only statement/image and projected label/text choices to learners and external teachers. It does not expose correctAnswer or isCorrect. Lists similarly hide keys/analysis and reject malformed structured legacy choices. Global book/chapter/topic/problem mutations assert current internal staff. Existing route-specific Admin/Plus restrictions still apply.

`api/src/tests/tests.service.ts` applies the internal boundary before centre drafts, editable tests, create and official results. New/replaced TestAccess classroom IDs must belong to the non-Admin actor. Non-Admin result entry requires an assigned active actor-owned classroom containing the exact active pupil; own test authorship alone cannot grant access to arbitrary children. Scores must fit their maximum. Deleted tests cannot receive official results. Entitled external readers follow the normal no-answer test projection. Separate external group results remain outside this service.

`api/src/lessons/lessons.service.ts` applies the boundary to centre theory creation/update/reorder/removal and teaching list shortcuts. An ordinary internal teacher can update their own authored theory only; reordering a whole chapter requires owning all affected blocks. Legacy ownerless blocks are not implicitly theirs. Admin/Plus retain existing curation permissions. A subsequent retention patch replaces theory hard deletion with idempotent archivedAt updates and an Admin/Plus restore endpoint; historical explicit references remain intact.

`api/src/videos/videos.service.ts` applies the same current internal actor boundary to curation and staff chapter-list projections. External media entitlement follows the normal media rules, including BOOK includesVideo; no new provider capability or DRM claim is made.

## Evidence and limits

`api/src/common/internal-staff.spec.ts`: 11 focused tests passed for external Teacher/Plus, archived/unknown/current-role identity, explicit Admin, active purchase fallback, global mutation denial, exact child result denial, theory author ownership and answer-free pupil projection.

`api/src/common/internal-staff.local.cjs`: real local Postgres 5544 plus isolated Nest HTTP with production JwtStrategy and production Content/Tests services passed. A synthetic external TEACHER JWT deliberately claiming ADMIN received 403 for paid problem, global problem creation and official result entry. The same free-preview problem returned 200 without answer key. No TestResult was created; all synthetic rows were removed. This probe exercises service/JWT boundaries; it does not claim every production controller route was browser-tested.

Full API independently compiled to ignored `.runtime/study-review-check-build`; API typecheck passed. Existing staff unit fixtures require current database identities rather than caller-role-only assumptions; full-suite status is tracked by the coordinating agent. This is a bounded audit of the listed content/test/theory/video paths, not proof that every staff route in the platform has been audited. Internal global bank authoring policy and external teacher group permissions remain separate policies.

## Theory retention verification

`DELETE /lessons/theory/:id` now archives rather than deletes. `POST /lessons/theory/:id/restore` is restricted to current internal Admin/Plus and rejects a deleted/archived source chapter/book. ARCHIVE/RESTORE audit rows commit in the same transaction under a theory-row advisory lock; repeated identical actions create no duplicate audit. Archived rows cannot be updated or reused through their original create UUID (409). Active lesson/chapter counts, theory reads and public Content previews exclude archived blocks; active chapter/book deletion filters apply. Reorder addresses only active blocks. Historical packet/parent/file explicit-ID readers are unchanged.

Two focused theory suites passed 16 tests (13 existing idempotency plus 3 retention). `api/src/lessons/theory-retention.local.cjs` passed against local Postgres and the freshly independently compiled service: archive twice kept the row/content/image keys, active lesson and chapter list hid it, archived update returned 404 and UUID replay 409, restore twice returned the same original row, and exactly one audit per transition remained. This is a real database service probe, not a claim of browser coverage for restore UI. No restore UI is added by this bounded API retention patch.
