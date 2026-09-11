import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './infrastructure/config/AppModule';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HN Crawler')
    .setDescription('Hacker News crawler with title-length filtering and usage tracking')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  // /api-docs: interactive Swagger UI. /api-docs-json: the raw OpenAPI
  // spec, consumed by the OWASP ZAP API scan in CI (see
  // .github/workflows/security-scan.yml) instead of ZAP's link-spider,
  // which wouldn't discover much on a JSON-only API with no HTML links.
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
