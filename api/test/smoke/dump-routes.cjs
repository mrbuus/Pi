/* ============================================================================
 * Nest апп-ыг үүсгээд (порт сонсохгүйгээр) БҮРТГЭГДСЭН БҮХ маршрутыг хэвлэнэ.
 *
 * ЯАГААД: маршрутын жагсаалтыг гараар хуулбарлавал шинэ endpoint нэмэгдэх бүрд
 * smoke test-ээс ЧИМЭЭГҮЙ мултарна — яг тэр endpoint дээр л алдаа гардаг.
 *
 * ЯАГААД .cjs бөгөөд dist-ээс уншдаг вэ: Prisma 7-ийн үүсгэсэн client нь
 * TS дотроо `./internal/class.js` гэсэн ESM-хэлбэрийн зам ашигладаг. ts-node
 * -ийн CJS resolver үүнийг задалж чаддаггүй (`Cannot find module`). Аль
 * хэдийн хөрвүүлсэн `dist` дээр ажиллуулбал энэ асуудал огт үүсэхгүй.
 *
 * Ажиллуулах:  npm run build && node test/smoke/dump-routes.cjs
 * (эсвэл `npm run smoke` — тэр нь build + dump + шалгалтыг цуг хийнэ)
 * ========================================================================== */

require('dotenv/config');

function collect(stack, out) {
  for (const layer of stack) {
    if (layer.route) {
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled) out.add(`${method.toUpperCase()} ${layer.route.path}`);
      }
    } else if (layer.handle && layer.handle.stack) {
      collect(layer.handle.stack, out);
    }
  }
}

async function main() {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../../dist/src/app.module');

  // Логийг бүрэн унтраана — гаралт нь ЗӨВХӨН маршрутын жагсаалт байх ёстой.
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.init();

  const server = app.getHttpAdapter().getInstance();
  // Express 5-д `router`, Express 4-д `_router` — хоёуланг нь дэмжинэ.
  const stack = (server.router && server.router.stack) ||
    (server._router && server._router.stack);
  if (!stack) {
    throw new Error(
      'Express-ийн router stack олдсонгүй — Express хувилбар өөрчлөгдсөн байж болзошгүй',
    );
  }

  const routes = new Set();
  collect(stack, routes);
  for (const route of [...routes].sort()) console.log(route);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
