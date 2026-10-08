import {
  PASSWORD_POLICY_MESSAGE,
  isSameAsPhone,
  validatePasswordStrength,
} from './password-policy';

describe('validatePasswordStrength', () => {
  it('8+ тэмдэгт, латин үсэг ба тоотой бол зөв', () => {
    expect(validatePasswordStrength('abcdefg1')).toBeNull();
    expect(validatePasswordStrength('Passw0rd!')).toBeNull();
  });

  it('кирилл үсэг ч үсэгт тооцогдоно', () => {
    expect(validatePasswordStrength('нууцүг12')).toBeNull();
    expect(validatePasswordStrength('Өлзий2024')).toBeNull();
  });

  it('8-аас богино бол татгалзана', () => {
    expect(validatePasswordStrength('abc1234')).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it('үсэггүй (утасны дугаар шиг) бол татгалзана', () => {
    expect(validatePasswordStrength('99112233')).toBe(PASSWORD_POLICY_MESSAGE);
    expect(validatePasswordStrength('12345678!')).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it('тоогүй бол татгалзана', () => {
    expect(validatePasswordStrength('abcdefgh')).toBe(PASSWORD_POLICY_MESSAGE);
    expect(validatePasswordStrength('нууцүгнууц')).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it('мөр биш утга татгалзагдана', () => {
    expect(validatePasswordStrength(undefined)).toBe(PASSWORD_POLICY_MESSAGE);
    expect(validatePasswordStrength(12345678)).toBe(PASSWORD_POLICY_MESSAGE);
  });
});

describe('isSameAsPhone', () => {
  it('яг ижил дугаар', () => {
    expect(isSameAsPhone('99112233', '99112233')).toBe(true);
  });

  it('+976, зай, зураастай бичсэн ч ижилд тооцно', () => {
    expect(isSameAsPhone('+976 9911-2233', '99112233')).toBe(true);
    expect(isSameAsPhone('99112233', '+97699112233')).toBe(true);
  });

  it('өөр нууц үг, эсвэл утасгүй хэрэглэгч', () => {
    expect(isSameAsPhone('abc99112233', '99112233')).toBe(false);
    expect(isSameAsPhone('99112234', '99112233')).toBe(false);
    expect(isSameAsPhone('99112233', null)).toBe(false);
  });
});
