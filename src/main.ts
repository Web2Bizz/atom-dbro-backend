import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

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

    // CORS конфигурация
    const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');
    const allowedOrigins = corsOriginsEnv
      ? corsOriginsEnv.split(',').map((origin) => origin.trim())
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

    app.enableCors({
      origin: (origin, callback) => {
        // Разрешаем запросы без origin (например, Postman, мобильные приложения)
        if (!origin) {
          return callback(null, true);
        }
        // Разрешаем если origin в списке разрешенных
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // В development разрешаем все локальные адреса
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
      ],
      exposedHeaders: ['Authorization'],
      maxAge: 86400, // 24 часа
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

