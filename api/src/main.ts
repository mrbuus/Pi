// .env-ийг хамгийн түрүүнд ачаална — module decorator-ууд (JwtModule.register)
// import үед үнэлэгддэг тул ConfigModule-ээс өмнө орчны хувьсагч хэрэгтэй.
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render дээр app нь Cloudflare + Render-ийн дотоод load balancer-ийн ард
  // ажилладаг тул Express анхдагчаар шууд холбогдсон peer-ийн IP-г (proxy-ийн
  // IP) req.ip болгож авдаг — БҮХ хэрэглэгч НЭГ IP шиг харагдах эрсдэлтэй.
  // 'trust proxy' идэвхжүүлснээр X-Forwarded-For толгойн жинхэнэ клиент
  // IP-г уншина (ThrottlerGuard-ийн IP-fallback зөв ажиллахад чухал —
  // доор app.module.ts-ийн getTracker харна). Hop тоог 1 гэж үзсэн
  // (Render-ийн ирмэг проксигоор дамжина) — prod дээр баталгаажуулах.
  app.set('trust proxy', 1);

  // Бодлогын текст/тестийн payload их хэмжээний текст агуулдаг тул
  // gzip/brotli шахалт сүлжээгээр дамжих хэмжээг эрс багасгана (§4.3,
  // PERF-AUDIT.md — 20-40KB/сурагч, 1000 сурагч зэрэг эхлэхэд).
  app.use(compression());

  // Body-гийн дээд хэмжээ: бодлогын текст, шалгалтын багц урт байдаг тул
  // Nest-ийн анхдагч 100KB хангалтгүй.
  //
  // ⚠️ ЗААВАЛ useBodyParser() ашиглана, app.use(express.json(...)) БИШ.
  //    Nest нь өөрийн body parser-ээ NestFactory.create() дотор бүртгэчихсэн
  //    байдаг тул дараа нь app.use()-ээр нэмсэн parser нь ХОЁР ДАХЬ болж,
  //    Nest-ийн 100KB хязгаар ЭХЛЭЭД ажиллаад том хүсэлтийг аль хэдийн
  //    буцаачихсан байна — өөрөөр хэлбэл тэр арга нь чимээгүй үр нөлөөгүй.
  //    useBodyParser() нь бүртгэгдсэн parser-ийг ӨӨРИЙГ нь солино.
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: false });

  // Хүсэлт тус бүрийн timeout: оргил ачааллын үед өлгөөтэй хүсэлт холболтын
  // нөөцийг барьж, бусад сурагчийн autosave-д зай үлдээхгүй болно.
  app.use((_req, res, next) => {
    res.setTimeout(REQUEST_TIMEOUT_MS);
    next();
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' });

  // ── Аюулгүй унтралт ──────────────────────────────────────────────────
  // Render нь deploy бүрд ажиллаж буй instance рүү SIGTERM илгээдэг. Ямар ч
  // боловсруулалтгүй бол процесс ШУУД унтарч, нислэг дунд байсан хүсэлтүүд
  // таслагдана. Шалгалт өгч буй сурагчдын хувьд энэ нь ХАРИУЛТ АЛДАГДАНА
  // гэсэн үг — оргил үед ~1500 autosave нислэгт байж болно.
  //
  // enableShutdownHooks() нь SIGTERM/SIGINT дээр app.close()-ыг дуудаж, шинэ
  // холболт авахаа болиод идэвхтэйг нь дуусгахыг хүлээнэ (Prisma-гийн
  // onModuleDestroy ч энд ажиллаж холболтоо цэвэр хаана).
  app.enableShutdownHooks();

  // ХАТУУ ХЯЗГААР. keep-alive холболт app.close()-ыг тодорхойгүй хугацаагаар
  // барьж болно. Render нь SIGTERM-ээс хойш ~30 секундын дараа SIGKILL
  // илгээдэг тул түүнээс ӨМНӨ өөрөө гарвал лог бүрэн бичигдэж, унтралт
  // урьдчилан таамаглахуйц болно.
  let shuttingDown = false;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      // unref: бүх холболт цэвэр хаагдвал энэ таймер процессыг барихгүй,
      // харин өлгөөтэй холболт үлдвэл event loop амьд тул таймер ажиллана.
      setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

/** Нэг хүсэлтэд зөвшөөрөх дээд хугацаа */
const REQUEST_TIMEOUT_MS = 60_000;
/** SIGTERM-ээс хойш албадан гарах хүртэлх хугацаа (Render-ийн 30с-ээс бага) */
const SHUTDOWN_GRACE_MS = 25_000;

void bootstrap();
