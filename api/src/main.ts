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

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
