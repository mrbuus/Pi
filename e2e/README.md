# Mocked browser journeys

All eight requested journeys run at 375px and 1280px with synthetic accounts and `page.route` contracts. No API process, database, payment gateway, email, or SMS is contacted. Unexpected API calls, external requests, and browser runtime errors fail the tests. Labels and roles are Mongolian. Traces/reports remain ignored local artifacts.

## Run

```bash
npm --prefix web ci
npm --prefix web run build -- --webpack
npm --prefix e2e ci --ignore-scripts
npm --prefix e2e run typecheck
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npm --prefix e2e test
```

The browser is not installed by this task. If the preinstalled browser path is unavailable, use an already installed Chrome (`PW_CHANNEL=chrome npm --prefix e2e test`) or set `PW_EXECUTABLE_PATH` to its executable. Tested locally with installed Chrome. The suite owns loopback port 3370, rejects reuse of an existing server, and uses the production build. Do not rebuild `web/.next` while a test server is running.

## Evidence and limits

2026-09-26: **16 functional cases passed** (8 journeys, both widths), plus one explicitly expected layout failure and one desktop-only skip for that diagnostic. Playwright counts the expected failure in its 17 successful outcomes; it is not a fixed layout. The protected `AdminDashboardClient.tsx` already exceeds 375px. `09` records that defect using `test.fail`; if it is repaired, unexpected success asks the owner to remove the marker. Functional admin creation still has normal assertions and runtime checks.

Other journeys assert no page-wide horizontal scrolling. Screenshots for payments mask the existing real static bank details and monthly fee. The committed exam screenshots contain only synthetic information. Full local reports are available with `npm --prefix e2e exec playwright show-report` (from e2e, `npx playwright show-report`). Browser mocks validate web requests, not the server implementation or deployed database. Unit/API and integration checks remain required.

## Lint cleanup, not a clean lint claim

Full web ESLint changed from 107 errors / 111 warnings to **104 errors / 17 warnings**. Removed 74 unused imports plus unused bindings, completed callback dependencies and list keys; bank-import refresh now actually remounts the transaction list. No rules or warnings were disabled. TypeScript and production build pass.

The remaining 17 warnings are all in CODEX-NIGHT-1 §3 protected files:

- `web/src/app/app/parent/page.tsx`: 2
- `web/src/app/app/student/page.tsx`: 1
- `web/src/app/app/teacher/TeacherDashboardClient.tsx`: 2
- `web/src/components/TeacherDashboard/AssignmentsSection.tsx`: 2
- `web/src/components/TeacherDashboard/AttendanceSection.tsx`: 3
- `web/src/components/activity/ActivityHeatmap.tsx`: 2
- `web/src/components/activity/ClassActivityHeatmap.tsx`: 2
- `web/src/components/activity/WeeklyActivitySummary.tsx`: 3

Existing ESLint errors remain (notably state-in-effect, refs/purity and legacy any types). Making the entire lint command green would require a separate behavior review and edits outside the permitted scope. This task therefore does **not** satisfy the zero-warning portion of G30; the result is reported explicitly for the owner/design author. No protected file was changed.
