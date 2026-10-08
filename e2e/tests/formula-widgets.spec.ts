import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./mock-api";
const names = [
  "square-of-sum",
  "difference-of-squares",
  "quadratic-graph",
  "vieta",
  "abs-graph",
  "exp-graph",
  "log-graph",
  "unit-circle",
  "sine-graph",
  "arith-seq",
  "geom-seq",
  "pascal-triangle",
  "probability-dice",
  "derivative-tangent",
  "integral-area",
  "pythagoras",
  "triangle-area",
  "inscribed-angle",
  "circle-sector",
  "prism-volume",
  "cone-cylinder",
  "vector-add",
  "line-slope",
];
async function choose(page: Page, slug: string) {
  await page.getByLabel("Интерактив зураг сонгох").selectOption(slug);
  const card = page.locator(`[data-widget="${slug}"]`);
  await expect(card.getByRole("slider").first()).toBeVisible();
  return card;
}
async function noBrokenMath(page: Page) {
  await expect(page.getByText("LaTeX алдаа", { exact: true })).toHaveCount(0);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("[data-widget] svg")
      .evaluateAll((svgs) =>
        svgs.some((svg) => /NaN|Infinity/.test(svg.innerHTML)),
      ),
  ).toBe(false);
}
for (const slug of names)
  test(`widget ${slug}: keyboard, boundaries, local-only`, async ({
    page,
  }, info) => {
    const mock = await mockApi(page, "ADMIN");
    await page.goto("/app/formulas/widgets");
    const card = await choose(page, slug);
    await noBrokenMath(page);
    const before = await card.innerText();
    const slider = card.getByRole("slider").first();
    await slider.focus();
    await slider.press("ArrowRight");
    await expect.poll(() => card.innerText()).not.toBe(before);
    const calls = mock.calls.length;
    for (const boundary of ["Home", "End"]) {
      await slider.press(boundary);
      await noBrokenMath(page);
    }
    await slider.press("Home");
    await slider.press("ArrowRight");
    await noBrokenMath(page);
    expect(mock.calls.length).toBe(calls);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`${slug}.png`),
      fullPage: true,
    });
    await mock.verify();
  });
test("widget special cases and pointer gestures", async ({ page }, info) => {
  const mock = await mockApi(page, "TEACHER_PLUS");
  await page.goto("/app/formulas/widgets");
  let card = await choose(page, "quadratic-graph");
  const a = card.getByRole("slider", { name: "Квадрат гишүүний коэффициент" });
  await a.press("Home");
  for (let i = 0; i < 6; i++) await a.press("ArrowRight");
  await expect(card.getByText(/Квадрат гишүүн тэг/)).toBeVisible();
  await card
    .getByRole("slider", { name: "Шугаман гишүүний коэффициент" })
    .press("Home");
  for (let i = 0; i < 6; i++)
    await card
      .getByRole("slider", { name: "Шугаман гишүүний коэффициент" })
      .press("ArrowRight");
  await expect(card.getByText(/Тэгшитгэл шийдгүй/)).toBeVisible();
  card = await choose(page, "log-graph");
  await card.getByRole("slider").press("Home");
  for (let i = 0; i < 3; i++)
    await card.getByRole("slider").press("ArrowRight");
  await expect(card.locator("[data-widget-values]")).toContainText(
    "тодорхойгүй",
  );
  card = await choose(page, "unit-circle");
  const svg = card.getByRole("img");
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  if (!box) throw Error("SVG missing");
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.16);
  await page.mouse.up();
  await expect(card.getByRole("slider")).toHaveValue("90");
  await expect(card.locator("[data-widget-values]").last()).toContainText(
    "тодорхойгүй",
  );
  card = await choose(page, "derivative-tangent");
  const graph = card.getByRole("img");
  await graph.scrollIntoViewIfNeeded();
  const rect = await graph.boundingBox();
  if (!rect) throw Error("SVG missing");
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.75, rect.y + rect.height * 0.5);
  await page.mouse.up();
  await expect(
    card.getByRole("slider", { name: "Шүргэлтийн цэг" }),
  ).not.toHaveValue("1");
  card = await choose(page, "probability-dice");
  await expect(
    card.locator("[data-widget-values]").filter({ hasText: "туршилтгүй" }),
  ).toHaveCount(6);
  await card.getByRole("button", { name: "Шоо шидэх", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Нийт 100 шидэлт. Дээд хязгаар 10000.",
  );
  await card.getByRole("button", { name: "Дахин эхлэх", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText(
    "Нийт 0 шидэлт. Дээд хязгаар 10000.",
  );
  await expect(
    card.locator("[data-widget-values]").filter({ hasText: "туршилтгүй" }),
  ).toHaveCount(6);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await noBrokenMath(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("dark-reduced.png"),
    fullPage: true,
  });
  await mock.verify();
});
test("widget gallery requires ADMIN or TEACHER_PLUS role", async ({ page }) => {
  const mock = await mockApi(page, "STUDENT");
  await page.goto("/app/formulas/widgets");
  await expect(
    page.getByText("Энэ үзүүлэн багшийн эрхтэй хэрэглэгчид нээлттэй", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Интерактив зураг сонгох")).toHaveCount(0);
  await mock.verify();
});
