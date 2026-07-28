'use strict';
/**
 * Seed/cleanup-д зориулсан ЖИЖИГ, тусдаа Prisma холболт (max:5) — сервер
 * өөрөө `prisma.service.ts`-ийн (`DB_POOL_MAX`, анхдагч 15) пулаа тусад нь
 * эзэмшинэ, энэ скриптийн seed/cleanup нэмэлт холболт хэрэглэнэ. Ачааллын
 * ТУРШИЛТ ӨӨРӨӨ (HTTP хүсэлтүүд) энэ Prisma клиентийг ОГТ ашиглахгүй —
 * зөвхөн жинхэнэ сервер (localhost:3000) л DB рүү хандана, бид зөвхөн
 * фикстур бэлтгэх/цэвэрлэхэд ашиглана.
 */
const path = require('path');
const { PrismaPg } = require('@prisma/adapter-pg');

// Генерацлагдсан Prisma клиент `nest build`-ийн дараа dist-д гардаг
// (schema.prisma: output = "../src/generated/prisma"). prisma/*.cjs
// скриптүүдийн адил зарчмаар dist-аас require хийнэ.
const GENERATED_CLIENT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'src',
  'generated',
  'prisma',
  'client',
);

function createPrisma(databaseUrl) {
  let PrismaClient;
  try {
    ({ PrismaClient } = require(GENERATED_CLIENT_PATH));
  } catch (e) {
    throw new Error(
      `Генерацлагдсан Prisma клиент dist-д олдсонгүй (${GENERATED_CLIENT_PATH}). ` +
        `Эхлээд \`npm run build\` ажиллуулна уу. (${e.message})`,
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl, max: 5 }),
  });
}

module.exports = { createPrisma };
