#!/usr/bin/env node

/**
 * Хавтгайн геометрийн номыг хоёр хувиалбарт хуваах скрипт
 *
 * Ажил:
 * 1. "Хавтгайн геометр" номыг "Хавтгайн геометр 1" болгож НЭРИЙГ нь солино
 * 2. "Хавтгайн геометр 2" шинэ хоосон ном үүсгэнэ
 *
 * Бүлгүүдийг хуваарилалт нь админ дараа нь гараар шилжүүлнэ — дэрхэй таамаглахгүй
 *
 * Ашигла:
 *   node split-geometry-book.cjs                  # dry-run (зарим зүйл дүрслэл)
 *   node split-geometry-book.cjs --apply         # бодит үйлдэл
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const isDryRun = !process.argv.includes('--apply');
const prisma = new PrismaClient();

const GEOMETRY_BOOK_TITLE = 'Хавтгайн геометр';
const GEOMETRY_BOOK_1_TITLE = 'Хавтгайн геометр 1';
const GEOMETRY_BOOK_2_TITLE = 'Хавтгайн геометр 2';

async function splitGeometryBook() {
  console.log(`[${isDryRun ? 'DRY-RUN' : 'APPLY'}] Хавтгайн геометрийн номыг хуваах`);
  console.log('');

  try {
    // Одоогийн "Хавтгайн геометр" номыг олно
    const geometryBook = await prisma.book.findFirst({
      where: { title: GEOMETRY_BOOK_TITLE },
    });

    if (!geometryBook) {
      console.error(`[ERROR] "${GEOMETRY_BOOK_TITLE}" ном олдсонгүй`);
      process.exit(1);
    }

    console.log(`✓ Одоогийн номыг олсон: ${geometryBook.id} — ${geometryBook.title}`);
    console.log(`  • Дугаар (code): ${geometryBook.code}`);
    console.log(`  • Сэдэв (subject): ${geometryBook.subject}`);

    const chapterCount = await prisma.chapter.count({
      where: { bookId: geometryBook.id, deletedAt: null },
    });
    console.log(`  • Идэвхтэй бүлэг: ${chapterCount}`);
    console.log('');

    if (!isDryRun) {
      console.log('[ACTION] Номыг нэрээр солих...');
      // Одоогийн номыг "Хавтгайн геометр 1" болгож солино
      const updated1 = await prisma.book.update({
        where: { id: geometryBook.id },
        data: { title: GEOMETRY_BOOK_1_TITLE },
      });
      console.log(
        `✓ Гүйцэтгэлээ: "${geometryBook.title}" → "${updated1.title}"`,
      );
      console.log('');

      console.log('[ACTION] "Хавтгайн геометр 2" шинэ ном үүсгэх...');
      // Шинэ "Хавтгайн геометр 2" ном үүсгэнэ (хоосон, бүлгүүдгүй)
      const book2 = await prisma.book.create({
        data: {
          title: GEOMETRY_BOOK_2_TITLE,
          code: geometryBook.code, // адилхан дугаар (админ дараа нь засна)
          subject: geometryBook.subject,
          // deletedAt, createdAt зэрэг талбар өөрөө саддаг
        },
      });
      console.log(
        `✓ Шинэ ном үүсгэлээ: ${book2.id} — "${book2.title}"`,
      );
      console.log('  (Бүлгүүдийг админ гараар шилжүүлнэ)');
    } else {
      console.log('[DRY-RUN] Дараах ажлууд гүйцэтгэгдэх байна:');
      console.log(`1. "${geometryBook.title}" → "${GEOMETRY_BOOK_1_TITLE}" (нэр солих)`);
      console.log(
        `2. "${GEOMETRY_BOOK_2_TITLE}" ном үүсгэх (хоосон, ${chapterCount} бүлгүүдийг админ хөдөлгөнө)`,
      );
      console.log('');
      console.log(
        'Бодит үйлдэл хийхийг хүсвэл: node split-geometry-book.cjs --apply',
      );
    }
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

splitGeometryBook();
