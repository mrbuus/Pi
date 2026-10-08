import fs from "node:fs";
import path from "node:path";
export const ROLES = [
  "STUDENT",
  "TEACHER",
  "TEACHER_PLUS",
  "ADMIN",
  "PARENT",
  "BUYER",
] as const;
export type AuditRole = (typeof ROLES)[number] | "PUBLIC";
const staff = ["TEACHER", "TEACHER_PLUS", "ADMIN"] as const;
const managers = ["TEACHER_PLUS", "ADMIN"] as const;
export type AuditRoute = {
  route: string;
  url: string;
  roles: readonly AuditRole[];
  reason: string;
  redirect?: string;
};
const entries: [string, readonly AuditRole[], string?, string?][] = [
  [
    "/app/admin",
    ["ADMIN"],
    "Fully loaded ADMIN state; advertised TEACHER_PLUS state is recorded in BLOCKED_WORKFLOWS",
  ],
  ["/app/admin/analytics", managers],
  [
    "/app/admin/audit",
    ["ADMIN"],
    "TEACHER_PLUS actor filter cannot load ADMIN-only GET /users",
  ],
  ["/app/admin/classrooms", managers],
  ["/app/admin/classrooms/[id]", managers],
  ["/app/admin/content", managers],
  ["/app/admin/enrollment", managers],
  ["/app/admin/finance", ["ADMIN"]],
  ["/app/admin/leads", managers],
  ["/app/admin/passes", ["ADMIN"]],
  [
    "/app/admin/reconcile",
    ["ADMIN"],
    "Transaction reads require ADMIN; TEACHER_PLUS state is recorded separately",
  ],
  ["/app/admin/store", managers],
  [
    "/app/admin/students",
    ["ADMIN"],
    "GET /users is ADMIN-only; advertised TEACHER_PLUS state is recorded separately",
  ],
  ["/app/admin/students/[id]", staff],
  ["/app/admin/students/import", ["ADMIN"]],
  ["/app/admin/theory", staff],
  ["/app/buyer", ["BUYER"]],
  ["/app/consent", ROLES],
  ["/app/formulas", ROLES],
  ["/app/formulas/[slug]", ROLES],
  ["/app/formulas/print", ROLES],
  ["/app/formulas/review", ROLES],
  ["/app/formulas/widgets", managers],
  ["/app/goals", ["STUDENT"]],
  ["/app/groups", ROLES],
  ["/app/groups/[groupId]", ROLES],
  ["/app/insights", staff],
  ["/app/learn", ROLES],
  ["/app/learn/[chapterId]", ROLES],
  ["/app/library", ROLES],
  ["/app/mistakes", ["STUDENT"]],
  ["/app/notifications", ROLES],
  ["/app/notifications/settings", ROLES],
  ["/app/online", staff],
  ["/app/online/[id]", staff],
  ["/app/parent", ["PARENT"]],
  ["/app/parent/weekly", ["PARENT"]],
  ["/app/password", ROLES, "Compatibility redirect to profile", "/app/profile"],
  ["/app/payments", managers],
  ["/app/planner", staff],
  ["/app/practice", ["STUDENT"]],
  ["/app/profile", ROLES],
  ["/app/readiness", ["STUDENT"], "GET /readiness/my is student-only"],
  ["/app/schedule", ROLES],
  ["/app/sms", managers],
  [
    "/app/store",
    ["STUDENT", "BUYER", "PARENT", "ADMIN", "TEACHER_PLUS"],
    "Store layout RequireRole excludes TEACHER",
  ],
  ["/app/store/admin", ["ADMIN"]],
  ["/app/student", ["STUDENT"]],
  ["/app/student/payments", ["STUDENT"]],
  ["/app/students/[id]", staff],
  ["/app/teacher", staff],
  ["/app/teacher-hours", staff],
  ["/app/tests", ROLES],
  ["/app/tests/[id]", ROLES],
  ["/app/tests/[id]/edit", staff],
  ["/app/tests/[id]/results", staff],
  ["/app/tests/new", staff],
  ["/app/tuition", managers],
  ["/app/tuition/refund/[id]", managers],
  ["/app/tuition/refunds", managers],
  ["/app/videos", ROLES],
  ...[
    "/",
    "/login",
    "/forgot-password",
    "/register",
    "/teacher-register",
    "/privacy",
    "/terms",
    "/offline",
    "/preview",
    "/auth/google",
  ].map((route) => [route, ["PUBLIC"]] as [string, readonly AuditRole[]]),
];
function syntheticUrl(route: string) {
  if (route.includes("[slug]"))
    return route.replace("[slug]", "synthetic-square-sum");
  if (route.includes("[chapterId]"))
    return route.replace("[chapterId]", "synthetic-chapter");
  if (route.includes("[groupId]"))
    return route.replace("[groupId]", "synthetic-group");
  const id = route.includes("/tests/")
    ? "synthetic-exam"
    : route.includes("/classrooms/")
      ? "synthetic-class"
      : route.includes("/refund/")
        ? "synthetic-refund"
        : "synthetic-student";
  return route.replace("[id]", id);
}
export const AUDIT_ROUTES: AuditRoute[] = entries.map(
  ([route, roles, reason, redirect]) => ({
    route,
    roles,
    url: syntheticUrl(route),
    reason:
      reason ??
      (roles === ROLES
        ? "Authenticated read/shared page; each role gets its own synthetic session"
        : "Applicable workflow roles from page gate and API ownership contract"),
    ...(redirect ? { redirect } : {}),
  }),
);
export function discoveredPageRoutes() {
  const root = path.resolve(__dirname, "../../web/src/app");
  const walk = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      );
  return walk(root)
    .filter((file) => /\/page\.[jt]sx?$/.test(file))
    .map(
      (file) =>
        "/" +
        path
          .relative(root, path.dirname(file))
          .split(path.sep)
          .filter(
            (part) => part && !part.startsWith("(") && !part.startsWith("@"),
          )
          .join("/"),
    )
    .sort();
}

// These advertised workflows cannot load their actual API contract. They are
// tested as explicit blockers, never counted as successful axe page audits.
export const BLOCKED_WORKFLOWS = [
  {
    route: "/app/admin/reconcile",
    role: "TEACHER_PLUS" as const,
    denied: ["/reconcile/transactions"],
  },
  {
    route: "/app/admin/audit",
    role: "TEACHER_PLUS" as const,
    denied: ["/users"],
  },
  {
    route: "/app/admin",
    role: "TEACHER_PLUS" as const,
    denied: ["/users", "/users/teachers"],
  },
  {
    route: "/app/admin/students",
    role: "TEACHER_PLUS" as const,
    denied: ["/users"],
  },
];

// The T18 PR is based on Claude; these exact routes belong to unmerged feature
// PRs. Default CI reports each absent feature test as skipped. Integration CI
// must require the complete inventory; unknown/new or missing baseline routes
// always fail the inventory assertion.
export const FEATURE_DEPENDENCIES: Record<string, string> = {
  "/app/formulas": "T09 #40",
  "/app/formulas/[slug]": "T09 #40",
  "/app/formulas/print": "T09 #40",
  "/app/formulas/review": "T10 #47",
  "/app/formulas/widgets": "T21 #48",
  "/app/mistakes": "T12 #38",
  "/app/notifications/settings": "T14 #46",
  "/app/parent/weekly": "T14 #46",
  "/app/readiness": "T13 #51",
  "/app/store/admin": "T17 #43",
  "/offline": "T15 #32",
};
export const REQUIRE_INTEGRATION = process.env.A11Y_REQUIRE_INTEGRATION === "1";
export const CURRENT_ROUTES = discoveredPageRoutes();
export const EDITOR_AVAILABLE = fs.existsSync(
  path.resolve(
    __dirname,
    "../../web/src/components/formulas/FormulaEditor.tsx",
  ),
);
export function routeAvailable(route: string) {
  return CURRENT_ROUTES.includes(route);
}
