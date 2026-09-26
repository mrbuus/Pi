import { test, expect, type Page, type TestInfo, type Locator } from '@playwright/test';
import { mockApi } from './mock-api';
async function snapshot(page: Page, info: TestInfo, name: string, mask: Locator[] = [], checkWidth = true) {
  if (checkWidth) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page-wide horizontal scrolling').toBe(true);
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true, mask });
  await info.attach(name, { path, contentType: 'image/png' });
}
test('01 нэвтрэх болон сурагчийн самбар', async ({ page }, info) => {
  const mock = await mockApi(page, 'STUDENT', false);
  await page.goto('/login');
  await page.getByLabel('Утас, имэйл эсвэл нэвтрэх нэр', { exact: true }).fill('99000000');
  await page.getByLabel('Нууц үг', { exact: true }).fill('99000000');
  await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/student$/);
  await expect(page.getByRole('heading', { name: 'Миний самбар', exact: true })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Шалгалтын дүн', exact: true })).toBeVisible();
  expect(mock.calls.find(c => c.path === '/auth/login')?.body).toEqual({ identifier: '99000000', password: '99000000' });
  await snapshot(page, info, 'student-dashboard'); await mock.verify();
});
test('02 буруу нууц үг алдаа үзүүлж нэвтрүүлэхгүй', async ({ page }, info) => {
  const mock = await mockApi(page, 'STUDENT', false); await page.goto('/login');
  await page.getByLabel('Утас, имэйл эсвэл нэвтрэх нэр', { exact: true }).fill('99000000');
  await page.getByLabel('Нууц үг', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  await expect(page.getByText('Нэвтрэх мэдээлэл буруу байна', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('pi_token'))).toBeNull();
  await snapshot(page, info, 'login-error'); await mock.verify();
});
test('03 шалгалтыг эхэлж хариулаад дүн авах', async ({ page }, info) => {
  const mock = await mockApi(page); await page.goto('/app/tests/synthetic-exam');
  await page.getByRole('button', { name: 'Бэлтгэл шалга', exact: true }).click();
  await page.getByRole('button', { name: 'Шалгалт эхлэх', exact: true }).click();
  await page.getByRole('button', { name: 'Тийм, эхлэх', exact: true }).click();
  await page.getByRole('group', { name: '1-р бодлогын хариултын сонголтууд' }).getByRole('button', { name: 'A', exact: true }).click();
  await expect.poll(() => mock.calls.some(c => c.path.endsWith('/session') && c.method === 'PATCH' && (c.body.answers as Record<string, unknown> | undefined)?.['synthetic-problem'] === 'A')).toBe(true);
  await snapshot(page, info, 'exam-question');
  await page.getByRole('button', { name: 'Тойм харах', exact: true }).click();
  await page.getByRole('button', { name: 'Шалгалт илгээх', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Шалгалт илгээх', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Бодлого бүрийн дүн', exact: true })).toBeVisible();
  expect(mock.calls.filter(c => c.path.endsWith('/submit'))).toHaveLength(1);
  expect(mock.calls.find(c => c.path.endsWith('/submit'))?.body.answers).toEqual({ 'synthetic-problem': 'A' });
  await snapshot(page, info, 'exam-result'); await mock.verify();
});
test('04 сурагч төлбөрийн хугацаа болон түүхээ харах', async ({ page }, info) => {
  const mock = await mockApi(page); await page.goto('/app/student/payments');
  await expect(page.getByRole('heading', { name: 'Хэдий хүртэл төлсөн', exact: true })).toBeVisible();
  await expect(page.getByText('2026.10.20', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Төлбөрийн түүх' }).getByText(/Баталгаажсан/)).toBeVisible();
  await snapshot(page, info, 'student-payments', [page.getByRole('region', { name: 'Хэрхэн төлөх вэ' }), page.getByText('Сарын төлбөр', { exact: true }).locator('..')]); await mock.verify();
});
test('05 багш ирц тэмдэглэж хадгалах', async ({ page }, info) => {
  const mock = await mockApi(page, 'TEACHER'); await page.goto('/app/teacher');
  await page.getByRole('tab', { name: 'Ирц', exact: true }).click();
  const group = page.getByRole('group', { name: /ирцийн төлөв/ });
  await group.getByRole('button', { name: 'Ирсэн', exact: true }).click();
  await page.getByRole('button', { name: 'Хадгалах', exact: true }).click();
  await expect.poll(() => mock.calls.filter(c => c.path.endsWith('/attendance') && c.method === 'POST').length).toBeGreaterThan(0);
  expect(mock.calls.find(c => c.path.endsWith('/attendance') && c.method === 'POST')?.body.entries).toEqual([{ studentId: 'synthetic-student', status: 'PRESENT' }]);
  await expect(group.getByRole('button', { name: 'Ирсэн', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await snapshot(page, info, 'teacher-attendance'); await mock.verify();
});
test('06 багш гэрийн даалгаврыг тэмдэглэх', async ({ page }, info) => {
  const mock = await mockApi(page, 'TEACHER'); await page.goto('/app/teacher');
  await page.getByRole('tab', { name: 'Даалгавар', exact: true }).click();
  const button = page.getByRole('group', { name: /даалгаврын тэмдэг/ }).getByRole('button', { name: 'Хийсэн', exact: true });
  await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => mock.calls.filter(c => c.method === 'PATCH').length).toBe(1);
  expect(mock.calls.find(c => c.method === 'PATCH')?.body).toMatchObject({ status: 'DONE' });
  await snapshot(page, info, 'teacher-homework'); await mock.verify();
});
test('07 админ шинэ хэрэглэгч нэмэх', async ({ page }, info) => {
  const mock = await mockApi(page, 'ADMIN'); await page.goto('/app/admin');
  const form = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Шинэ хэрэглэгч нэмэх', exact: true }) });
  await form.getByLabel('Нэр', { exact: true }).fill('Шинэ');
  await page.getByLabel('Овог', { exact: true }).fill('Зохиомол');
  await page.getByLabel('Утас', { exact: true }).fill('99000000');
  await page.getByLabel('Эрх', { exact: true }).selectOption('STUDENT');
  await page.getByRole('button', { name: 'Нэмэх', exact: true }).click();
  await expect(page.getByText('Хэрэглэгч үүслээ — анхны нууц үг нь утасны дугаар', { exact: true })).toBeVisible();
  expect(mock.calls.find(c => c.method === 'POST' && c.path === '/users')?.body).toEqual({ firstName: 'Шинэ', lastName: 'Зохиомол', phone: '99000000', role: 'STUDENT' });
  // The protected admin dashboard has an existing mobile overflow; tracked by a dedicated expected-failure below.
  await snapshot(page, info, 'admin-create-user', [], false); await mock.verify();
});
test('08 эцэг эх хүүхдийн дүн ирц даалгаврыг харах', async ({ page }, info) => {
  const mock = await mockApi(page, 'PARENT'); await page.goto('/app/parent');
  await expect(page.getByRole('heading', { name: 'Туршилт Зохиомол', exact: true })).toBeVisible();
  await expect(page.getByText('8/10 оноо', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сүүлийн даалгаврууд', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сүүлийн ирц', exact: true })).toBeVisible();
  await snapshot(page, info, 'parent-progress'); await mock.verify();
});

test('09 админ самбар 375px-т хэвтээ гүйлгэхгүй', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-375', 'Зөвхөн утасны өргөнд хамаатай');
  const mock = await mockApi(page, 'ADMIN'); await page.goto('/app/admin');
  await expect(page.getByRole('heading', { name: 'Шинэ хэрэглэгч нэмэх', exact: true })).toBeVisible();
  await mock.verify();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: 'Admin dashboard must fit 375px' }).toBeLessThanOrEqual(375);
});
