'use strict';
/**
 * Апп чинь ЯГ адилхан (JwtService.sign({sub, role}, {expiresIn})) гаргадаг
 * HS256 JWT-г Node.js-ийн built-in `crypto`-оор гараар зурна.
 *
 * ЗОРИЛГО: шинэ npm dependency (жишээ: `jsonwebtoken`-г шууд package.json-д
 * нэмэх) АВААГҮЙ. `jsonwebtoken` package аль хэдийн node_modules-д байгаа ч
 * (transitive — @nestjs/jwt-ийн dependency) тэрхүү санамсаргүй hoisting-д
 * найдахгүйгээр, package.json-ийг ганц ч мөрөөр их өөрчлөхгүйгээр ажиллуулах
 * зорилготой (prisma/import-students.cjs-ийн адил зарчим — "энэ агентад
 * зөвхөн НЭГ npm script нэмэхийг зөвшөөрсөн тул шинэ dependency нэмэхгүй").
 *
 * Серверийн тал (`JwtStrategy.validate`) `payload.sub`-аар DB-ээс хэрэглэгч
 * дахин уншиж role-г ТЭНДЭЭС авдаг тул энд payload.role буруу байсан ч
 * зөвшөөрөл шалгалт бодитоор DB-ийн role-оор явна — гэсэн ч бид realistic
 * байлгах үүднээс зөв утга дамжуулна.
 */
const crypto = require('crypto');

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signHs256(payload, secret, expiresInSec) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now };
  if (expiresInSec) fullPayload.exp = now + expiresInSec;

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(fullPayload))}`;
  const signature = base64url(crypto.createHmac('sha256', secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

module.exports = { signHs256 };
