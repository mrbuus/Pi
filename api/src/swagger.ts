import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
/** Documentation must never be mounted in production, even with an enable flag. */
export function setupSwagger(
  app: INestApplication,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === 'production' || env.ENABLE_SWAGGER !== '1') return false;
  const config = new DocumentBuilder()
    .setTitle('Pi.mn API')
    .setDescription(
      'Хөгжүүлэлтийн API гэрээ. Runtime validation болон эрхийн guard нь эцсийн шалгалт болно. Production өгөгдөл/токен бүү ашигла.',
    )
    .setVersion('1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      jsonDocumentUrl: '/api/docs-json',
      yamlDocumentUrl: '/api/docs-yaml',
      swaggerOptions: {
        persistAuthorization: false,
        validatorUrl: null,
        supportedSubmitMethods: [],
      },
      customSiteTitle: 'Pi.mn API',
    },
  );
  return true;
}
