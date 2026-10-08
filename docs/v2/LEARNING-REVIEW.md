# Learning experience review — local v2

Implemented in the separate `pi.mnv2` checkout. No external AI calls, production database access, deployment, bank mutation, or invented pupil records are required. `LearningLabModule` is registered; `/app/study` supports STUDENT and BUYER. Buyer uses the entitled online paths and does not call Student-only assignment/activity APIs.

## Actual user paths

`/app/study` opens with one task, then progressively reveals classroom homework, teacher-bank problems, online topic tests/weekly exams, theory, and evidence. It reads existing `assignments/my`, `recommend/next`, `lessons/chapters`, `activity/me` and learning-lab history through the shared authenticated `api` helper. Readiness, mistakes, formulas and long-term insights keep their existing pages. Independent requests settle separately; a failed source is explicitly unavailable rather than represented as zero progress.

Classroom pupils can enter the printed bank code after a phone-free lesson, open the authorized problem, and record the original notebook answer. This is a retrospective self-report, not a claim that Pi observed classroom work. Optional unsure/guessed/could-not/help flags describe uncertainty. Original homework remains attached to the teacher's assignment workflow; the new first-response evidence does not silently submit or grade that assignment.

The task ID and mode are retained in the local page URL, so reloading reopens the same task and retrieves its server-owned first response. The first response is persisted on the server, then the pupil can retry before opening a solution or deliberately reveal it. Solutions from original bank analysis display only when `ProblemAnalysis.status=VERIFIED`; absent solutions are honestly marked unavailable. Subsequent correction is marked `retry-before-solution` or `solution-assisted-correction` using durable exposure records. New generated practice is separate from bank/exam grades. Topic tests and weekly exams retain the existing session engine rather than a new client-only exam.

Theory is loaded only from existing authorized lesson endpoints. Math uses `MathText`. Images and PDF objects/links use `fileUrl` rather than constructed public URLs; mobile PDF failure has an explicit open-document fallback. Actual annual activity from existing `Attempt` rows is displayed separately from the last 100 lab events. A tab being open never becomes proof of attention.

## Endpoint contract and persistence

All student routes use `JwtAuthGuard` and `RolesGuard`; user IDs come solely from JWT.

| Route | Purpose |
| --- | --- |
| GET `/learning-lab/problem?family=linear&seed=42` | Public statement, versioned ID, verification label, own prior first response; no key/solution/coefficients |
| GET `/learning-lab/bank/:idOrPrintedCode` | Existing authorized bank content, no answer-key/correct-choice flags/solution |
| POST `/learning-lab/response` | Server-graded immutable first evidence |
| POST `/learning-lab/correction` | Separate retry evidence after own first answer |
| POST `/learning-lab/solution` | Own first answer required; persist exposure before returning solution |
| GET `/learning-lab/history` | Own last 100 events only |
| GET `/learning-lab/review/:studentId` | Teacher current-enrollment ownership, or admin/teacher-plus; review existing evidence |

A response body contains `problemId`, bounded string `answer`, optional `mode` (`independent`, `classroom`, `probe`), optional bounded flags, and bounded timing summary. Client correctness is never used. Empty answers require `could-not`. Malformed numeric expressions, division by zero, unknown flags, invalid seeds, unbounded timing and oversized strings are rejected.

The existing `LearningEvent` table stores `meta.lab=v1`. First-row ID is SHA-256 of JSON `[JWT userId, versioned problemId]`, with a `lab-first-` prefix. Prisma's unique-primary-key upsert has **no update fields**: a replay, browser reload or another tab cannot replace the original answer/flags/mode. Correction and exposure are separate append events with server-only `lab-event-` IDs; history ignores generic client metadata pretending to be lab evidence. History and teacher review preserve their distinction. No new schema or migration is needed. Bank grading reuses existing grading/canonicalization and chapter entitlement checks. Stored lab evidence is not written as `Attempt`, `MistakeEntry`, classroom submission, official mastery, or bank problem statistics.

Generated items never overwrite or insert into the original bank. Persisting *items as teacher-authored bank content*, changing a template version or promoting generated results into official grades needs a separate teacher review/import process. Current teacher endpoint reviews learning evidence only. Keep `lab-v1` generation frozen once evidence exists; incompatible changes require `lab-v2` IDs.

## Verified generator coverage

No LLM or broad symbolic solver is used. The seeded uint32 LCG is reproducible, including seed zero. All values are bounded integers; all returned answers use normalized BigInt rational arithmetic. Answers are checked independently against template equations before a problem is returned.

| Family | Supported | Verification |
| --- | --- | --- |
| Linear | nonzero integer coefficient, rational root | substitute into `a*x+b=c` using cross multiplication |
| Quadratic | factored construction, one/two distinct integer roots, zero and double roots | substitute each root into quadratic; answer compares complete distinct root set |
| Fractions | signed integer numerators, positive integer denominators, rational sum | cross-multiply exact numerator/denominator equality |

Answer parser supports bounded integers, finite decimal strings (at most eight places), and signed `a/b`. Quadratic roots may be entered in either order. It does not evaluate expressions, scientific notation, radicals, arbitrary equations, irrational roots, inequality intervals or arbitrary multi-slot answers. Those require additional reviewed templates/input contracts, not an unsupported correctness promise. Bank open-ended/manual review should stay with the teacher when its answer key is missing or not supported by the existing grader.

## Cautious recommendation contract

Evidence snapshots distinguish: retrospective classroom answer; first independent response; unsure/guessed/help flags; pre-solution retry; viewed solution; solution-assisted correction; and a new-item delayed probe. Re-answering the same item cannot erase first failure or become first unseen success. New seed IDs can occasionally generate mathematically equivalent prompts; this prototype does not infer deep semantic novelty.

Current actionable behavior:

1. With little history, offer a learner-selected bounded family and existing authorized lessons; say no personalized conclusion is available.
2. Show an explicit one-day delayed **new seed** probe for a previously attempted family. This is a provisional scheduling choice, not a scientifically optimal interval or mastery declaration.
3. Route a wrong/uncertain response to retry and optional worked solution; retain the original evidence. Ask for another independent item later before interpreting correction as durable learning.
4. Preserve existing recommender routes but call their output a suggestion. Their current candidate pool/difficulty estimates are limited; do not claim complete topic coverage or calibrated difficulty.
5. Count only first independent successes without help/uncertainty flags in the displayed independent-success subtotal. Classroom and delayed-probe modes are shown explicitly. Corrected-with-solution subtotal stays separate. The window is honestly labeled last 100 events.

Proposed next experiment, **not an implemented mastery model**: after at least five recent independent, unassisted first responses in a reviewed skill family, offer one step easier when repeated errors/uncertainty occur or one step harder when several new prompts are correct. Show why, let the pupil override, and evaluate delayed retention/coverage rather than completion speed. Never label ability, intelligence, cheating, or clinical attention from time, tab behavior or a few answers. Do not enforce a universal target success percentage.

## Evidence checked 2026-10-07

- [IES practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): supports distributing practice and using retrieval opportunities. It informs offering recall before reveal and separated study sessions, without prescribing this app's exact interval.
- [Murray, Horner & Göbel 2025, University of York author repository](https://eprints.whiterose.ac.uk/id/eprint/229807/): math-specific meta-analysis found a small-to-medium spacing effect; retrieval versus restudy was inconclusive in the smaller math evidence base. Do not promise that every math retrieval prompt improves achievement.
- [Schonberg et al., published November 2025, volume 2026](https://link.springer.com/article/10.1007/s10758-025-09914-x): observational IXL K–5 data associates spacing and productive struggle with better learning. It supports testing the idea here, not causal claims for Mongolian exam pupils.
- [Wilson et al., Nature Communications 2019](https://www.nature.com/articles/s41467-019-12552-4): the 85% result concerns specified binary classification/learning models. It does not establish one optimal error rate for Pi's complex mathematics.
- [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) and [performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now): visibility is observable; background timers can be throttled and elapsed timing differs across sleep/OS/browser behavior. Neither proves attention.

## Timing and privacy

`StudyClock` measures local elapsed time with `performance.now`, periodically samples visible/focused status and listens to visibility/focus/blur. It stores only bounded aggregate focused-visible, hidden, unknown milliseconds and a bounded action count. Gaps above 15 seconds are assigned unknown, conservatively handling a sleeping phone. Maximum duration per category per response is 30 minutes and action count 100. Summaries are sent with response/retry, not streamed; they restart after successful submission so stages are distinct. Input keystrokes, raw mouse movement, external app names and screenshots are never collected. Solution/answer/retry actions are durable typed learning events. Merely leaving a task with no submission does not create an engagement record; persistence failure is shown to the pupil.

## Verification and limits

- Learning API Jest: 22 passing tests across four suites, including 2,000 seeds per original family and 4,000 seeds per advanced family plus uint32 extremes, independent substitution checks, rational input bounds, double/zero roots, deterministic ID roundtrip, key hiding, ownership, reload-safe replay, exposure classification and teacher authorization.
- Study policy and browser timing tests: 11 passing node tests for focused/hidden/unknown separation, suspended time, bounded counters and backward-clock protection.
- Web TypeScript passes. Scoped ESLint has no errors; authorized file images deliberately retain browser-native `<img>` delivery (two framework optimization warnings).
- API production build passes. API full TypeScript typecheck and targeted Jest pass.

The opt-in `api/src/learning-lab/local.integration.cjs` was run successfully against only the guarded local v2 PostgreSQL port 5544. It starts an isolated HTTP app with production controllers/JWT/role guards, creates fresh fixtures, checks five parallel first-answer replays, reopen/reload, malformed input, exact grading, before/after-solution corrections, teacher dismissal access and UB conversion, verified parent enrollment windows, archived submission revisions and legacy-note exclusion, then removes fixtures. It refuses non-local/non-5544 database URLs and stubs email to prevent external provider calls. No secrets are printed.

Local unit tests use isolated Prisma doubles. The opt-in local PostgreSQL HTTP tests cover reload/replay and simultaneous first-answer requests; they do not prove production migration, real browser hydration, authorized remote provider rendering or real learning outcomes. Actual365/375px browser QA now covers six advanced Study flows and nine timed-review flows; original homework/theory/provider-rendering branches remain separate acceptance paths. No production database was used for this review. Annual official activity excludes generated lab events by design. History pagination, multi-device scheduling, assignment-to-problem links, arbitrary multi-slot bank answers, calibrated adaptive difficulty and automated mastery are future work.

## Teacher-issued class dismissal

`/app/dismissal` and teacher-only GET/PUT `/learning-lab/classrooms/:id/dismissal?date=YYYY-MM-DD` store teacher-issued **class-level approximate dismissal**. TEACHER and TEACHER_PLUS must own `Classroom.teacherId`; admin can active classes. Parent/student direct access is denied. Strict date and HH:mm parse in Ulaanbaatar (+08), independent of server timezone. Optional `lastLeftTime` is class's last pupil context and never each child's departure. Same-day clocks only; last-left before approximate time is rejected. One active record per class/day uses the existing unique constraint. Notes are bounded to 1000 characters, expressly pupil/parent-visible; extra/private-note fields are rejected. This is no GPS or attendance assertion.

Verified parent history reads only actual recorded class dismissals within the pupil's historical enrollment calendar-day windows. Join day is included, transfer/left day excluded for the former class, and no unrelated class is queried. The view explicitly says “анги тарах ойролцоо цаг — хүүхдийн бодит гарсан цаг биш.” Unit coverage includes role/ownership, archived class denial, malformed dates/times, timezone/midnight conversion, clock ordering and note bounds/private-field rejection. Local HTTP/DB integration checks teacher ownership, parent denial and parent timeline exclusion of a dismissal before enrollment.

## Advanced bounded templates and Buyer regression (2026-10-07)

Three separately verified families extend the original linear/quadratic/fractions generators: `vector-dot` (3D integer coordinates −8…8), `derivative-value` (polynomial degree 0…4, integer coefficients −9…9, value of the derivative at an integer −3…3), and `integral-definite` (degree 0…3, integer coefficients −9…9 and integer bounds −4…4, including equal/reversed bounds). BigInt rational arithmetic computes exact answers; no decimal approximation, general symbolic solver, empirically calibrated difficulty or model/provider is claimed. Mongolian steps show vector products, derivative/primitive rules and substitutions through MathText/KaTeX. Advanced choices are progressively grouped. Old family IDs and seed draws remain stable.

The independent oracle tests use a separate power-sum/LCM approach rather than the generator's Horner evaluation: 4,000 seeds per new family plus uint32 extremes, constant/zero polynomials, reversed/equal limits and rational integrals. A local render check successfully rendered 1,414 math expressions with KaTeX throwing on invalid input. Actual guarded PostgreSQL/JWT/HTTP tests exercised all three families under BUYER, hidden keys, right-answer grading, wrong replays preserving the first answer, reload, correction after solution and teacher-role denial. Web policy tests cover both learner roles, restored advanced IDs, unsupported roles, unknown correctness and explicit flags.

Video solution opens are durable hint exposure. New records carry `lab:v1`; the correction/history readers also recognize trusted legacy `video-solution-open` records without rewriting initial answers. The local video HTTP fixture proves a wrong original answer survives an assisted correction and both events remain visible. Unknown correctness is displayed as unknown; blank text alone is never inferred to mean “could not solve.”

## Persisted topic review

`/app/study/review` and `api/src/study-review/**` implement separate private review runs for 10/30/60 minutes. See [SELF-REVIEW-DESIGN.md](SELF-REVIEW-DESIGN.md) for actual API, snapshot, deadline, replay and evidence boundaries. Official TestResult/rankings are unchanged.

Final mobile evidence: six actual365/375px Study flows (STUDENT classroom and BUYER independent across the three advanced families) saved first responses201, reloaded the same task ID, retained the original111 answer after correction/solution and rendered without overflow or math errors. Browser QA exposed fractional `performance.now()` durations being rejected by the integer API contract; `StudyClock.summary()` now conservatively floors each bounded category while retaining raw fractions internally. A fractional-clock regression passed (5 clock tests, 11 combined Study tests). This fix does not relabel hidden/unknown time as focused or infer attention. Timed review passed nine corresponding mobile flows described in SELF-REVIEW-DESIGN.md.
