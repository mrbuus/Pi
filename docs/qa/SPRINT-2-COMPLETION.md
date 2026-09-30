# Sprint 2 — delivery and integration handoff

Date: 2026-09-27, Asia/Ulaanbaatar. This is the implementation handoff for the 21 tasks in `docs/CODEX-SPRINT-2.md`, plus the owner's request for editing formula content. “PR ready” means code and evidence are available for review. It does not mean merged, deployed, or validated against production traffic.

## Task index

Every PR targets `claude/100-dollar-credit-usage-ksqjev`. The verified base was `5202db2cd3e60975815b7ff95bff82054825d85d`. No main push, force push, remote PR merge, or deployment was performed by this continuation.

| Task | Delivery | PR |
|---|---|---|
| T01 | Formula API, schema, seed and validation | [#30](https://github.com/mrbuus/Pi/pull/30), already in the base |
| C1 | Numbers and algebra — 63 formulas | [#27](https://github.com/mrbuus/Pi/pull/27), already in the base |
| C2 | Equations and inequalities — 44 formulas | [#36](https://github.com/mrbuus/Pi/pull/36) |
| C3 | Functions, exponentials and logarithms — 40 formulas | [#39](https://github.com/mrbuus/Pi/pull/39) |
| C4 | Trigonometry — 46 formulas | [#41](https://github.com/mrbuus/Pi/pull/41) |
| C5 | Sequences, combinatorics, probability and statistics — 45 formulas | [#42](https://github.com/mrbuus/Pi/pull/42) |
| C6 | Calculus — 46 formulas | [#44](https://github.com/mrbuus/Pi/pull/44) |
| C7 | Plane geometry — 55 formulas | [#49](https://github.com/mrbuus/Pi/pull/49) |
| C8 | Solid geometry, vectors and coordinates — 46 formulas | [#50](https://github.com/mrbuus/Pi/pull/50) |
| T09 | Formula catalog, personal history, detail, print, and authorized content editing | [#40](https://github.com/mrbuus/Pi/pull/40) |
| T10 | Formula memorization and spaced review | [#47](https://github.com/mrbuus/Pi/pull/47) |
| T11 | Problem-to-formula tagging | [#45](https://github.com/mrbuus/Pi/pull/45) |
| T12 | Mistake notebook and retry history | [#38](https://github.com/mrbuus/Pi/pull/38) |
| T13 | Readiness index, uncertainty indication and history | [#51](https://github.com/mrbuus/Pi/pull/51) |
| T14 | Reminders and weekly parent reports | [#46](https://github.com/mrbuus/Pi/pull/46) |
| T15 | Installable PWA and offline formula support | [#32](https://github.com/mrbuus/Pi/pull/32) |
| T17 | Archived-user filtering, store administration and scoped technical debt | [#43](https://github.com/mrbuus/Pi/pull/43) |
| T18 | Accessibility audit, keyboard journeys and integration QA | This PR; [detailed audit](a11y-2026-09-28.md) |
| T19 | Extracting real answer choices, guarded dry-run import tools | [#31](https://github.com/mrbuus/Pi/pull/31) |
| T20 | Research and implementation guidance | [#37](https://github.com/mrbuus/Pi/pull/37) |
| T21 | 23 interactive formula illustrations | [#48](https://github.com/mrbuus/Pi/pull/48) |

Night 1 carry-over follow-ups are separate: paid-until UI [#33](https://github.com/mrbuus/Pi/pull/33), exam duplication [#34](https://github.com/mrbuus/Pi/pull/34), and report [#35](https://github.com/mrbuus/Pi/pull/35). They are not counted as additional Sprint 2 tasks.

## Combined verification

The temporary integration checkout combines the feature branches for QA; it is not a deploy branch and has not been pushed. Its original source checkout and existing untracked files remain preserved.

- Combined API: TypeScript, Nest build, **93 suites / 1,018 tests** passed. The final G36 fixture compatibility adjustment additionally passed TypeScript and its **17 focused tests**.
- A fresh synthetic local PostgreSQL database applied **42 migrations**. Full Nest application bootstrap and **26 real JWT HTTP checks across six roles** passed; concurrent review retries recorded only one result and personal statistics stayed isolated.
- Formula seed: dry-run validated all eight sections; two successive synthetic commit-mode runs each produced **385 formulas / 8 sections**, with **0 missing section relations** and **23 distinct widget keys**. This is idempotence in a clean synthetic database, not a production migration rehearsal against private records.
- Catalog: **770 authored examples / 770 quizzes**, **767 related links**, no slug/title collisions. All 23 widget keys resolve; 99 formulas reference widgets. C2–C8 check all 644 authored example fixtures numerically/semantically; C1 has narrower numeric coverage. These tests are not a formal proof of all mathematical prose.
- Formula editing: browser checks passed in both viewports; synthetic PostgreSQL concurrency used five rounds of ten simultaneous writes, yielding **five accepted writes and 45 stale-version conflicts**. No silent overwrite occurred. The editor handles malformed LaTeX, forbidden roles, unchanged fields, failed saves and explicit draft discard.
- Standalone T18 CI-equivalent run: **363 passed / 83 skipped**; 82 skips are explicit absent feature dependencies and one is the existing configured desktop skip. All 60 existing routes were audited, with no missing baseline route hidden.
- Combined web: typecheck and production build passed; lint **0 errors / 67 pre-existing warnings**. Full integration E2E passed **585 tests / 1 configured skip**. After the last T18 badge-rendering correction, production build, TypeScript, focused lint and **18/18 affected-page/keyboard checks** passed. The final strict T18 integration suite passed **428/428 tests with zero skips**, including both inventory checks with no missing dependencies. The accessibility audit observed 408 page/state scans across 71 routes, with **6 serious / 0 critical** remaining nodes, all three documented protected parent-dashboard findings repeated at both viewports. The detailed T18 report separates comparable baseline counts, newly added states and blocked workflows.

## Integration findings fixed

1. Two formula titles collided with `Formula.name`'s unique constraint. C5 and C7 have distinct titles; the T18 public-content script now fails on future cross-section title collisions before a seed is attempted.
2. `ProgressModule` independently instantiates the attempt/test services and needed the new mistake collector dependency. PR38 imports its module and adds a Nest boot regression; the complete application now boots in the synthetic integration test.
3. The G36 duplication fixture was updated in PR34 to support both the original service constructor and T12's additive dependency.
4. Readiness now respects the Mongolia date-only domain, corrected self-state precedence, observed evidence even with a 0–100 uncertainty range, and older history when the current window is empty.
5. T09, T10, T17 and T21 include their feature-owned accessibility corrections. T18 owns the remaining unprotected small fixes and records protected findings separately.

## Merge and operation notes

Review and merge feature PRs into the requested Claude branch only. T01 and C1 already exist there. Formula content can merge independently; seed the complete reviewed eight-section catalog. T09, T10, T11 and T21 share formula contracts; T13 uses formula/mistake links and its branch now contains the T09/T12 dependency commits to keep its standalone links valid; merge #40/#38 first to avoid reviewing those changes twice. All PRs still target the Claude base. T18's strict integration audit (`A11Y_REQUIRE_INTEGRATION=1`) requires all relevant routes and all eight public content files. Its standalone mode reports exact known feature dependencies as skips while auditing every present route; unknown routes or missing baseline routes still fail.

Expected overlap resolution, proven in the local QA merge:

- `api/src/app.module.ts`: retain **FormulasModule, MistakesModule, JobsModule and ReadinessModule** imports and registrations.
- Prisma schema: retain each additive review, mistake and reminder model/migration. Regenerate Prisma after integrating them; do not drop or rename existing data.
- `e2e/tests/mock-api.ts`: combine feature fixtures. Review routes must be handled before the generic formula-detail matcher; retain editor PATCH/version handling, goals, reminders and store fixtures.
- `web/src/components/formulas/widgets/index.ts`: keep T21's complete allowlisted registry when resolving T09's original empty extension registry.
- Keep the PR34 constructor-compatible duplication fixture with T12.

The seed script's `--commit` intentionally replaces seeded content; review it against subsequent web edits. A production seed should not silently overwrite a teacher's content corrections. Formula revision/rollback UI is not included.

New navigation and dashboard placement remain in each PR's suggested mounting section as required by the task contracts; protected menus and dashboards were not rewritten. The T18 report lists four existing TEACHER_PLUS UI/API role mismatches and parent dashboard contrast findings that require owner-side changes. The delivery does not claim those known problems are resolved.

SMTP delivery requires the existing configured SMTP environment; no external email was sent. Real QPay credentials, production storage, private learner imports, 5,000-user load certification and deployment were not part of these synthetic checks. Readiness is a transparent heuristic over observed learning evidence, not a calibrated probability or an official 800-point prediction. No paid service or new secret was provisioned.
