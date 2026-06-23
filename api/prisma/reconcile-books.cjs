/* ============================================================================
 * reconcile-books.cjs — Номын код/нэрийг нэг удаа цэгцлэх (идемпотент).
 *
 * Зорилго: UI-д цэвэр нэр (100x100, 200x200, 300x300, 1000 Бодлого) харагдах ч
 * идэвхтэй дата нь V2 эх сурвалжаас ирэх. Хуучин (V2 биш) номнуудыг архивлаж
 * нуух — гэхдээ дата нь устахгүй.
 *
 * АЮУЛГҮЙ: Бодлого/тест/attempt/класс-сесс нь Problem.id/Test.id-аар холбогддог
 * тул номын КОД солих нь холбоосыг эвдэхгүй (зөвхөн шошго солигдоно).
 *
 * Идемпотент: дахин ажиллуулахад аль хэдийн цэгцэлсэн бол өөрчлөлт хийхгүй.
 *
 * Ажиллуулах:  node prisma/reconcile-books.cjs
 * ========================================================================== */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// v2Code: V2 эх дататай номын одоогийн код (байвал нийтийн код руу шилжүүлнэ)
// publicCode/title: UI-д харагдах цэвэр код ба нэр
// sourceLabel: жинхэнэ эх фолдер (админд мөрдөгдөх)
const MAPPINGS = [
  { v2Code: '100V2', publicCode: '100', title: '100x100', sourceLabel: '100x100 V2' },
  { v2Code: '200V2', publicCode: '200', title: '200x200', sourceLabel: '200x200 V2' },
  // 300-д V2 импорт хараахан байхгүй — нэрийг л цэвэрлэж, эх сурвалжийг тэмдэглэнэ
  { v2Code: '300V2', publicCode: '300', title: '300x300', sourceLabel: '300x300 (V2 импорт хүлээгдэж буй)' },
  { v2Code: '1000V2', publicCode: '1000', title: '1000 Бодлого', sourceLabel: '1000 бодлого Сорил' },
];

async function reconcile({ v2Code, publicCode, title, sourceLabel }) {
  const v2 = await prisma.book.findUnique({ where: { code: v2Code } });
  const pub = await prisma.book.findUnique({ where: { code: publicCode } });

  // Хуучин (V2 биш) нийтийн ном бөгөөд тусдаа V2 дата байвал — хуучныг архивла.
  if (v2 && pub && v2.id !== pub.id) {
    await prisma.book.update({
      where: { id: pub.id },
      data: {
        code: `${publicCode}-legacy`,
        title: `${pub.title} (хуучин эх)`,
        archived: true,
      },
    });
    console.log(`  • Хуучин "${publicCode}" → "${publicCode}-legacy" (архивлав)`);
  }

  if (v2) {
    // V2 дата байвал нийтийн код/нэр рүү шилжүүлнэ
    await prisma.book.update({
      where: { id: v2.id },
      data: { code: publicCode, title, sourceLabel, archived: false },
    });
    console.log(`  • "${v2Code}" → "${publicCode}" ("${title}", эх: ${sourceLabel})`);
  } else if (pub) {
    // V2 байхгүй — зүгээр нэр/эх сурвалжийг цэвэрлэнэ
    await prisma.book.update({
      where: { id: pub.id },
      data: { title, sourceLabel, archived: false },
    });
    console.log(`  • "${publicCode}" нэр цэвэрлэв ("${title}", эх: ${sourceLabel})`);
  }
}

async function main() {
  console.log('Номын код/нэр цэгцэлж байна…');
  for (const mapping of MAPPINGS) {
    await reconcile(mapping);
  }
  const books = await prisma.book.findMany({
    orderBy: { code: 'asc' },
    select: { code: true, title: true, sourceLabel: true, archived: true },
  });
  console.log('\nЭцсийн номнууд:');
  for (const b of books) {
    const flag = b.archived ? ' [архивласан]' : '';
    console.log(`  ${b.code.padEnd(14)} ${b.title}  (эх: ${b.sourceLabel ?? '—'})${flag}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
