import { securityNudge } from './auth.service';

/* Нууц үг = утасны дугаар хэвээр бол анхны нэвтрэлтээс хойш сануулна (эзэн 2026-11-14). */
describe('securityNudge', () => {
  const seen = new Date('2026-11-10T00:00:00Z');

  it('анхны нэвтрэлтэд (lastSeenAt=null) сануулахгүй', () => {
    expect(securityNudge('99000011', { phone: '99000011', lastSeenAt: null })).toEqual({});
  });

  it('дараагийн нэвтрэлтэд нууц үг = утас бол сануулна', () => {
    expect(securityNudge('99000011', { phone: '99000011', lastSeenAt: seen, googleIdentity: null })).toEqual({
      securityNudge: { passwordIsPhone: true, googleLinked: false },
    });
  });

  it('+976, зайтай бичсэн ч утас гэж танина; Gmail холбосныг дамжуулна', () => {
    expect(
      securityNudge('+976 9900 0011', { phone: '99000011', lastSeenAt: seen, googleIdentity: { email: 'x@gmail.com' } }),
    ).toEqual({ securityNudge: { passwordIsPhone: true, googleLinked: true } });
  });

  it('нууц үгээ сольсон бол юу ч буцаахгүй', () => {
    expect(securityNudge('synthetic-pass1', { phone: '99000011', lastSeenAt: seen })).toEqual({});
  });
});
