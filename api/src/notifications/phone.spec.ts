import { maskPhone, toE164Mn, toNationalMn } from './phone';

describe('toNationalMn', () => {
  it('8 оронтой дугаарыг хэвээр буцаана', () => {
    expect(toNationalMn('99112233')).toBe('99112233');
  });

  it('зай, зураас, хаалтыг үл тоомсорлоно', () => {
    expect(toNationalMn('9911 2233')).toBe('99112233');
    expect(toNationalMn('9911-2233')).toBe('99112233');
    expect(toNationalMn('(9911) 2233')).toBe('99112233');
  });

  it('+976 угтварыг хасна', () => {
    expect(toNationalMn('+97699112233')).toBe('99112233');
    expect(toNationalMn('+976 9911 2233')).toBe('99112233');
    expect(toNationalMn('976-99112233')).toBe('99112233');
  });

  it('олон улсын 00 угтварыг хасна', () => {
    expect(toNationalMn('0097699112233')).toBe('99112233');
  });

  it('буруу уртыг null болгоно', () => {
    expect(toNationalMn('123')).toBeNull();
    expect(toNationalMn('991122334455')).toBeNull();
    expect(toNationalMn('')).toBeNull();
    expect(toNationalMn(null)).toBeNull();
    expect(toNationalMn(undefined)).toBeNull();
  });

  it('цифргүй утгыг null болгоно', () => {
    expect(toNationalMn('утас байхгүй')).toBeNull();
  });
});

describe('toE164Mn', () => {
  it('E.164 хэлбэрт оруулна', () => {
    expect(toE164Mn('99112233')).toBe('+97699112233');
    expect(toE164Mn('+976 9911 2233')).toBe('+97699112233');
  });

  it('танигдахгүй бол null', () => {
    expect(toE164Mn('12')).toBeNull();
  });
});

describe('maskPhone', () => {
  it('сүүлийн 4 цифрийг нууна', () => {
    expect(maskPhone('99112233')).toBe('9911****');
    expect(maskPhone('+97680333020')).toBe('8033****');
  });

  it('танигдахгүй дугаарыг бүрэн нууна', () => {
    expect(maskPhone(null)).toBe('****');
    expect(maskPhone('abc')).toBe('****');
  });
});
