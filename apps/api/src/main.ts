import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import compression from 'compression';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3001);
  const uploadsDir = join(process.cwd(), 'uploads');

  mkdirSync(uploadsDir, { recursive: true });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );
  app.use(compression());
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EPG CMS API')
    .setDescription('Admin API for OTT EPG channel, asset, and schedule management.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port);
}

void bootstrap();
