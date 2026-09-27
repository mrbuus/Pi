import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mockApi } from "./mock-api";
async function screenshot(page: Page, info: TestInfo, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}
async function next(page: Page) {
  await page
    .getByRole("button", { name: "Дараагийн карт", exact: true })
    .click();
}

test("T10 ten cards: flip, server-graded blank/true-false, four pairs, completion", async ({
  page,
}, info) => {
  const mock = await mockApi(page);
  await page.goto("/app/formulas/review");
  await page.getByRole("button", { name: "Эхлэх (10 карт)" }).click();
  await expect(page.getByRole("group", { name: "Өөрийн үнэлгээ" })).toHaveCount(
    0,
  );
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("group", { name: "Өөрийн үнэлгээ" }),
  ).toBeVisible();
  await screenshot(page, info, "flashcard");
  await page.keyboard.press("2");
  await expect(
    page.getByText("Өөрийн үнэлгээ хадгалагдлаа", { exact: true }),
  ).toBeVisible();
  await next(page);
  await expect(page.getByRole("main").locator(".katex")).toHaveCount(5);
  await expect(page.getByRole("main").locator(".katex-error")).toHaveCount(0);
  await expect
    .poll(() => page.getByRole("main").innerText())
    .not.toContain("\\frac");
  await page
    .getByRole("group", { name: "Хариултын сонголтууд" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByText("Дахин санаарай", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Хариултын сонголтууд" })
      .getByRole("button")
      .nth(1),
  ).toHaveClass(/bg-success/);
  await expect(page.getByRole("status").locator(".katex")).toHaveCount(1);
  await screenshot(page, info, "blank-feedback");
  await next(page);
  await page.getByRole("button", { name: "Худал", exact: true }).click();
  await expect(page.getByText("Зөв хариуллаа", { exact: true })).toBeVisible();
  await next(page);
  for (const [title, choice] of [
    [6, 1],
    [4, 3],
    [5, 2],
    [7, 0],
  ]) {
    await page
      .getByRole("group", { name: "Хосын гарчгууд" })
      .getByRole("button", { name: `Туршилтын томьёо ${title}`, exact: true })
      .click();
    await page
      .getByRole("group", { name: "Хосын томьёонууд" })
      .getByRole("button")
      .nth(choice)
      .click();
    await expect(
      page.getByText("Зөв хариуллаа", { exact: true }),
    ).toBeVisible();
    if (title === 6) await screenshot(page, info, "matching");
    await next(page);
  }
  await page.getByRole("button", { name: /Томьёоны хариуг харах/ }).click();
  await page.getByRole("button", { name: "Амархан", exact: true }).click();
  await next(page);
  await page
    .getByRole("group", { name: "Хариултын сонголтууд" })
    .getByRole("button")
    .nth(1)
    .click();
  await next(page);
  await page.getByRole("button", { name: "Худал", exact: true }).click();
  await page.getByRole("button", { name: "Дүнгээ харах", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "10/10 давтлаа" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Туршилтын томьёо 2", exact: true }),
  ).toHaveAttribute("href", "/app/formulas/synthetic-review-1");
  const posts = mock.calls.filter(
    (call) =>
      call.path.startsWith("/formulas/review/") && call.method === "POST",
  );
  expect(posts).toHaveLength(10);
  expect(posts[0].body).toEqual({
    exerciseToken: "synthetic-exercise-0",
    result: "HARD",
  });
  expect(posts[1].body).toEqual({
    exerciseToken: "synthetic-exercise-1",
    answer: "choice-1-4",
  });
  expect(
    posts
      .filter((call) => "answer" in call.body)
      .every((call) => !("result" in call.body)),
  ).toBe(true);
  await screenshot(page, info, "complete");
  await page.getByRole("button", { name: "Давталтын нүүр рүү" }).click();
  await expect(
    page.getByText("Өнөөдрийн давталт дууслаа", { exact: true }),
  ).toBeVisible();
  await mock.verify();
});

test("T10 save failure retains answer and retries identical exercise once", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "STUDENT", true, { failSaveOnce: true });
  await page.goto("/app/formulas/review");
  await page.getByRole("button", { name: "Эхлэх (10 карт)" }).click();
  await page.getByRole("button", { name: /Томьёоны хариуг харах/ }).click();
  await page.getByRole("button", { name: "Зөв", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Зохиомол хадгалах алдаа",
  );
  await expect(
    page.getByRole("button", { name: "Зөв", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Дараагийн карт" }),
  ).toHaveCount(0);
  await screenshot(page, info, "save-error");
  await page
    .getByRole("button", { name: "Дахин оролдох", exact: true })
    .click();
  await expect(
    page.getByText("Өөрийн үнэлгээ хадгалагдлаа", { exact: true }),
  ).toBeVisible();
  const posts = mock.calls.filter((call) => call.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[0].body).toEqual(posts[1].body);
  await next(page);
  await mock.verify();
});

test("T10 loading, failed home request, retry, empty state", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "PARENT", true, {
    empty: true,
    failLoadOnce: true,
    loadDelayMs: 250,
  });
  await page.goto("/app/formulas/review");
  await expect(
    page.getByRole("status", { name: "Давталт ачаалж байна" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Зохиомол ачаалах алдаа",
  );
  await page
    .getByRole("button", { name: "Дахин оролдох", exact: true })
    .click();
  await expect(
    page.getByText("Өнөөдрийн давталт дууслаа", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Эхлэх/ })).toHaveCount(0);
  expect(
    mock.calls.filter((call) => call.path === "/formulas/review/due"),
  ).toHaveLength(2);
  await screenshot(page, info, "empty");
  await mock.verify();
});

test("T10 reduced motion and keyboard grading require reveal", async ({
  page,
}) => {
  const mock = await mockApi(page, "TEACHER");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app/formulas/review");
  await page.getByRole("button", { name: "Эхлэх (10 карт)" }).click();
  await page.keyboard.press("3");
  expect(mock.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  const flip = page.getByRole("button", { name: /Томьёоны хариуг харах/ });
  await flip.click();
  expect(
    await page
      .getByRole("button", { name: /Томьёоны асуулт руу эргүүлэх/ })
      .locator(":scope > div")
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
  for (const button of await page
    .getByRole("group", { name: "Өөрийн үнэлгээ" })
    .getByRole("button")
    .all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("3");
  await expect(
    page.getByText("Өөрийн үнэлгээ хадгалагдлаа", { exact: true }),
  ).toBeVisible();
  await mock.verify();
});

test("T10 expired exercise reloads a fresh session without pretending to save", async ({
  page,
}) => {
  const mock = await mockApi(page, "STUDENT", true, {
    staleExerciseOnce: true,
  });
  await page.goto("/app/formulas/review");
  await page.getByRole("button", { name: "Эхлэх (10 карт)" }).click();
  await page.getByRole("button", { name: /Томьёоны хариуг харах/ }).click();
  await page.getByRole("button", { name: "Зөв", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Дасгалын хугацаа дууссан.",
  );
  await expect(
    page.getByRole("button", { name: "Дараагийн карт", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Давталтыг шинээр ачаалах", exact: true })
    .click();
  await page.getByRole("button", { name: "Эхлэх (10 карт)" }).click();
  await expect(
    page.getByRole("button", { name: /Томьёоны хариуг харах/ }),
  ).toBeVisible();
  expect(
    mock.calls.filter(
      (call) =>
        call.method === "POST" && call.path.startsWith("/formulas/review/"),
    ),
  ).toHaveLength(1);
  await mock.verify();
});
