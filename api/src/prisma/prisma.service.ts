import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 🔌 CONNECTION POOL SIZING
    // ------------------------------------------------------------------
    // Render дээр НЭГ API instance л ажиллуулж байгаа тул pool "том байх тусам
    // сайн" биш — Node нэг процесс (event loop) тул зэрэг ажиллаж буй query-ийн
    // бодит тоо хязгаарлагдмал, pool нь зөвхөн тэр хэмжээгээрээ л хэрэгтэй.
    //
    // Тооцоолол (PERF-AUDIT.md §1.2, §5.2-т баталгаажуулсан тоонууд дээр үндэслэв):
    //   Little's Law: L (зэрэг хэрэгтэй холболт) = λ (req/s) × W (нэг query-ийн хугацаа)
    //   Автосэйвийн оргил ачаалал ≈ 300 req/s, autosave query хөнгөн (зөвхөн
    //   {problemId} эсвэл session мөр) тул дундаж хугацаа ~10-20ms гэж үзвэл:
    //     L ≈ 300 req/s × 0.02s ≈ 6 зэрэг холболт хангалттай.
    //   Үүн дээр start()/submit()/finalize()-ийн синхрончлогдсон burst (§1.1, §1.3)-д
    //   зориулж ~2.5x нөөц нэмж DEFAULT = 15 сонгов.
    //
    //   Render-ийн Postgres "Starter" төлөвлөгөөнд max_connections ≈ 97 (жижиг
    //   "Free" төлөвлөгөөнд бүр цөөн байдаг) — 15 нь үүнээс МАШ ЛАВ бага бөгөөд
    //   `prisma migrate deploy` (deploy үед тусдаа холболт), health check,
    //   мониторинг зэрэгт зай үлдээнэ. НЭГ instance-аас цаашид хэвтрүүлэх (scale
    //   out) бол энэ тоог instance тоогоор хуваан бууруулах ёстойг санах.
    //
    //   prod/dev-ийг ялгаатай тохируулах боломжтой болгохын тулд DB_POOL_MAX
    //   env-ээр override хийнэ (.env.example, render.yaml-д тайлбарласан).
    const poolMax = PrismaService.envInt('DB_POOL_MAX', 15);

    // ⏱ CONNECT / STATEMENT TIMEOUT
    // ------------------------------------------------------------------
    // Pool дуусаж (exhausted) сурагч бүрийн хүсэлт хүлээлтэнд орох нь энэ
    // хэмжээнд (1000 зэрэг сурагч) БҮХЭЛ систем унасантай адилхан үр дагавартай
    // тул "гацсан query нэг холболтыг мөнхөд барих" эрсдэлийг хоёр талаас хаана:
    //   - connectionTimeoutMillis: сул холболт хүлээх дээд хугацаа (pool дүүрсэн
    //     үед шинэ query энэ хугацаанд хариу авахгүй бол алдаа шидээд буцна —
    //     хязгааргүй queue үүсгэхгүй, "fail fast" зарчим).
    //   - statement_timeout: Postgres талд нэг SQL query ажиллах дээд хугацаа —
    //     гацсан/удаан query-г сервер өөрөө таслаж, барьсан холболтоо суллана.
    const connectTimeoutMs = PrismaService.envInt('DB_POOL_CONNECT_TIMEOUT_MS', 5_000);
    const statementTimeoutMs = PrismaService.envInt('DB_STATEMENT_TIMEOUT_MS', 10_000);
    const idleTimeoutMs = PrismaService.envInt('DB_POOL_IDLE_TIMEOUT_MS', 30_000);

    super({
      adapter: new PrismaPg(
        {
          connectionString: process.env.DATABASE_URL,
          max: poolMax,
          connectionTimeoutMillis: connectTimeoutMs,
          statement_timeout: statementTimeoutMs,
          idleTimeoutMillis: idleTimeoutMs,
        },
        {
          // Pool бүхэлдээ унтарсан/алдаатай холболт зэрэг үйл явдлыг чимээгүй
          // өнгөрөөхгүй — эрт мэдэж, лог руу гаргана (энэ бол яг "exhausted pool
          // takes the whole app down" сценарийн эхний шинж тэмдэг).
          onPoolError: (err) =>
            PrismaService.logger.error(`pg pool error: ${err.message}`, err.stack),
        },
      ),
    });
  }

  private static envInt(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
