# Registration and group privacy review

Only synthetic fixtures in isolated pi.mnv2 PostgreSQL and API were used. Initial actual HTTP reproduced an external group owner receiving an unrelated ADMIN-owned draft exam result; the same unchanged JWT retained access after unverification and group archive. An external account promoted to Plus could also read private PAYMENT notes without any finance grant.

## Bounded fixes

TeacherGroupsService now checks the owner’s current database role, active account and external-profile verification on every group data operation. Archived groups deny detail/mutation access. Active pupils/buyers can join a currently verified owner’s group; rejoin upserts the original membership ID and records its previous joined/left timestamps in audit history. Registration uses installed bcryptjs.

Group result queries require nondeleted/non-draft tests with no centre classroom TestAccess and verified result sources. They include owner-published unassigned tests, or current active public catalog TEST purchases granted independently to that member before the result. Results before joining, after entitlement expiry, from draft/private/classroom tests or self reports are excluded. Test has no separate PUBLIC/group-share field; this conservative policy uses existing publication, catalog and classroom association fields rather than inventing one. Member contact email is omitted.

Notes use current database roles and active own-class membership for centre staff. Plus has no global GENERAL-note bypass. Verified external group owners can see only their own authored GENERAL notes for current members; other private staff notes remain hidden. PAYMENT reads/writes require live global finance.manage, including explicit type filters; ordinary untyped lists omit PAYMENT. Parent access to private staff notes is not added.

API TypeScript and six focused suites / 24 tests pass. Updated actual HTTP denial/positive/rejoin fixture is ready in private .runtime/teacher-group-audit.cjs; integrated post-fix verification awaits API restart.

## Registration gaps handed to integration owner

RegisterDto/AuthService CLASSROOM registration has no placement-photo prerequisite. StudentProfile/Enrollment have no placement, trial visit count or contract milestone fields. UsersService.approveStudent can approve and generate a code without checking placement evidence, one/two trial visits, a contract or confirmed receipt. This existing approval is not proof that the requested placement/trial/contract workflow exists.

UsersController pending-approval route currently allows ordinary TEACHER and invokes an unscoped UsersService query returning all centre applicants’ phones, grades and payment status. It also treats REVERSED as confirmed. These shared Users files were reported to the integration owner; no overlapping edits were made here.

New independent teacher registrations now activate their own group-management profile immediately: verifiedAt is a group activation timestamp and verifiedById remains null. This does not certify professional status or grant centre staff content/finance privileges. Existing suspended or legacy inactive profiles are not bulk activated; explicit suspension still denies group operations. Registration test verifies a password hash, active new profile, no administrator verifier, and no updates to existing profiles.

Final rebuilt API HTTP checks passed: independent registration → login → own group creation without an administrator; private unrelated draft results absent and eligible owner-published results visible; no member email; unchanged JWT denied after group-owner unverification or group archive; external TEACHER_PLUS denied private PAYMENT notes, pending approvals, full contact export and approval mutation; rejoin retained the same membership ID and recorded REJOIN audit history. Internal TEACHER pending-approval read returned 403. Internal Plus without finance permission received null payment evidence; ADMIN saw true for a confirmed current-month receipt and false after reversal. Newly created probe users/groups were archived and synthetic tests soft deleted, preserving records/audits.
