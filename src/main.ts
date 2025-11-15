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
    SwaggerModule.setup('api', app, document, {
      customCss: `
        .swagger-ui {
          color: #e0e0e0;
        }
        .swagger-ui .topbar {
          background-color: #1a1a1a;
          border-bottom: 1px solid #333;
        }
        .swagger-ui .topbar .download-url-wrapper {
          background-color: #1a1a1a;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
          border: 1px solid #444;
          background-color: #2a2a2a;
          color: #e0e0e0;
        }
        .swagger-ui .info {
          background-color: #1a1a1a;
          color: #e0e0e0;
        }
        .swagger-ui .info .title {
          color: #e0e0e0;
        }
        .swagger-ui .info p, .swagger-ui .info table {
          color: #d0d0d0;
        }
        .swagger-ui .scheme-container {
          background-color: #1a1a1a;
        }
        .swagger-ui .btn {
          background-color: #3b82f6;
          color: #fff;
        }
        .swagger-ui .btn:hover {
          background-color: #2563eb;
        }
        .swagger-ui .opblock {
          background-color: #2a2a2a;
          border-color: #444;
        }
        .swagger-ui .opblock.opblock-post {
          background-color: #2a2a2a;
          border-color: #49cc90;
        }
        .swagger-ui .opblock.opblock-get {
          background-color: #2a2a2a;
          border-color: #61affe;
        }
        .swagger-ui .opblock.opblock-put {
          background-color: #2a2a2a;
          border-color: #fca130;
        }
        .swagger-ui .opblock.opblock-delete {
          background-color: #2a2a2a;
          border-color: #f93e3e;
        }
        .swagger-ui .opblock .opblock-summary {
          color: #e0e0e0;
        }
        .swagger-ui .opblock .opblock-section {
          background-color: #1a1a1a;
        }
        .swagger-ui .opblock .opblock-description-wrapper p,
        .swagger-ui .opblock .opblock-description-wrapper h4 {
          color: #e0e0e0;
        }
        .swagger-ui .parameter__name {
          color: #e0e0e0;
        }
        .swagger-ui .parameter__type {
          color: #9ca3af;
        }
        .swagger-ui .parameter__in {
          color: #9ca3af;
        }
        .swagger-ui .response-col_status {
          color: #e0e0e0;
        }
        .swagger-ui .response-col_description {
          color: #d0d0d0;
        }
        .swagger-ui .model-box {
          background-color: #1a1a1a;
        }
        .swagger-ui .model-title {
          color: #e0e0e0;
        }
        .swagger-ui .prop-name {
          color: #60a5fa;
        }
        .swagger-ui .prop-type {
          color: #f472b6;
        }
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          background-color: #2a2a2a;
          color: #e0e0e0;
          border-color: #444;
        }
        .swagger-ui table tbody tr td {
          background-color: #1a1a1a;
          color: #e0e0e0;
          border-color: #444;
        }
        .swagger-ui input[type=text],
        .swagger-ui input[type=password],
        .swagger-ui input[type=search],
        .swagger-ui textarea {
          background-color: #2a2a2a;
          border-color: #444;
          color: #e0e0e0;
        }
        .swagger-ui select {
          background-color: #2a2a2a;
          border-color: #444;
          color: #e0e0e0;
        }
        .swagger-ui .response-content-type {
          color: #9ca3af;
        }
        .swagger-ui .highlight-code {
          background-color: #1e1e1e;
        }
        .swagger-ui .microlight {
          background-color: #1e1e1e;
          color: #d4d4d4;
        }
        .swagger-ui .renderedMarkdown p,
        .swagger-ui .renderedMarkdown code {
          color: #e0e0e0;
        }
        body {
          background-color: #1a1a1a;
        }
      `,
      customSiteTitle: 'Atom DBRO Backend API',
    });
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

