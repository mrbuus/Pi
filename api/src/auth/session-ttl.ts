/**
 * «Намайг сана» (эзэн 2026-10-22) — JWT-ийн хугацаа.
 *
 * Вэб: чагталсан бол токеныг localStorage-д (хөтөч хаасан ч үлдэнэ), эс бол
 * sessionStorage-д (хөтөч/таб хаахад устана) хадгална. Сервер талд мөн хугацааг
 * ялгана — sessionStorage-ийг хөтөч сэргээх (session restore) үед ч богино
 * токен 12 цагийн дараа өөрөө дуусна (нийтийн компьютер дээр үлдэхгүй).
 *
 * `remember` ирээгүй (хуучин клиент, бүртгэл) бол JwtModule-ийн 7 хоног хэвээр.
 */
export const REMEMBER_ME_TTL = '30d' as const;
export const SESSION_ONLY_TTL = '12h' as const;
export type TokenTtl = typeof REMEMBER_ME_TTL | typeof SESSION_ONLY_TTL;

export function tokenTtl(remember: boolean | undefined): TokenTtl | undefined {
  if (remember === true) return REMEMBER_ME_TTL;
  if (remember === false) return SESSION_ONLY_TTL;
  return undefined;
}
