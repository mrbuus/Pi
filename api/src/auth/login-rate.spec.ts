import { LoginAttempts, RateWindow } from './login-attempts';

describe('Нэвтрэлтийн хязгаар (2026-11-05 аудит)', () => {
  it('RateWindow: нэг IP-аас цонхонд limit хүртэл, дараа нь татгалзаж, цонх өнгөрмөгц сэргэнэ', () => {
    let now = 0;
    const w = new RateWindow(3, 60_000, () => now);
    expect([w.hit('1.1.1.1'), w.hit('1.1.1.1'), w.hit('1.1.1.1')]).toEqual([true, true, true]);
    expect(w.hit('1.1.1.1')).toBe(false);
    expect(w.hit('2.2.2.2')).toBe(true); // өөр IP тусдаа
    now = 60_001;
    expect(w.hit('1.1.1.1')).toBe(true);
  });

  it('бүртгэлийн (userId) тоолуур: өөр нэвтрэх нэрээр оролдсон ч 8 дахь бурууд түгжигдэнэ', () => {
    const acc = new LoginAttempts(() => 0);
    for (let i = 0; i < 7; i++) acc.failure('user-1');
    expect(acc.isLocked('user-1')).toBe(false);
    acc.failure('user-1');
    expect(acc.isLocked('user-1')).toBe(true);
  });
});
