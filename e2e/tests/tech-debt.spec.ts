import { test, expect, type Page, type Route } from "@playwright/test";
import { mockApi, storeProduct } from "./mock-api";
const headers = {
  "access-control-allow-origin": "http://127.0.0.1:3370",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "content-type": "application/json",
};
const reply = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, headers, body: JSON.stringify(body) });
async function override(
  page: Page,
  handler: (route: Route, path: string) => Promise<boolean>,
) {
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (
      !(await handler(route, new URL(route.request().url()).pathname.slice(4)))
    )
      await route.fallback();
  });
}
const task = (title: string) => ({
  id: title,
  title,
  status: "PLANNED",
  priority: "NORMAL",
  orderIndex: 0,
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
  assignees: [],
  subtasks: [],
  createdById: "synthetic-student",
  createdBy: {
    id: "synthetic-student",
    firstName: "Туршилт",
    lastName: "Зохиомол",
  },
});

test("T17 admin changes price and visibility without losing a draft", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "ADMIN");
  await page.goto("/app/store");
  await page.getByRole("link", { name: "Бүтээгдэхүүн удирдах" }).click();
  const card = page.getByRole("region", { name: storeProduct.title });
  const price = card.getByLabel("Үнэ (₮)");
  await expect(price).toHaveValue("100");
  await price.fill("250");
  await card.getByRole("button", { name: "Идэвхгүй болгох" }).click();
  await expect(card.getByText("Идэвхгүй", { exact: true })).toBeVisible();
  await expect(price).toHaveValue("250");
  await card.getByRole("button", { name: "Үнэ хадгалах" }).click();
  await expect(
    card.getByRole("button", { name: "Үнэ хадгалах" }),
  ).toBeDisabled();
  await expect(card.getByText("Худалдан авалт: 2")).toBeVisible();
  await card.getByRole("button", { name: "Идэвхжүүлэх" }).click();
  await expect(card.getByText("Идэвхтэй", { exact: true })).toBeVisible();
  await price.fill("0");
  await card.getByRole("button", { name: "Үнэ хадгалах" }).click();
  await expect(price).toHaveValue("0");
  await expect(
    card.getByRole("button", { name: "Үнэ хадгалах" }),
  ).toBeDisabled();
  expect(
    mock.calls
      .filter((c) => c.path.endsWith("/price"))
      .map((c) => [c.method, c.body]),
  ).toEqual([
    ["POST", { price: 250 }],
    ["POST", { price: 0 }],
  ]);
  expect(
    mock.calls
      .filter((c) => c.path.endsWith("/status"))
      .map((c) => [c.method, c.body]),
  ).toEqual([
    ["PATCH", { active: false }],
    ["PATCH", { active: true }],
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const button of await card.getByRole("button").all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: info.outputPath("store-admin.png"),
    fullPage: true,
  });
  await mock.verify();
});

test("T17 price validation and rejected writes preserve editable values", async ({
  page,
}) => {
  const mock = await mockApi(page, "ADMIN");
  let attempts = 0;
  await override(page, async (route, path) => {
    if (path !== "/store/admin/products/synthetic-product/price") return false;
    attempts++;
    await reply(route, { message: "Зохиомол хадгалалтын алдаа" }, 400);
    return true;
  });
  await page.goto("/app/store/admin");
  const price = page.getByLabel("Үнэ (₮)");
  for (const value of ["-1", "1.5", "2147483648", ""]) {
    await price.fill(value);
    await page.getByRole("button", { name: "Үнэ хадгалах" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "бүхэл тоо",
    );
  }
  expect(attempts).toBe(0);
  await price.fill("999");
  await page.getByRole("button", { name: "Үнэ хадгалах" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Зохиомол хадгалалтын алдаа",
  );
  await expect(price).toHaveValue("999");
  await expect(
    page.getByRole("button", { name: "Үнэ хадгалах" }),
  ).toBeEnabled();
  expect(attempts).toBe(1);
  await mock.verify();
});

test("T17 store loading, error retry, and empty list", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "ADMIN");
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let count = 0;
  await override(page, async (route, path) => {
    if (path !== "/store/admin/products") return false;
    if (++count === 1) {
      await pending;
      await reply(route, { message: "Зохиомол унших алдаа" }, 400);
    } else await reply(route, []);
    return true;
  });
  await page.goto("/app/store/admin");
  await expect(
    page.getByRole("status", { name: "Бүтээгдэхүүн ачаалж байна" }),
  ).toBeVisible();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Зохиомол унших алдаа",
  );
  await page
    .getByRole("button", { name: "Дахин оролдох", exact: true })
    .click();
  await expect(
    page.getByText("Бүтээгдэхүүн бүртгэгдээгүй байна"),
  ).toBeVisible();
  expect(count).toBe(2);
  await page.screenshot({
    path: info.outputPath("store-empty.png"),
    fullPage: true,
  });
  await mock.verify();
});

for (const role of ["TEACHER_PLUS", "STUDENT", "PARENT"])
  test(`T17 ${role} cannot open admin controls or issue admin reads`, async ({
    page,
  }) => {
    const mock = await mockApi(page, role);
    await page.goto("/app/store");
    await expect(
      page.getByRole("link", { name: "Бүтээгдэхүүн удирдах" }),
    ).toHaveCount(0);
    await page.goto("/app/store/admin");
    await expect(
      page.getByText("Хандах эрхгүй байна", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Үнэ (₮)")).toHaveCount(0);
    expect(
      mock.calls.filter((c) => c.path.startsWith("/store/admin/")),
    ).toHaveLength(0);
    await mock.verify();
  });

test("T17 filter changes ignore late success and late failure; modal reopens cleanly", async ({
  page,
}) => {
  const mock = await mockApi(page, "ADMIN");
  let firstRelease!: () => void, secondRelease!: () => void;
  const firstPending = new Promise<void>((resolve) => {
    firstRelease = resolve;
  });
  const secondPending = new Promise<void>((resolve) => {
    secondRelease = resolve;
  });
  let requests = 0;
  await override(page, async (route, path) => {
    if (path === "/tasks/staff-directory") {
      await reply(route, []);
      return true;
    }
    if (path !== "/tasks") return false;
    const n = ++requests;
    if (n === 1) {
      await firstPending;
      await reply(route, [task("Хуучин хүсэлт")]);
    } else if (n === 2) {
      await secondPending;
      await reply(route, { message: "Хуучин алдаа" }, 400);
    } else await reply(route, [task("Одоогийн хүсэлт")]);
    return true;
  });
  try {
    await page.goto("/app/planner");
    await expect.poll(() => requests).toBe(1);
    await page.getByLabel("Хичээлээр шүүх").selectOption("MATH");
    await expect.poll(() => requests).toBe(2);
    await page.getByLabel("Хичээлээр шүүх").selectOption("SOCIAL_STUDIES");
    await expect(
      page.getByText("Одоогийн хүсэлт", { exact: true }),
    ).toBeVisible();
    const firstResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/tasks") &&
        response.request().method() === "GET",
    );
    firstRelease();
    await firstResponse;
    const secondResponse = page.waitForResponse((response) =>
      response.url().includes("/api/tasks?subject=MATH"),
    );
    secondRelease();
    await secondResponse;
    await expect(
      page.getByText("Одоогийн хүсэлт", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Хуучин хүсэлт", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByText("Хуучин алдаа", { exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole("button", { name: "+ Шинэ даалгавар", exact: true })
      .click();
    await page.getByLabel("Гарчиг", { exact: true }).fill("Хадгалаагүй ноорог");
    await page.getByRole("button", { name: "Хаах", exact: true }).click();
    await page
      .getByRole("button", { name: "+ Шинэ даалгавар", exact: true })
      .click();
    await expect(page.getByLabel("Гарчиг", { exact: true })).toHaveValue("");
    await mock.verify();
  } finally {
    firstRelease();
    secondRelease();
  }
});

test("T17 SMS estimate shows archived exclusions without sending", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "ADMIN");
  const smsCalls: string[] = [];
  await override(page, async (route, path) => {
    if (path === "/sms/status") {
      await reply(route, {
        configured: false,
        provider: null,
        thisMonthCount: 0,
        thisMonthSegments: 0,
      });
      return true;
    }
    if (path === "/sms/templates") {
      await reply(route, []);
      return true;
    }
    if (path === "/sms/bulk/estimate") {
      smsCalls.push(path);
      await reply(route, {
        recipientCount: 3,
        deduplicatedCount: 2,
        excludedArchivedCount: 1,
        estimatedSegments: 2,
        estimatedCost: 100,
      });
      return true;
    }
    return false;
  });
  await page.goto("/app/sms");
  await page.getByRole("button", { name: "Илгээх", exact: true }).click();
  await page
    .getByLabel("Утасны дугаар", { exact: true })
    .fill("99000001, 99000002, 99000003");
  await page
    .getByLabel("Илгээх текст", { exact: true })
    .fill("Зохиомол туршилт");
  await page.getByRole("button", { name: "Серверээс тооцоо авах" }).click();
  const excluded = page
    .getByText("Архивласан хэрэглэгчийн хасагдсан дугаар", { exact: true })
    .locator("..");
  await expect(excluded.locator("dd")).toHaveText("1");
  await expect(
    page
      .getByText("Илгээх дугаар (давхардал, архив хассан)")
      .locator("..")
      .locator("dd"),
  ).toHaveText("2");
  await expect(
    page.getByRole("button", { name: "Багц үүсгээд илгээх" }),
  ).toBeDisabled();
  await page.screenshot({
    path: info.outputPath("sms-exclusions.png"),
    fullPage: true,
  });
  expect(smsCalls).toEqual(["/sms/bulk/estimate"]);
  await mock.verify();
});
