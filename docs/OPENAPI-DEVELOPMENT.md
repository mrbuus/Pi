# G32 — Хөгжүүлэлтийн OpenAPI

NestJS 11-т нийцсэн `@nestjs/swagger@11.4.7` ашиглана. Шинэ DTO талбар бүрт class-validator шалгалтын хамт `ApiProperty` эсвэл `ApiPropertyOptional` бичнэ. Баримтжуулалтын decorator нь validation/guard-ыг орлохгүй.

```sh
cd api
ENABLE_SWAGGER=1 NODE_ENV=development npm run start:dev
# Safari-д зөвхөн локал орчноо нээх:
open -a Safari http://localhost:3000/api/docs
```

- `ENABLE_SWAGGER=1` болон production бус орчин зэрэг шаардлагатай. Production дээр enable flag байсан ч UI, JSON, YAML гурвуул 404.
- `/api/docs-json`, `/api/docs-yaml` нь экспорт. Синтетик локал бүрэн app шалгалтаар 225 path, 109 schema үүссэн.
- UI-ийн Try it out идэвхгүй; token хадгалалт болон гадны validator унтраалттай. UI asset-ууд npm package-аас локал үйлчилнэ.
- Энэ route нэвтрэлтгүй учир зөвхөн өөрийн хөгжүүлэлтийн орчинд enable хийнэ. Нийтэд нээлттэй staging-д enable хийхгүй. Env-гүй үед хаалттай.
- Request DTO-ийн required/optional, enum, төрөл, nested array, хэмжээний хязгаарууд бүртгэгдсэн. Legacy JSON утга oneOf-оор, response mapping зарим газарт ерөнхий schema-тай. Бүх response/role matrix-ийг бүрэн дүрсэлсэн гэж үзэхгүй; controller guard/service contract эцсийн эх сурвалж.
- Бизнес логик, class-validator дүрэм, төлбөр/SMS илгээх ажиллагаа өөрчлөгдөөгүй. API endpoint-ийн хуучин response хэлбэр хэвээр.

## Шалгалт

5 шинэ тесттэй нийт API 400 тест давсан. Prisma validate/generate, API/web typecheck/build, 140 link check (0 broken), хоёр орчны startup (DI error 0, duplicate prefix 0) давсан. Бүрэн built app дээр production flag=1 үед гурван route 404; development дээр бодит DTO schema generation амжилттай. 375/1280 synthetic screenshot `docs/qa/G32/`.

## Эх сурвалж

- [Nest OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [DTO types](https://docs.nestjs.com/openapi/types-and-parameters)
- [CLI plugin](https://docs.nestjs.com/openapi/cli-plugin)

## Эзэн шийдэх

Хөгжүүлэлтийн deploy-д docs enable хийх эсэх, дараагийн шатны typed response DTO болон endpoint бүрийн role тайлбар. Цэс/самбарын холболтгүй. Миграцигүй. Бусад Night1 DTO нэмэлт PR-уудын дараа тэдгээр DTO-д decorator нэмж, schema-г дахин экспортлоно.
