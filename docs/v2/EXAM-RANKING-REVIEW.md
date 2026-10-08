# Exam results and private ranking review

All work and evidence use `/Users/mr.buus/Intern/pi.mnv2`, PostgreSQL `127.0.0.1:5544/pimn_v2`, API 3380, web 3381. No production services, original source, or external AI providers were used. Credentials, bearer tokens, fixtures, screenshots and scripts remain in private `.runtime/`; this report contains no credentials or pupil identities.

## Implemented

- STUDENT and BUYER `/test-rankings/:testId`: requires an existing own non-draft, non-deleted server result. Only ONLINE_TEST, CHAPTER_EXAM and OMR_IMPORT are rankable. Self reports do not qualify.
- Own rank/count for active centre classes, exact stored school, and the same exam. Cohorts use the same result source and exclude archived accounts. Percentage comparison handles different maximum scores; competition ties share place and skip subsequent places. Ungradable results have no rank.
- Responses contain own score and own aggregate placement, with no peer IDs, names, codes, scores, phone numbers or school records. Named public leaderboard remains unavailable until explicit consent/publication is implemented. No consent is inferred.
- `/app/results-ranking`: own history cards, on-demand native disclosure of rank scopes, empty/missing-school/error states, keyboard access and mobile layout.
- Staff results previously checked role only and exposed arbitrary pupil names/anti-cheat counts. ADMIN retains global access. TEACHER and TEACHER_PLUS require creator/assigned-class test access and receive only pupils currently enrolled in their own active classrooms. Session anti-cheat query includes only returned pupils.
- Ordinary TEACHER answer-key `getOne` access now requires test creation or own assigned active class. TEACHER_PLUS global published content curation remains separate from pupil privacy.
- BUYER can access own history/review/ranking and the normal test lifecycle. Test listing and access now include granted, unexpired TEST and containing BOOK purchases; ungranted/expired purchases grant no access. All current active classrooms are considered, rather than only the first enrollment. No payment state is advanced by these changes.
- Multi-slot FILL_NUMBER draft answers previously vanished at autosave. Bounded flat scalar slot records now persist; slot keys are checked server-side against the actual problem answer structure. Unknown/prototype keys, nested records, arrays, oversized strings and non-finite numbers are rejected. Correct answers loaded for validation never enter session response.

- GET request dedupe now includes authentication headers, response representation, path and a session version; auth changes clear in-flight data. Browser fetch caching is disabled. Late responses from an old session are rejected before delivery, including upload file keys. No user data or token keys are persisted or logged by the request cache.

## Actual verification

- API and web TypeScript checks passed. Five isolated request-session tests passed via `node --test web/tests/api-session.test.cjs`: same-context dedupe, changed JWT, distinct text/JSON responses, logout/relogin invalidation, and old-session upload key rejection.
- Eight focused Jest tests passed across ranking, staff pupil privacy and autosave suites. Includes percentage ties (1/1/3), ungradable record, own-result prerequisite, staff scope/anti-cheat filtering, multi-slot persistence/reload/final grading, and malicious slot rejection.
- Real local HTTP ranking checks passed: class/school/exam rank and participant counts; missing school; own-result 404; anonymous 401; PARENT/TEACHER/TEACHER_PLUS/ADMIN ranking 403 (BUYER entitlement/history verification added after controller update); unrelated teacher answer-key/results 403; authorized teacher-plus pupil results exclude a fourth pupil from another classroom even when the teacher created the shared test (3 rows; ADMIN sees 4); no peer names/IDs in rank response.
- Real headless Chrome at 375 x 812 passed: rank detail loads, Enter toggles focused disclosure, school-missing state visible, document has no horizontal overflow. Screenshot `.runtime/ranking-mobile.png` visually reviewed.
- Real HTTP latest-build student and BUYER multi-slot autosave/reload/final grade passed, including invalid-payload preservation, no answer keys in start response, purchased-test listing, review/history/ranking, and ungranted/expired purchase denial. BUYER without own result gets ranking 404 and cannot open an unauthorized test (403).

## Limits

School grouping uses the stored school string; school identity normalization is not available. Class membership reflects current active enrolment, not a historical class snapshot. Exam cohorts represent completed server records from that same test/source and are not a national ranking. Public name/code opt-in is intentionally not simulated. The full API Jest suite passed locally: 118 suites, 1181 tests. Global web build checks are owned by the integration agent.
