import {
  CODE_LENGTH,
  MAX_VERIFY_ATTEMPTS,
  generateCode,
  hashCode,
  isTokenIssuedAfterPasswordChange,
  isTokenUsable,
  maskIdentifier,
  safeEqualHex,
} from './password-reset.util';

describe('generateCode', () => {
  it('үргэлж 6 оронтой, зөвхөн цифр', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('тэргүүлэх тэгийг хадгална (000123 нь 123 болж хураагдахгүй)', () => {
    // 200 удаа үүсгээд бүгд 6 оронтой байгааг дээр шалгасан — энд төрлийг
    // баталгаажуулж, тоо руу хөрвүүлэх алдааг илрүүлнэ.
    const code = generateCode();
    expect(typeof code).toBe('string');
    expect(String(Number(code)).length).toBeLessThanOrEqual(CODE_LENGTH);
  });

  it('давтагдал бага (100 кодоос дийлэнх нь өвөрмөц)', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('hashCode', () => {
  it('ижил код + ижил түлхүүр → ижил хэш', () => {
    expect(hashCode('123456', 'secret')).toBe(hashCode('123456', 'secret'));
  });

  it('түлхүүр өөр бол хэш өөр (нууц түлхүүр үнэхээр оролцож байна)', () => {
    expect(hashCode('123456', 'secret-a')).not.toBe(hashCode('123456', 'secret-b'));
  });

  it('код өөр бол хэш өөр', () => {
    expect(hashCode('123456', 's')).not.toBe(hashCode('123457', 's'));
  });

  it('кодыг задлах боломжгүй (хэш дотор код харагдахгүй)', () => {
    expect(hashCode('123456', 's')).not.toContain('123456');
  });
});

describe('safeEqualHex', () => {
  it('ижил хэшийг зөв таниална', () => {
    const h = hashCode('123456', 's');
    expect(safeEqualHex(h, h)).toBe(true);
  });

  it('өөр хэшийг татгалзана', () => {
    expect(safeEqualHex(hashCode('1', 's'), hashCode('2', 's'))).toBe(false);
  });

  it('урт зөрвөл татгалзана', () => {
    expect(safeEqualHex('aabb', 'aabbcc')).toBe(false);
  });

  it('хоосон мөрийг татгалзана', () => {
    expect(safeEqualHex('', '')).toBe(false);
  });
});

describe('maskIdentifier', () => {
  it('утасны дугаарыг маскална', () => {
    expect(maskIdentifier('99112233')).toBe('9911****');
    expect(maskIdentifier('+976 9911 2233')).toBe('9911****');
  });

  it('имэйлийг маскална', () => {
    expect(maskIdentifier('usukhbayar@gmail.com')).toBe('us********@gmail.com');
  });

  it('танигдахгүй мөрийг бүрэн нууна', () => {
    expect(maskIdentifier('bagsh01')).toBe('****');
  });
});

describe('isTokenUsable', () => {
  const now = new Date('2026-07-30T10:00:00Z');
  const base = { expiresAt: new Date('2026-07-30T10:05:00Z'), consumedAt: null, attempts: 0 };

  it('шинэ, хугацаа дуусаагүй код хүчинтэй', () => {
    expect(isTokenUsable(base, now)).toBe(true);
  });

  it('хугацаа дууссан код хүчингүй', () => {
    expect(
      isTokenUsable({ ...base, expiresAt: new Date('2026-07-30T09:59:00Z') }, now),
    ).toBe(false);
  });

  it('нэгэнт ашигласан код дахин ажиллахгүй', () => {
    expect(isTokenUsable({ ...base, consumedAt: now }, now)).toBe(false);
  });

  it('оролдлогын хязгаар хэтэрсэн код үхнэ', () => {
    expect(isTokenUsable({ ...base, attempts: MAX_VERIFY_ATTEMPTS }, now)).toBe(false);
  });

  it('хязгаараас нэг дутуу оролдлого хүчинтэй хэвээр', () => {
    expect(isTokenUsable({ ...base, attempts: MAX_VERIFY_ATTEMPTS - 1 }, now)).toBe(true);
  });
});

describe('isTokenIssuedAfterPasswordChange', () => {
  it('нууц үг хэзээ ч солигдоогүй бол бүх токен хүчинтэй', () => {
    expect(isTokenIssuedAfterPasswordChange(1_700_000_000, null)).toBe(true);
  });

  it('нууц үг солигдохоос ӨМНӨ олгогдсон токен хүчингүй', () => {
    const changedAt = new Date('2026-07-30T10:00:00Z');
    const issuedBefore = Math.floor(new Date('2026-07-30T09:00:00Z').getTime() / 1000);
    expect(isTokenIssuedAfterPasswordChange(issuedBefore, changedAt)).toBe(false);
  });

  it('нууц үг солигдсоны ДАРАА олгогдсон токен хүчинтэй', () => {
    const changedAt = new Date('2026-07-30T10:00:00Z');
    const issuedAfter = Math.floor(new Date('2026-07-30T10:00:05Z').getTime() / 1000);
    expect(isTokenIssuedAfterPasswordChange(issuedAfter, changedAt)).toBe(true);
  });

  it('яг ижил секундэд олгогдсон токен хүчинтэй (өөрийгөө таслахгүй)', () => {
    const changedAt = new Date('2026-07-30T10:00:00.400Z');
    const issuedSame = Math.floor(changedAt.getTime() / 1000);
    expect(isTokenIssuedAfterPasswordChange(issuedSame, changedAt)).toBe(true);
  });

  it('iat байхгүй токеныг татгалзана', () => {
    expect(isTokenIssuedAfterPasswordChange(undefined, new Date())).toBe(false);
  });
});
