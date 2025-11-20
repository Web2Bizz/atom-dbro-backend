import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: '10mb' }));

    const organizationsLogger = new Logger('OrganizationsRequestLogger');

    app.use((req: any, res: any, next: any) => {
      if (req.method === 'POST' && req.path.includes('/organizations')) {
        const endpoint = req.originalUrl ?? req.path;
        const method = req.method;
        const bodyContent =
          req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body ?? '');
        const bodyBits = Buffer.byteLength(bodyContent, 'utf8') * 8;

        organizationsLogger.debug(
          `Organizations request -> endpoint: ${endpoint}, method: ${method}, body size: ${bodyBits} bits`,
        );
      }
      next();
    });

    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.setGlobalPrefix('api');

    const config = new DocumentBuilder()
      .setTitle('Atom DBRO Backend API')
      .setDescription('API для хакатона Atom DBRO')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    console.log('Swagger configured');

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
    console.log(`📚 Swagger API docs: http://0.0.0.0:${port}/api`);
    console.log(`🌐 API v1 endpoints: http://0.0.0.0:${port}/api/v1`);
    console.log(`🌐 API v2 endpoints: http://0.0.0.0:${port}/api/v2`);
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}
bootstrap();

