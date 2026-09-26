import { test, expect } from '@playwright/test';
import { mockApi } from './mock-api';

test('mistakes session cannot finish before a persisted retry and reports real outcome', async ({ page }) => {
  const mock = await mockApi(page);
  await page.goto('/app/mistakes');
  await page.getByRole('button', { name: 'Өнөөдрийн давтлага', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Давтлага 1 / 1' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Дүнгээ харах' })).toBeDisabled();
  await expect(page.getByText('Зөв хариу:', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Дахин бодох', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Дахин бодох', exact: true }).click();
  await expect(page.getByText('Одоохондоо зөрүүтэй байна.')).toBeVisible();
  await expect(page.getByText('Зөв хариу:', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Дахин бодох', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Дүнгээ харах' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 бодлогоос 0-ыг' })).toBeVisible();
  expect(mock.calls.filter(call => call.path.endsWith('/retry'))).toHaveLength(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await mock.verify();
});

test('empty due list stays empty instead of exposing the whole notebook as a session', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT', true, { emptyToday: true });
  await page.goto('/app/mistakes');
  await page.getByRole('button', { name: 'Өнөөдрийн давтлага', exact: true }).click();
  await expect(page.getByText('Өнөөдөр товлосон давтлага алга')).toBeVisible();
  await expect(page.getByTestId('mistake-mistake-1')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Дүнгээ харах' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Дэвтэртээ буцах' }).click();
  await expect(page.getByTestId('mistake-mistake-1')).toBeVisible();
  await mock.verify();
});

test('failed note and reason writes remain visibly unsaved; retry failure does not advance', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT', true, { failPatch: true, failRetryOnce: true });
  await page.goto('/app/mistakes');
  await page.getByRole('button', { name: 'Томьёо мартсан', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Хадгалж чадсангүй' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Томьёо мартсан', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('textbox', { name: 'Тэмдэглэл', exact: true }).fill('Дахин шалгах');
  await page.getByRole('button', { name: 'Тэмдэглэл хадгалах' }).click();
  await expect(page.getByText('Хадгалаагүй', { exact: false })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Тэмдэглэл', exact: true })).toHaveValue('Дахин шалгах');
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: 'Дахин бодох', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Хариуг шалгаж чадсангүй' })).toBeVisible();
  await expect(page.getByText('Зөв хариу:', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Дахин бодох', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Зөв.' })).toBeVisible();
  await mock.verify();
});

test('structured fill answers send named fields and preserve unsaved notes after grading', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT', true, { structured: true });
  await page.goto('/app/mistakes');
  await page.getByRole('textbox', { name: 'Тэмдэглэл', exact: true }).fill('Энэ ноорог үлдэнэ');
  await page.getByLabel('a нүд', { exact: true }).fill('3');
  await expect(page.getByRole('button', { name: 'Дахин бодох', exact: true })).toBeDisabled();
  await page.getByLabel('bc нүд', { exact: true }).fill('24');
  await page.getByRole('button', { name: 'Дахин бодох', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Зөв.' })).toBeVisible();
  expect(mock.calls.find(call => call.path.endsWith('/retry'))?.body).toEqual({ answer: { a: '3', bc: '24' } });
  await expect(page.getByRole('textbox', { name: 'Тэмдэглэл', exact: true })).toHaveValue('Энэ ноорог үлдэнэ');
  await page.getByRole('button', { name: 'Тэмдэглэл хадгалах' }).click();
  await expect(page.getByRole('button', { name: 'Тэмдэглэл хадгалах' })).toBeDisabled();
  expect(mock.calls.find(call => call.method === 'PATCH')?.body).toEqual({ note: 'Энэ ноорог үлдэнэ' });
  await mock.verify();
});

test('notebook can reach the next page without losing previous entries', async ({ page }) => {
  const mock = await mockApi(page, 'STUDENT', true, { paginated: true });
  await page.goto('/app/mistakes');
  await page.getByRole('button', { name: 'Дараагийн бодлогууд' }).click();
  await expect(page.getByTestId('mistake-mistake-1')).toBeVisible();
  await expect(page.getByTestId('mistake-mistake-2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Дараагийн бодлогууд' })).toHaveCount(0);
  await mock.verify();
});
