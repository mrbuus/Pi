/**
 * Нууц үгийг УТАСНЫ ДУГААР болгож нэг мөр болгоно (эзний дүрэм, 2026-07-29).
 *
 * Яагаад: production дахь ажилтнууд хуучин скриптээр үүссэн тул санамсаргүй
 * түр нууц үгтэй байсан. Одоо бүх бүртгэл "нууц үг = өөрийн утас" болно.
 * (Нэвтрээд орсны дараа /app/password-оос өөрчилж болно. mustChangePassword
 * талбар бэлэн байгаа ч ОДООХОНДОО идэвхгүй.)
 *
 * Ажиллуулах:
 *   node prisma/reset-passwords-to-phone.cjs                    # хуурай (юу ч бичихгүй)
 *   node prisma/reset-passwords-to-phone.cjs --commit           # локал
 *   DATABASE_URL="<render>" node prisma/reset-passwords-to-phone.cjs --commit
 *
 * Утасгүй (зөвхөн имэйлээр бүртгүүлсэн) хэрэглэгчийг ХӨНДӨХГҮЙ — тэд өөрсдөө
 * нууц үгээ сонгосон тул дарж бичих нь буруу.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const COMMIT = process.argv.includes('--commit');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, firstName: true, lastName: true, role: true, passwordHash: true },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  });

  let already = 0;
  const toFix = [];
  for (const u of users) {
    if (bcrypt.compareSync(u.phone, u.passwordHash)) already += 1;
    else toFix.push(u);
  }

  console.log(`\nУтастай хэрэглэгч: ${users.length}`);
  console.log(`  ✓ аль хэдийн утсаараа: ${already}`);
  console.log(`  ↻ шинэчлэх шаардлагатай: ${toFix.length}\n`);

  const staff = toFix.filter((u) => ['ADMIN', 'TEACHER_PLUS', 'TEACHER'].includes(u.role));
  if (staff.length) {
    console.log('Ажилтан:');
    for (const u of staff) console.log(`  ${u.role.padEnd(13)} ${u.lastName} ${u.firstName} — ${u.phone}`);
    console.log('');
  }

  if (!COMMIT) {
    console.log('⚠️ ХУУРАЙ АЖИЛЛАГАА — юу ч бичээгүй. --commit-той дахин ажиллуулна.\n');
    await prisma.$disconnect();
    return;
  }

  for (const u of toFix) {
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(u.phone, 10) },
    });
  }

  console.log(`✓ ${toFix.length} бүртгэлийн нууц үг = утасны дугаар боллоо.\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
