import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { signSignupTicket, verifySignupTicket } from './signup-ticket';

const SECRET = 'synthetic-jwt-secret';
const ticketData = {
  googleSubject: 'google-sub-42',
  email: 'new.student@gmail.com',
  firstName: 'Тэмүүлэн',
  lastName: 'Бат',
  picture: null,
};

describe('Gmail-ээр бүртгүүлэх тасалбар', () => {
  const env = process.env.JWT_SECRET;
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });
  afterEach(() => {
    jest.useRealTimers();
    process.env.JWT_SECRET = env;
  });

  it('гарын үсэг зурж, буцааж уншина (кирилл нэр хэвээр)', () => {
    expect(verifySignupTicket(signSignupTicket(ticketData))).toEqual(ticketData);
  });

  it('typ=google-signup, sub талбаргүй, 15 минутын хугацаатай', () => {
    const payload = jwt.decode(signSignupTicket(ticketData)) as Record<string, unknown>;
    expect(payload.typ).toBe('google-signup');
    expect(payload).not.toHaveProperty('sub');
    expect(Number(payload.exp) - Number(payload.iat)).toBe(15 * 60);
  });

  it('нэвтрэх JWT-ийн нууцаар (суффиксгүй) шалгахад унана — тасалбар токен болж чадахгүй', () => {
    const ticket = signSignupTicket(ticketData);
    expect(() => jwt.verify(ticket, SECRET)).toThrow();
  });

  it('15 минутын дараа хүчингүй', () => {
    jest.useFakeTimers({ now: new Date('2026-10-22T00:00:00Z') });
    const ticket = signSignupTicket(ticketData);
    jest.setSystemTime(new Date('2026-10-22T00:15:01Z'));
    expect(() => verifySignupTicket(ticket)).toThrow(BadRequestException);
  });

  it('өөр typ эсвэл нэвтрэх токеныг хүлээж авахгүй', () => {
    const wrongTyp = jwt.sign({ typ: 'other', gsub: 'x', email: 'a@b.c' }, `${SECRET}:google-signup`);
    expect(() => verifySignupTicket(wrongTyp)).toThrow(BadRequestException);
    const loginToken = jwt.sign({ sub: 'user-1', role: 'ADMIN' }, SECRET);
    expect(() => verifySignupTicket(loginToken)).toThrow(BadRequestException);
    const noEmail = jwt.sign({ typ: 'google-signup', gsub: 'x' }, `${SECRET}:google-signup`);
    expect(() => verifySignupTicket(noEmail)).toThrow(BadRequestException);
  });

  it('гажуу мөр → BadRequest', () => {
    expect(() => verifySignupTicket('abc')).toThrow(BadRequestException);
  });
});
