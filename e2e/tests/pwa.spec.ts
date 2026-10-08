import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';
const entry = { slug: 'synthetic-sum', title: 'Туршилтын нийлбэр', latex: 'a+b', general: 'a+b', explanation: 'Хоёр тооны нийлбэр.', conditions: [], derivation: ['$1+2=3$'], mnemonic: '', commonMistakes: [], eeshTip: '', savedAt: '2026-09-26T00:00:00.000Z', examples: [{ problem: '$1+2$ нийлбэрийг ол.', steps: ['$1+2=3$'], answer: '$3$' }] };

test('PWA offline catalog: empty, cached math, search and clear', async ({ page }, info) => {
  const mock = await mockApi(page, 'STUDENT', false);
  await page.goto('/offline');
  await expect(page.getByRole('heading', { name: 'Хадгалсан томьёо', exact: true })).toBeVisible();
  await expect(page.getByText('Хадгалсан томьёо хараахан алга', { exact: true })).toBeVisible();
  await page.evaluate(async item => {
    const cache = await caches.open('pi-public-formulas-v1');
    await cache.put('/offline/formula/synthetic-sum.json', new Response(JSON.stringify(item)));
  }, entry);
  await page.getByRole('button', { name: 'Жагсаалтыг сэргээх' }).click();
  await expect(page.getByText(entry.title, { exact: true })).toBeVisible();
  await expect(page.locator('.katex').first()).toBeVisible();
  await page.getByLabel('Томьёо хайх').fill('байхгүй');
  await expect(page.getByText('Хайлтад тохирох томьёо алга')).toBeVisible();
  await page.getByLabel('Томьёо хайх').fill('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('offline-catalog.png'), fullPage: true });
  await page.getByRole('button', { name: 'Хадгалалтыг цэвэрлэх', exact: true }).click();
  await page.getByRole('button', { name: 'Тийм, цэвэрлэх', exact: true }).click();
  await expect(page.getByText('Хадгалсан томьёо хараахан алга', { exact: true })).toBeVisible();
  await mock.verify();
});

test('PWA install prompt dismisses without claiming installation', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT', false);
  await page.goto('/offline');
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Суулгах', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Суулгах', exact: true })).toHaveCount(0);
  await expect(page.getByText('Pi.mn энэ төхөөрөмжид суусан байна.')).toHaveCount(0);
  await mock.verify();
});
