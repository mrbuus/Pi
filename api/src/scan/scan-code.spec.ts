import { generateScanCode, normalizeScanCode, SCAN_CODE_LENGTH, scanUrl } from './scan-code';

describe('generateScanCode', () => {
  it('8 тэмдэгт, зөвхөн Crockford цагаан толгой', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateScanCode();
      expect(code).toHaveLength(SCAN_CODE_LENGTH);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
    }
  });

  it('санамсаргүй эх үүсвэрийг ашиглана', () => {
    expect(generateScanCode(() => 0)).toBe('00000000');
    expect(generateScanCode(() => 31)).toBe('ZZZZZZZZ');
  });
});

describe('normalizeScanCode', () => {
  it('жижиг үсэг, зай, зураасыг хүлээн авна', () => {
    expect(normalizeScanCode('ab12-cd34')).toBe('AB12CD34');
    expect(normalizeScanCode(' AB12 CD34 ')).toBe('AB12CD34');
  });

  it('андуурагддаг O, I, L-ийг цифр болгоно', () => {
    expect(normalizeScanCode('OILO1234')).toBe('01101234');
  });

  it.each([['ABC'], ['ABCDEFGHJ'], ['AB12CD3U'], ['AB12CD3!'], [''], [null], [42], ['A'.repeat(41)]])(
    'буруу оролт %p → null',
    (input) => {
      expect(normalizeScanCode(input)).toBeNull();
    },
  );

  it('URL нь pimath.mn/q/ хэлбэртэй', () => {
    expect(scanUrl('AB12CD34')).toBe('https://pimath.mn/q/AB12CD34');
  });
});
