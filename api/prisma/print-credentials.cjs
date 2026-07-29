#!/usr/bin/env node
/**
 * print-credentials.cjs — БҮХ хэрэглэгчийн нэвтрэх мэдээллийг уншигдахуйц
 * хүснэгт байдлаар хэвлэнэ (эрх, овог нэр, утас, хэрэглэгчийн код,
 * нэвтрэх нууц үг).
 *
 * НУУЦ ҮГ: эзний шийдвэрээр (2026-07-29) анхны нууц үг ЯМАГТ = утасны дугаар
 * (upsert-staff.cjs, users.service.ts, auth.service.ts бүгд адилхан дүрэм
 * мөрддөг). Утасгүй (зөвхөн имэйлээр өөрөө бүртгүүлсэн) хэрэглэгчийн нууц
 * үгийг САНГААС УНШИХ БОЛОМЖГҮЙ (bcrypt hash эргэлт буцалтгүй) тул тухайн
 * мөрөнд "<өөрөө сонгосон — сангаас унших боломжгүй>" гэж тэмдэглэнэ.
 *
 * ХЭРЭГЛЭЭ:
 *   node prisma/print-credentials.cjs
 *
 * ГАРАЛТ:
 *   • stdout руу хэвлэнэ
 *   • prisma/reports/credentials.txt файлд бас хадгална (.gitignore-д орсон —
 *     НАСАНД ХҮРЭЭГҮЙ сурагчид/эцэг эхийн хувийн мэдээлэл тул git-д орохгүй)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROLE_ORDER = ['ADMIN', 'TEACHER_PLUS', 'TEACHER', 'PARENT', 'BUYER', 'STUDENT'];
const ROLE_LABEL = {
  ADMIN: 'Админ',
  TEACHER_PLUS: 'Багш+',
  TEACHER: 'Багш',
  STUDENT: 'Сурагч',
  PARENT: 'Эцэг эх',
  BUYER: 'Худалдан авагч',
};

const NO_PASSWORD_LABEL = '<өөрөө сонгосон — сангаас унших боломжгүй>';

function pad(str, len) {
  const s = String(str ?? '');
  // Кирилл үсэг display width 1 (monospace терминалд ойролцоогоор зөв ажилладаг)
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      username: true,
      studentCode: true,
      teacherCode: true,
    },
  });

  users.sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.role);
    const rb = ROLE_ORDER.indexOf(b.role);
    if (ra !== rb) return ra - rb;
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'mn');
  });

  const lines = [];
  lines.push(`Нэвтрэх мэдээллийн тайлан — ${new Date().toISOString()}`);
  lines.push(`Нийт хэрэглэгч: ${users.length}`);
  lines.push('⚠️ НУУЦ (PII) — эзний зөвшөөрөлгүйгээр бусдад ил задлахгүй.');
  lines.push('');
  lines.push(
    pad('ЭРХ', 16) +
      pad('ОВОГ НЭР', 26) +
      pad('УТАС', 10) +
      pad('КОД/USERNAME', 16) +
      'НУУЦ ҮГ',
  );
  lines.push('─'.repeat(98));

  let currentRole = null;
  for (const u of users) {
    if (u.role !== currentRole) {
      currentRole = u.role;
      lines.push('');
      lines.push(`## ${ROLE_LABEL[u.role] ?? u.role}`);
    }
    const fullName = `${u.lastName} ${u.firstName}`.trim();
    const codeOrUsername = u.teacherCode ?? u.studentCode ?? u.username ?? '—';
    const password = u.phone ?? NO_PASSWORD_LABEL;
    lines.push(
      pad(ROLE_LABEL[u.role] ?? u.role, 16) +
        pad(fullName, 26) +
        pad(u.phone ?? '—', 10) +
        pad(codeOrUsername, 16) +
        password,
    );
  }

  const output = lines.join('\n') + '\n';
  console.log(output);

  const reportsDir = join(__dirname, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const outPath = join(reportsDir, 'credentials.txt');
  writeFileSync(outPath, output, 'utf8');
  console.error(`\n✔ Хадгалагдлаа: ${outPath}`);
}

main()
  .catch((e) => {
    console.error('\n❌', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
