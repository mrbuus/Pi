import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mockApi } from "./mock-api";
import { dailyFormula } from "../../web/src/components/formulas/dailyFormula";
import {
  dateGroup,
  mongoliaDay,
} from "../../web/src/components/formulas/dateGroups";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "No horizontal page overflow",
  ).toBe(true);
}
async function mainTargets(page: Page) {
  for (const target of await page.locator("main button:visible").all()) {
    const box = await target.boundingBox();
    expect(
      Number(box?.height.toFixed(2)),
      `Touch target ${await target.innerText()}`,
    ).toBeGreaterThanOrEqual(44);
  }
}
async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
}
async function setQuery(page: Page, query: string) {
  await page.evaluate(
    (query) => window.history.replaceState(null, "", `/app/formulas?${query}`),
    query,
  );
}

test("catalog filters stay in the URL and detail reveals reasoning before answers", async ({
  page,
}, info) => {
  const mock = await mockApi(page);
  mock.formulas.listDelayMs = 500;
  await page.goto("/app/formulas");
  await expect(page.getByText("Томьёоны санг ачаалж байна")).toBeVisible();
  await expect(page.getByText("3 томьёо, 2 бүлэг")).toBeVisible();
  await page.getByLabel("Түвшин").selectOption("CORE");
  await page.getByLabel("Анги", { exact: true }).selectOption("8");
  await page.getByRole("searchbox").fill("Нийлбэр");
  await expect(page).toHaveURL(/q=/);
  await expect(
    page.getByRole("link", { name: "Шугаман тэгшитгэл дэлгэрэнгүй" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Нийлбэрийн куб дэлгэрэнгүй" }),
  ).toHaveCount(0);
  expect(mock.formulas.requests.filter((p) => p === "/formulas")).toHaveLength(
    1,
  );
  await noOverflow(page);
  await mainTargets(page);
  await shot(page, info, "catalog");
  await page
    .getByRole("link", { name: "Нийлбэрийн квадрат дэлгэрэнгүй" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Нийлбэрийн квадрат" }),
  ).toBeVisible();
  const derivation = page.locator("div.chunky").filter({
    has: page.getByRole("heading", { name: "Яагаад ийм болдог вэ" }),
  });
  await derivation
    .getByRole("button", { name: "Алхам харах", exact: true })
    .click();
  await expect(derivation.getByRole("listitem")).toHaveCount(1);
  await derivation.getByRole("button", { name: "Бүгдийг харах" }).click();
  await expect(derivation.getByRole("listitem")).toHaveCount(3);
  const example = page.locator("div.chunky").filter({
    has: page.getByRole("heading", { name: "Жишээ 1", exact: true }),
  });
  await expect(
    example.getByRole("heading", { name: "Хариу", exact: true }),
  ).toHaveCount(0);
  await example
    .getByRole("button", { name: "Алхам харах", exact: true })
    .click();
  await expect(
    example.getByRole("heading", { name: "Хариу", exact: true }),
  ).toHaveCount(0);
  await example
    .getByRole("button", { name: "Дараагийн алхам", exact: true })
    .click();
  await expect(
    example.getByRole("heading", { name: "Хариу", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Зохиомол дасгал — SYN-001")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ерөнхий дасгалын хуудас" }),
  ).toHaveAttribute("href", "/app/practice");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { copied?: string }).copied = text;
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Хуулах", exact: true }).click();
  await expect(page.getByText("LaTeX хууллаа")).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { copied?: string }).copied),
  ).toBe("(a+b)^2=a^2+2ab+b^2");
  await noOverflow(page);
  await mainTargets(page);
  await shot(page, info, "detail");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Synthetic denied clipboard");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Хуулах", exact: true }).click();
  await expect(
    page.getByText(
      "Хуулж чадсангүй. Хөтчийн хуулбарлах зөвшөөрлийг шалгаарай.",
    ),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("button", { name: "Хэвлэх", exact: true }),
  ).toBeHidden();
  await expect
    .poll(async () =>
      page.locator("main [data-formula-print] .katex-html").evaluateAll(
        (nodes) =>
          nodes.length > 0 &&
          nodes.every((node) => {
            const math = node.getBoundingClientRect(),
              clip = node
                .closest("[data-formula-print]")!
                .getBoundingClientRect();
            return (
              math.top >= clip.top - 1 &&
              math.bottom <= clip.bottom + 1 &&
              math.right <= clip.right + 1
            );
          }),
      ),
    )
    .toBe(true);
  await page.emulateMedia({ media: "screen" });
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("Нийлбэр");
  await expect(page.getByLabel("Түвшин")).toHaveValue("CORE");
  await mock.verify();
});

test("catalog has retry, collapsible sections, no results and empty states", async ({
  page,
}) => {
  const mock = await mockApi(page);
  mock.formulas.listFailures = 1;
  await page.goto("/app/formulas");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Дахин оролдох" }).click();
  const section = page.getByRole("button", { name: /Тоо ба алгебр/ });
  await expect(section).toHaveAttribute("aria-expanded", "true");
  await section.click();
  await expect(section).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("link", { name: "Нийлбэрийн квадрат дэлгэрэнгүй" }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("no-synthetic-match");
  await expect(
    page.getByText("Хайлтанд тохирох томьёо олдсонгүй"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Шүүлтүүр арилгах" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  mock.formulas.empty = true;
  await page.reload();
  await expect(
    page.getByText("Томьёоны сан хараахан нэмэгдээгүй байна"),
  ).toBeVisible();
  await mock.verify();
});

test("parent seen formulas group local dates and reject stale or forbidden child data", async ({
  page,
}, info) => {
  const mock = await mockApi(page, "PARENT");
  await page.clock.setFixedTime(new Date("2026-09-26T16:30:00Z"));
  await page.goto("/app/formulas?studentId=synthetic-child-a");
  await expect(
    page.getByText("Тестүүддээ 3/3 томьёотой таарсан"),
  ).toBeVisible();
  for (const name of ["Өнөөдөр", "Энэ долоо хоног", "Өмнө"])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  for (const name of [
    "Эзэмшсэн (8/10)",
    "Сайжирч байна (5/10)",
    "Давтах хэрэгтэй (4/10)",
  ])
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await noOverflow(page);
  await mainTargets(page);
  await shot(page, info, "seen");
  mock.formulas.delayedStudent = "synthetic-child-a";
  await setQuery(page, "studentId=synthetic-child-b");
  await expect(
    page.getByText(/Сүүлд: Хоёр дахь хүүхдийн шалгалт/).first(),
  ).toBeVisible();
  await setQuery(page, "studentId=synthetic-child-a");
  await expect
    .poll(
      () =>
        mock.formulas.requests.filter(
          (p) => p === "/formulas/my?studentId=synthetic-child-a",
        ).length,
    )
    .toBe(2);
  await expect(page.getByText(/Сүүлд: Хоёр дахь хүүхдийн шалгалт/)).toHaveCount(
    0,
  );
  await setQuery(page, "studentId=synthetic-child-b");
  await expect(
    page.getByText(/Сүүлд: Хоёр дахь хүүхдийн шалгалт/).first(),
  ).toBeVisible();
  await page.waitForTimeout(950); // Wait beyond the deliberately delayed, now obsolete child response.
  await expect(page.getByText(/Сүүлд: Эхний хүүхдийн шалгалт/)).toHaveCount(0);
  await setQuery(page, "studentId=forbidden-child");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page.getByText(/Сүүлд: Хоёр дахь хүүхдийн шалгалт/)).toHaveCount(
    0,
  );
  await mock.verify();
});

test("parent needs a student selection and an empty seen list links to tests", async ({
  page,
}) => {
  const mock = await mockApi(page, "PARENT");
  await page.goto("/app/formulas?view=my");
  await expect(
    page.getByText("Сурагчаа сонгоод туулсан томьёог нь хараарай"),
  ).toBeVisible();
  expect(mock.formulas.requests.some((p) => p.startsWith("/formulas/my"))).toBe(
    false,
  );
  mock.formulas.emptySeen = true;
  await setQuery(page, "studentId=synthetic-child-a&view=my");
  await expect(
    page.getByText("Тест өгөх тусам энд томьёо нэмэгдэнэ"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Тестүүд харах" }),
  ).toHaveAttribute("href", "/app/tests");
  await mock.verify();
});

test("detail recovers from errors, handles legacy empty fields and unknown slugs", async ({
  page,
}) => {
  const mock = await mockApi(page);
  mock.formulas.detailFailures = 1;
  await page.goto("/app/formulas/synthetic-square-sum");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await mainTargets(page);
  await page.getByRole("button", { name: "Дахин оролдох" }).click();
  await page.getByRole("link", { name: "Нийлбэрийн куб", exact: true }).click();
  await expect(
    page.getByText("Тайлбар хараахан нэмэгдээгүй байна."),
  ).toBeVisible();
  await expect(
    page.getByText("Жишээ хараахан нэмэгдээгүй байна"),
  ).toBeVisible();
  await expect(
    page.getByText("Холбоотой дасгал хараахан нэмэгдээгүй байна"),
  ).toBeVisible();
  await page.goto("/app/formulas/synthetic-unknown");
  await expect(page.getByText("Томьёо олдсонгүй")).toBeVisible();
  await mock.verify();
});

test("CORE print sheet filters sections and hides controls in A4 print", async ({
  page,
}, info) => {
  const mock = await mockApi(page);
  mock.formulas.sectionsFailures = 1;
  mock.formulas.printLong = true;
  await page.goto("/app/formulas/print?section=numbers-algebra");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Хэвлэх", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Дахин оролдох" }).click();
  await expect(
    page.getByRole("heading", { name: "Нийлбэрийн квадрат" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Нийлбэрийн куб" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Шугаман тэгшитгэл" }),
  ).toHaveCount(0);
  await noOverflow(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("aside")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Хэвлэх", exact: true }),
  ).toBeHidden();
  await expect
    .poll(
      async () =>
        page
          .locator("main [data-formula-print] .katex-html")
          .evaluateAll((nodes) =>
            nodes.every((node) => {
              const math = node.getBoundingClientRect();
              const clip = node
                .closest("[data-formula-print]")!
                .getBoundingClientRect();
              return (
                math.top >= clip.top - 1 &&
                math.bottom <= clip.bottom + 1 &&
                math.left >= clip.left - 1 &&
                math.right <= clip.right + 1
              );
            }),
          ),
      "Every printed expression fits inside its measured box",
    )
    .toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe(
    "rgb(0, 0, 0)",
  );
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  await shot(page, info, "print");
  if (info.project.name === "desktop-1280") {
    const pdf = await page.pdf({
      path: info.outputPath("formula-sheet.pdf"),
      preferCSSPageSize: true,
      printBackground: true,
    });
    // Chromium emits plain PDF page dictionaries. Catch a trailing shell/Letter page.
    const dictionaries = pdf.toString("latin1");
    expect(dictionaries.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
    const box = dictionaries.match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/);
    expect(Number(box?.[1])).toBeCloseTo(595, 0);
    expect(Number(box?.[2])).toBeCloseTo(842, 0);
  }
  await page.emulateMedia({ media: "screen" });
  await page.getByLabel("Бүлэг", { exact: true }).selectOption("");
  await expect(
    page.getByRole("heading", { name: "Шугаман тэгшитгэл" }),
  ).toBeVisible();
  expect(
    mock.formulas.requests.filter((p) => p === "/formulas?level=CORE"),
  ).toHaveLength(1);
  await page.evaluate(() =>
    window.history.replaceState(
      null,
      "",
      "/app/formulas/print?section=missing-section",
    ),
  );
  await expect(page.getByText("Хэвлэх томьёо олдсонгүй")).toBeVisible();
  await mock.verify();
});

for (const role of ["TEACHER", "TEACHER_PLUS", "ADMIN", "BUYER"]) {
  test(`${role} can read the library without a student practice link`, async ({
    page,
  }) => {
    const mock = await mockApi(page, role);
    await page.goto("/app/formulas");
    await page
      .getByRole("link", { name: "Нийлбэрийн квадрат дэлгэрэнгүй" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Нийлбэрийн квадрат" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ерөнхий дасгалын хуудас" }),
    ).toHaveCount(0);
    await mock.verify();
  });
}

test("date groups use Ulaanbaatar midnight and Monday boundaries", () => {
  const monday = new Date("2026-09-27T16:01:00Z");
  expect(mongoliaDay(monday)).toBe(Date.UTC(2026, 8, 28));
  expect(dateGroup("2026-09-27T16:00:00Z", monday)).toBe("today");
  expect(dateGroup("2026-09-27T15:59:59Z", monday)).toBe("earlier");
  expect(dateGroup(null, monday)).toBe("earlier");
});

test("large catalogs defer cards after thirty and keep filtering local", async ({
  page,
}) => {
  const mock = await mockApi(page);
  mock.formulas.extraCount = 35;
  await page.goto("/app/formulas");
  await expect(page.getByText("38 томьёо, 2 бүлэг")).toBeVisible();
  expect(
    await page
      .locator("main article")
      .evaluateAll(
        (nodes) =>
          nodes.filter(
            (node) => getComputedStyle(node).contentVisibility === "auto",
          ).length,
      ),
  ).toBe(8);
  await page.getByRole("searchbox").fill("Зохиомол томьёо 35");
  await expect(
    page.getByRole("link", { name: "Зохиомол томьёо 35 дэлгэрэнгүй" }),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(1);
  expect(mock.formulas.requests.filter((p) => p === "/formulas")).toHaveLength(
    1,
  );
  await noOverflow(page);
  await mock.verify();
});

test("student query parameters cannot select a different seen-formula owner", async ({
  page,
}) => {
  const mock = await mockApi(page);
  await page.goto("/app/formulas?studentId=forbidden-child&view=my");
  await expect(
    page.getByText("Тестүүддээ 3/3 томьёотой таарсан"),
  ).toBeVisible();
  expect(
    mock.formulas.requests.filter((p) => p.startsWith("/formulas/my")),
  ).toEqual(["/formulas/my"]);
  await mock.verify();
});

test("daily selection is stable within a local day, independent of order and CORE only", () => {
  const rows = [
    { slug: "z", level: "CORE" },
    { slug: "a", level: "CORE" },
    { slug: "x", level: "EXTRA" },
  ];
  const start = new Date("2026-09-26T16:00:00Z"),
    end = new Date("2026-09-27T15:59:59Z");
  expect(dailyFormula(rows, start)).toEqual(
    dailyFormula([...rows].reverse(), end),
  );
  expect(dailyFormula(rows, start)?.level).toBe("CORE");
  expect(dailyFormula(rows, new Date("2026-09-27T16:00:00Z"))).not.toEqual(
    dailyFormula(rows, start),
  );
  expect(
    dailyFormula([{ slug: "extra", level: "EXTRA" }], start),
  ).toBeUndefined();
  expect(dailyFormula([], start)).toBeUndefined();
});
