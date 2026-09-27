import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
const known: Record<string, unknown[]> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "a11y-known-findings.json"), "utf8"),
);
import {
  AUDIT_ROUTES,
  BLOCKED_WORKFLOWS,
  CURRENT_ROUTES,
  FEATURE_DEPENDENCIES,
  REQUIRE_INTEGRATION,
  EDITOR_AVAILABLE,
  routeAvailable,
  type AuditRole,
  type AuditRoute,
} from "./a11y-routes";
import { a11yMock } from "./a11y-fixtures";

test.describe.configure({ mode: "parallel" });

// Recording still verifies route readiness, fixture contracts and browser errors.
// It produces evidence, not a claim of accessibility compliance. Normal CI mode
// rejects every serious/critical node not explicitly documented in the report.
const recording = process.env.A11Y_RECORD === "1";
const selected = process.env.A11Y_ROUTE
  ? new RegExp(process.env.A11Y_ROUTE)
  : null;
async function auditPage(
  page: Page,
  info: TestInfo,
  route: AuditRoute,
  role: AuditRole,
  mock: Awaited<ReturnType<typeof a11yMock>>,
  state?: string,
) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const fingerprints = violations
    .flatMap((v) =>
      v.nodes.map((node) => ({
        rule: v.id,
        impact: v.impact,
        target: node.target,
      })),
    )
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const key = `${info.project.name}|${role}|${route.route}${state ? `|${state}` : ""}`;
  await info.attach("a11y-result", {
    body: JSON.stringify(
      {
        key,
        route: route.route,
        url: page.url(),
        role,
        viewport: info.project.name,
        recording,
        state,
        apiCalls: [...mock.calls, ...mock.additionalCalls].map(
          (call) => `${call.method} ${call.path}`,
        ),
        engine: results.testEngine,
        violations,
        allImpactCounts: results.violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        })),
        incomplete: results.incomplete.map((v) => ({
          rule: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        })),
        fingerprints,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  if (
    !recording &&
    role === route.roles[0] &&
    !state &&
    [
      "/app/admin/analytics",
      "/app/admin/reconcile",
      "/app/students/[id]",
      "/app/videos",
      "/app/parent",
    ].includes(route.route)
  ) {
    const screenshot = info.outputPath("a11y-page.png");
    await page.screenshot({
      path: screenshot,
      fullPage: true,
      animations: "disabled",
    });
    await info.attach("a11y-page", {
      path: screenshot,
      contentType: "image/png",
    });
  }
  if (!recording)
    expect(
      fingerprints,
      "Only explicitly documented protected-file findings may remain",
    ).toEqual((known as Record<string, unknown[]>)[key] ?? []);
}
test("a11y route inventory covers every current page", async ({}, info) => {
  const expected = AUDIT_ROUTES.map((row) => row.route);
  const missing = expected.filter((route) => !routeAvailable(route));
  await info.attach("a11y-dependencies", {
    body: JSON.stringify({
      requireIntegration: REQUIRE_INTEGRATION,
      presentRoutes: CURRENT_ROUTES.length,
      missingRoutes: missing.map((route) => ({
        route,
        dependency:
          FEATURE_DEPENDENCIES[route] ?? "Unexpected missing baseline route",
      })),
      missingStates: EDITOR_AVAILABLE ? [] : ["Formula editor: T09 #40"],
    }),
    contentType: "application/json",
  });
  expect(
    CURRENT_ROUTES.filter((route) => !expected.includes(route)),
    "Every new page requires an explicit audit row",
  ).toEqual([]);
  expect(
    missing.filter((route) => !FEATURE_DEPENDENCIES[route]),
    "Baseline routes must never be skipped",
  ).toEqual([]);
  if (REQUIRE_INTEGRATION) {
    expect(
      missing,
      "Full integration gate requires every feature route",
    ).toEqual([]);
    expect(
      EDITOR_AVAILABLE,
      "Full integration gate requires formula editor",
    ).toBe(true);
  }
});
for (const route of AUDIT_ROUTES.filter(
  (row) => !selected || selected.test(row.route),
)) {
  for (const role of route.roles) {
    test(`a11y ${role} ${route.route}`, async ({ page }, info) => {
      test.setTimeout(45_000);
      test.skip(
        !REQUIRE_INTEGRATION &&
          !routeAvailable(route.route) &&
          Boolean(FEATURE_DEPENDENCIES[route.route]),
        `Missing dependency: ${FEATURE_DEPENDENCIES[route.route]}`,
      );
      const mock = await a11yMock(page, role);
      const response = await page.goto(route.url);
      expect(
        response?.status(),
        "Page response must exist, not a 404/error shell",
      ).toBeLessThan(400);
      await expect(page).toHaveURL(
        new RegExp(
          `${(route.redirect ?? route.url).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#].*)?$`,
        ),
      );
      await page.waitForLoadState("networkidle");
      if (route.route === "/auth/google") {
        // This callback has no standalone content: a missing one-time code is its
        // intended public recovery state, audited explicitly rather than hidden.
        await expect(
          page.getByText("Нэвтрэх код алга байна.", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Нэвтрэх хуудас руу буцах" }),
        ).toBeVisible();
      } else {
        await expect(
          page.locator("h1, h2").first(),
          "The route must render its content heading",
        ).toBeVisible();
      }
      await expect(
        page.getByText("Application error", { exact: false }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Хандах эрхгүй байна", { exact: true }),
      ).toHaveCount(0);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expect(
        page.getByRole("status", { name: /ачаал|Ачаал|бэлтгэж|шалгаж/ }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Серверийн алдаа. Хүлээгээрэй, дахин оролдоно уу.", {
          exact: true,
        }),
      ).toHaveCount(0);
      await mock.verify();
      if (route.route === "/app/students/[id]") {
        await expect(page.getByText("Хийсэн", { exact: true })).toBeVisible();
        await expect(
          page.getByText("[object Object]", { exact: false }),
        ).toHaveCount(0);
        await expect(page.getByText(/^(check|clock|x) /)).toHaveCount(0);
      }
      await auditPage(page, info, route, role, mock);
    });
  }
}

for (const blocked of BLOCKED_WORKFLOWS.filter(
  (row) => !selected || selected.test(row.route),
)) {
  test(`a11y blocked workflow ${blocked.role} ${blocked.route}`, async ({
    page,
  }, info) => {
    const mock = await a11yMock(page, blocked.role);
    await page.goto(blocked.route);
    if (blocked.route === "/app/admin/audit") {
      await expect(
        page.getByRole("heading", { name: "Аудит лог", exact: true }),
      ).toBeVisible();
      // The page swallows this 403, leaving only the default actor option.
      await expect(page.getByLabel("Хэн хийсэн").locator("option")).toHaveCount(
        1,
      );
    } else
      await expect(
        page
          .getByText("Эрх хүрэхгүй. Сэргээхэд нэвтрэх дахин оролдоно уу.", {
            exact: true,
          })
          .first(),
      ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await mock.verify(blocked.denied);
    await info.attach("a11y-blocked-workflow", {
      body: JSON.stringify({
        ...blocked,
        viewport: info.project.name,
        reason:
          "UI advertises this role, but initial GET requests require ADMIN. Error or incomplete filter state is excluded from successful axe counts.",
      }),
      contentType: "application/json",
    });
  });
}

// Inline editing is a distinct interactive state on the same detail route.
for (const role of ["TEACHER_PLUS", "ADMIN"] as const) {
  const route = AUDIT_ROUTES.find(
    (row) => row.route === "/app/formulas/[slug]",
  )!;
  if (!selected || selected.test(route.route))
    test(`a11y ${role} formula editor`, async ({ page }, info) => {
      test.skip(
        !REQUIRE_INTEGRATION && !EDITOR_AVAILABLE,
        "Missing formula editor dependency: T09 #40",
      );
      const mock = await a11yMock(page, role);
      await page.goto(route.url);
      await page.getByRole("button", { name: "Засах", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Томьёо засах", exact: true }),
      ).toBeFocused();
      await page.waitForLoadState("networkidle");
      await mock.verify();
      await auditPage(page, info, route, role, mock, "editor");
    });
}
