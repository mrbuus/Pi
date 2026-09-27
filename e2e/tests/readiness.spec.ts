import { expect, test } from '@playwright/test';
import { mockApi } from './mock-api';

test('readiness journey: confidence, topic actions, and own goal', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT');
  await page.goto('/app/readiness');
  await expect(page.getByRole('heading', { name: 'Бэлэн байдал', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Бэлэн байдал ойролцоогоор 62/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сэдвийн эзэмшил' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Дараагийн алхам' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Дасгал' }).first()).toHaveAttribute('href', '/app/practice');
  await expect(page.getByRole('link', { name: 'Томьёо' }).first()).toHaveAttribute('href', '/app/formulas?q=TRIG');
  await expect(page.getByRole('link', { name: 'Алдаагаа давтах' }).first()).toHaveAttribute('href', '/app/mistakes');
  const goal = page.getByLabel(/зорьж буй бэлэн байдлын индекс/i);
  await goal.fill('150');
  await page.getByRole('button', { name: 'Зорилго хадгалах' }).click();
  await expect(page.getByText('Бүхэл тоогоор 0–100 хооронд оруулна уу.', { exact: true })).toBeVisible();
  expect(mock.calls.filter(c => c.path === '/goals' && c.method === 'POST')).toHaveLength(0);
  await goal.fill('78');
  await page.getByRole('button', { name: 'Зорилго хадгалах' }).dblclick();
  await expect.poll(() => mock.calls.some(c => c.path === '/goals' && c.method === 'POST' && c.body.title === 'Бэлэн байдлын зорилго: 78')).toBe(true);
  await expect.poll(() => mock.calls.filter(c => c.path === '/goals' && c.method === 'POST').length).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await mock.verify();
});
