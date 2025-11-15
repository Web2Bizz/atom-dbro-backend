import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  try {
    console.log('Starting application...');
    const app = await NestFactory.create(AppModule);
    console.log('App created successfully');

    // Явно настраиваем body parser для JSON
    app.use(json({ limit: '10mb' }));

    // Middleware для логирования parsed body (после парсинга)
    app.use((req: any, res: any, next: any) => {
      if (req.method === 'POST' && req.path.includes('/organizations')) {
        console.log('=== Request Body (после парсинга) ===');
        console.log('Path:', req.path);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('req.body:', req.body);
        if (req.body && typeof req.body === 'object') {
          console.log('Keys:', Object.keys(req.body));
          console.log('cityId:', req.body.cityId, typeof req.body.cityId);
          console.log('typeId:', req.body.typeId, typeof req.body.typeId);
          console.log('helpTypeIds:', req.body.helpTypeIds, Array.isArray(req.body.helpTypeIds));
        }
        console.log('=== Конец Request Body ===\n');
      }
      next();
    });

    // Настраиваем CORS для всех источников
    app.enableCors({
      origin: true, // Разрешить все источники
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Устанавливаем глобальный префикс для версионирования API
    app.setGlobalPrefix('api/v1');

    // Валидация теперь выполняется через декоратор @ZodValidation на уровне методов контроллеров

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
    console.log(`🌐 API endpoints: http://0.0.0.0:${port}/api/v1`);
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}
bootstrap();

