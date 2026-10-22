import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

/**
 * Gmail-ээр бүртгүүлэх тасалбар (эзэн 2026-10-21): Google баталгаажуулсан ч
 * pimath.mn-д бүртгэлгүй хүнийг бүртгэлийн хуудас руу 15 минутын тасалбартай
 * илгээнэ. Бүртгүүлэхэд нь тасалбараас Gmail-ийг уншиж автоматаар холбоно.
 *
 * Тусдаа нууц (JWT_SECRET + «:google-signup»), `sub` талбаргүй — тасалбарыг
 * нэвтрэх токен болгон ашиглах боломжгүй. ӨС-д юу ч хадгалахгүй (migration-гүй).
 */
export interface GoogleSignupTicket {
  googleSubject: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}

const TYP = 'google-signup';
const TTL_SECONDS = 15 * 60;

function secret(): string {
  const base = process.env.JWT_SECRET;
  if (!base) throw new Error('JWT_SECRET тохируулаагүй');
  return `${base}:${TYP}`;
}

export function signSignupTicket(t: GoogleSignupTicket): string {
  return jwt.sign(
    { typ: TYP, gsub: t.googleSubject, email: t.email, fn: t.firstName, ln: t.lastName, pic: t.picture },
    secret(),
    { expiresIn: TTL_SECONDS },
  );
}

export function verifySignupTicket(token: string): GoogleSignupTicket {
  let p: Record<string, unknown>;
  try {
    p = jwt.verify(token, secret()) as Record<string, unknown>;
  } catch {
    throw new BadRequestException(
      'Google-ийн бүртгэлийн хугацаа дууссан. «Google-ээр нэвтрэх»-ийг дахин дарна уу.',
    );
  }
  if (p.typ !== TYP || typeof p.gsub !== 'string' || typeof p.email !== 'string') {
    throw new BadRequestException('Google-ийн бүртгэлийн мэдээлэл буруу байна');
  }
  return {
    googleSubject: p.gsub,
    email: p.email,
    firstName: typeof p.fn === 'string' ? p.fn : '',
    lastName: typeof p.ln === 'string' ? p.ln : '',
    picture: typeof p.pic === 'string' ? p.pic : null,
  };
}
