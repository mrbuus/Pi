import { normalizePath, normalizeTarget } from './usage-normalize';

describe('Хэрэглээний бүртгэлийн цэвэрлэгээ — агуулга, ID хадгалахгүй', () => {
  it('замын ID, огноо, query-г хасна; тоогүй slug хэвээр', () => {
    expect(normalizePath('/app/admin/students/cmuzbjy4401drny7nk91tqkfl?tab=pay#x')).toBe(
      '/app/admin/students/:id',
    );
    expect(normalizePath('/app/tests/123/review')).toBe('/app/tests/:id/review');
    expect(normalizePath('/app/schedule/2026-11-04')).toBe('/app/schedule/:id');
    expect(normalizePath('/app/homework-practice-online')).toBe('/app/homework-practice-online');
    expect(normalizePath('https://evil.example/x')).toBeNull();
  });

  it('товчны түлхүүр: зөвхөн track/link/icon, богино аюулгүй бичвэр', () => {
    expect(normalizeTarget('track:tab:Хуваарь')).toBe('track:tab:Хуваарь');
    expect(normalizeTarget('icon:laptop')).toBe('icon:laptop');
    expect(normalizeTarget('link:/app/admin/students/cmuzbjy4401drny7nk91tqkfl')).toBe(
      'link:/app/admin/students/:id',
    );
    expect(normalizeTarget('text:Бат-Эрдэнэ Болд')).toBeNull();
    expect(normalizeTarget('track:<script>')).toBeNull();
    expect(normalizeTarget(undefined)).toBeNull();
  });
});
