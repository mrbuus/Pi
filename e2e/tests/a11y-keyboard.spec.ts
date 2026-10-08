import { test, expect, type Page, type Locator } from "@playwright/test";
import { a11yMock } from "./a11y-fixtures";
import { REQUIRE_INTEGRATION, routeAvailable } from "./a11y-routes";

// Never focus/click through the driver: reach the control using real Tab keys.
async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 120; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw Error(
    `Control could not be reached with Tab: ${(await target.getAttribute("aria-label")) ?? (await target.innerText())}`,
  );
}
async function activate(
  page: Page,
  target: Locator,
  key: "Enter" | "Space" = "Enter",
) {
  await tabTo(page, target);
  await expect(target).toBeFocused();
  await page.keyboard.press(key);
}
async function type(page: Page, target: Locator, value: string) {
  await tabTo(page, target);
  await page.keyboard.type(value);
}

test("keyboard login with Tab, typing and Enter", async ({ page }) => {
  const mock = await a11yMock(page, "STUDENT", false);
  await page.goto("/login");
  await type(
    page,
    page.getByLabel("Утас, имэйл эсвэл нэвтрэх нэр", { exact: true }),
    "99000000",
  );
  await type(page, page.getByLabel("Нууц үг", { exact: true }), "99000000");
  await activate(
    page,
    page.getByRole("button", { name: "Нэвтрэх", exact: true }),
  );
  await expect(page).toHaveURL(/\/app\/student$/);
  await expect(
    page.getByRole("heading", { name: "Шалгалтын дүн", exact: true }),
  ).toBeVisible();
  expect(mock.calls.find((call) => call.path === "/auth/login")?.body).toEqual({
    identifier: "99000000",
    password: "99000000",
  });
  await mock.verify();
});
test("keyboard exam from preparation through persisted answer and submit", async ({
  page,
}) => {
  const mock = await a11yMock(page, "STUDENT");
  await page.goto("/app/tests/synthetic-exam");
  await activate(
    page,
    page.getByRole("button", { name: "Бэлтгэл шалга", exact: true }),
  );
  await activate(
    page,
    page.getByRole("button", { name: "Шалгалт эхлэх", exact: true }),
  );
  await activate(
    page,
    page.getByRole("button", { name: "Тийм, эхлэх", exact: true }),
  );
  await activate(
    page,
    page
      .getByRole("group", { name: "1-р бодлогын хариултын сонголтууд" })
      .getByRole("button", { name: "A", exact: true }),
    "Space",
  );
  await expect
    .poll(() =>
      mock.calls.some(
        (c) =>
          c.path.endsWith("/session") &&
          c.method === "PATCH" &&
          (c.body.answers as Record<string, unknown>)?.["synthetic-problem"] ===
            "A",
      ),
    )
    .toBe(true);
  await activate(
    page,
    page.getByRole("button", { name: "Тойм харах", exact: true }),
  );
  await activate(
    page,
    page.getByRole("button", { name: "Шалгалт илгээх", exact: true }),
  );
  await activate(
    page,
    page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Шалгалт илгээх", exact: true }),
  );
  await expect(
    page.getByRole("heading", { name: "Бодлого бүрийн дүн", exact: true }),
  ).toBeVisible();
  expect(mock.calls.filter((c) => c.path.endsWith("/submit"))).toHaveLength(1);
  await mock.verify();
});
test("keyboard formula search and detail navigation", async ({ page }) => {
  test.skip(
    !REQUIRE_INTEGRATION && !routeAvailable("/app/formulas"),
    "Missing formula library dependency: T09 #40",
  );
  const mock = await a11yMock(page, "STUDENT");
  await page.goto("/app/formulas");
  await type(page, page.getByRole("searchbox"), "Шугаман");
  // Search is debounced. Wait for the actual filtered result before leaving it.
  await expect(page).toHaveURL(/q=/);
  await expect(
    page.getByRole("status").filter({ hasText: /^1 томьёо$/ }),
  ).toBeVisible();
  await activate(
    page,
    page.getByRole("link", {
      name: "Шугаман тэгшитгэл дэлгэрэнгүй",
      exact: true,
    }),
  );
  await expect(
    page.getByRole("heading", { name: "Шугаман тэгшитгэл", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/formulas\/synthetic-linear$/);
  await mock.verify();
});
test("keyboard mistake retry retains a real server result before completion", async ({
  page,
}) => {
  test.skip(
    !REQUIRE_INTEGRATION && !routeAvailable("/app/mistakes"),
    "Missing mistake notebook dependency: T12 #38",
  );
  const mock = await a11yMock(page, "STUDENT");
  await page.goto("/app/mistakes");
  await activate(
    page,
    page.getByRole("button", { name: "Өнөөдрийн давтлага", exact: true }),
  );
  await expect(
    page.getByRole("heading", { name: "Давтлага 1 / 1" }),
  ).toBeFocused();
  await activate(
    page,
    page.getByRole("button", { name: "4", exact: true }),
    "Space",
  );
  await activate(
    page,
    page.getByRole("button", { name: "Дахин бодох", exact: true }),
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Зөв." }),
  ).toBeVisible();
  await activate(
    page,
    page.getByRole("button", { name: "Дүнгээ харах", exact: true }),
  );
  await expect(
    page.getByRole("status").filter({ hasText: "1 бодлогоос 1-ыг" }),
  ).toBeVisible();
  expect(mock.calls.find((c) => c.path.endsWith("/retry"))?.body).toEqual({
    answer: 1,
  });
  await mock.verify();
});
test("keyboard payment navigation from the student dashboard", async ({
  page,
}, info) => {
  const mock = await a11yMock(page, "STUDENT");
  await page.goto("/app/student");
  await expect(
    page.getByRole("heading", { name: "Шалгалтын дүн", exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile-375")
    await activate(
      page,
      page.getByRole("button", { name: "Бусад", exact: true }),
    );
  await activate(
    page,
    page.getByRole("link", { name: "Миний төлбөр", exact: true }),
  );
  await expect(page).toHaveURL(/\/app\/student\/payments$/);
  await expect(
    page.getByRole("heading", { name: "Хэдий хүртэл төлсөн", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Төлбөрийн түүх" })
      .getByText(/Баталгаажсан/),
  ).toBeVisible();
  await mock.verify();
});
