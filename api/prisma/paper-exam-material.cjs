/* eslint-disable */
/**
 * Нэгдсэн шалгалтын материалын хуудсуудыг (лого усан тэмдэгтэй JPEG) StoredFile-д оруулна.
 * Файлын нэр `<хувилбар>-<хуудас>.jpg` (A-1.jpg …) → түлхүүр `paperexam-<examId>-A-1.jpg`.
 * Эзэнгүй (ownerId null), лавлагаагүй тул /files/ маршрутаар зөвхөн Админ уншина; сурагч
 * зөвхөн /paper-exams/my/:id/material-аар ӨӨРИЙН хувилбарыг авна. Байгаа түлхүүрийг ДАРЖ
 * БИЧИХГҮЙ (алгасна). Чанар сайжруулсан хуудсыг `A-1.r2.jpg` гэж нэрлэвэл шинэ түлхүүрээр нэмэгдэж,
 * сервер хуудас бүрийн хамгийн сүүлийн хувилбарыг харуулна (хуучин нь үлдэнэ).
 *
 *   node prisma/paper-exam-material.cjs <хавтас> --title="Нэгдсэн шалгалт 1"           # урьдчилан харах
 *   node prisma/paper-exam-material.cjs <хавтас> --title="Нэгдсэн шалгалт 1" --commit  # хадгална
 * Урьдчилан `npm run build` (dist).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { saveStoredFile } = require('../dist/src/storage/file-store');

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));

async function main() {
  if (!dir) throw new Error('Хавтасны зам өгнө үү');
  const title = arg('title');
  if (!title) throw new Error('--title= өгнө үү');
  const commit = process.argv.includes('--commit');
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^[A-Z]-\d+(\.r\d+)?\.jpg$/.test(f))
    .sort();
  if (files.length === 0) throw new Error('A-1.jpg хэлбэрийн файл алга');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const prisma = app.get(PrismaService);
    const exams = await prisma.paperExam.findMany({ where: { title, deletedAt: null }, select: { id: true } });
    if (exams.length !== 1) throw new Error(`«${title}» нэртэй шалгалт ${exams.length} байна`);
    const examId = exams[0].id;
    for (const f of files) {
      const key = `paperexam-${examId}-${f}`;
      const exists = await prisma.storedFile.findUnique({ where: { key }, select: { key: true } });
      const bytes = fs.readFileSync(path.join(dir, f));
      if (exists) {
        console.log('алгасав (байгаа)', key);
        continue;
      }
      if (commit) await saveStoredFile(prisma, { key, mime: 'image/jpeg', ownerId: null, bytes });
      console.log(commit ? 'хадгалав' : 'хадгална', key, bytes.length);
    }
    if (!commit) console.log('Урьдчилан харав — --commit нэмж хадгална');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
