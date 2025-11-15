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
        body {
          background-color: #0d1117 !important;
        }
        .swagger-ui {
          color: #c9d1d9 !important;
        }
        .swagger-ui .topbar {
          background-color: #161b22 !important;
          border-bottom: 1px solid #30363d !important;
        }
        .swagger-ui .topbar .download-url-wrapper {
          background-color: #161b22 !important;
        }
        .swagger-ui .topbar .download-url-wrapper input[type=text] {
          border: 1px solid #30363d !important;
          background-color: #0d1117 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .info {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .info .title {
          color: #c9d1d9 !important;
        }
        .swagger-ui .info hgroup.main a {
          color: #58a6ff !important;
        }
        .swagger-ui .info p, .swagger-ui .info table, .swagger-ui .info li {
          color: #c9d1d9 !important;
        }
        .swagger-ui .scheme-container {
          background-color: #161b22 !important;
        }
        .swagger-ui .scheme-container .schemes {
          background-color: #161b22 !important;
        }
        .swagger-ui .btn {
          background-color: #238636 !important;
          color: #fff !important;
          border-color: #238636 !important;
        }
        .swagger-ui .btn:hover {
          background-color: #2ea043 !important;
        }
        .swagger-ui .btn.authorize {
          background-color: #238636 !important;
          border-color: #238636 !important;
          color: #fff !important;
        }
        .swagger-ui .opblock {
          background-color: #161b22 !important;
          border-color: #30363d !important;
        }
        .swagger-ui .opblock.opblock-post {
          background-color: #161b22 !important;
          border-color: #238636 !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary {
          border-color: #238636 !important;
        }
        .swagger-ui .opblock.opblock-get {
          background-color: #161b22 !important;
          border-color: #58a6ff !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: #58a6ff !important;
        }
        .swagger-ui .opblock.opblock-put {
          background-color: #161b22 !important;
          border-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary {
          border-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-delete {
          background-color: #161b22 !important;
          border-color: #da3633 !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary {
          border-color: #da3633 !important;
        }
        .swagger-ui .opblock .opblock-summary {
          color: #c9d1d9 !important;
          background-color: #161b22 !important;
        }
        .swagger-ui .opblock .opblock-summary-method {
          background-color: #238636 !important;
          color: #fff !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background-color: #58a6ff !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background-color: #da3633 !important;
        }
        .swagger-ui .opblock .opblock-section {
          background-color: #0d1117 !important;
          border-color: #30363d !important;
        }
        .swagger-ui .opblock .opblock-description-wrapper,
        .swagger-ui .opblock .opblock-description-wrapper p,
        .swagger-ui .opblock .opblock-description-wrapper h4 {
          color: #c9d1d9 !important;
          background-color: #0d1117 !important;
        }
        .swagger-ui .opblock-tag {
          color: #c9d1d9 !important;
        }
        .swagger-ui .opblock-tag small {
          color: #8b949e !important;
        }
        .swagger-ui .parameter__name {
          color: #c9d1d9 !important;
        }
        .swagger-ui .parameter__type {
          color: #79c0ff !important;
        }
        .swagger-ui .parameter__in {
          color: #a5a5a5 !important;
        }
        .swagger-ui .parameter__extension,
        .swagger-ui .parameter__deprecated {
          color: #f85149 !important;
        }
        .swagger-ui .response-col_status {
          color: #c9d1d9 !important;
        }
        .swagger-ui .response-col_description {
          color: #c9d1d9 !important;
        }
        .swagger-ui .response-col_links {
          color: #c9d1d9 !important;
        }
        .swagger-ui .model-box {
          background-color: #161b22 !important;
        }
        .swagger-ui .model-title {
          color: #c9d1d9 !important;
        }
        .swagger-ui .prop-name {
          color: #79c0ff !important;
        }
        .swagger-ui .prop-type {
          color: #ff7b72 !important;
        }
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
          border-color: #30363d !important;
        }
        .swagger-ui table tbody tr td {
          background-color: #0d1117 !important;
          color: #c9d1d9 !important;
          border-color: #30363d !important;
        }
        .swagger-ui input[type=text],
        .swagger-ui input[type=password],
        .swagger-ui input[type=search],
        .swagger-ui input[type=number],
        .swagger-ui textarea {
          background-color: #0d1117 !important;
          border-color: #30363d !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui select {
          background-color: #0d1117 !important;
          border-color: #30363d !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .response-content-type {
          color: #8b949e !important;
        }
        .swagger-ui .highlight-code {
          background-color: #161b22 !important;
        }
        .swagger-ui .microlight {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .renderedMarkdown p,
        .swagger-ui .renderedMarkdown code {
          color: #c9d1d9 !important;
        }
        .swagger-ui .opblock-body {
          background-color: #0d1117 !important;
        }
        .swagger-ui .opblock-body pre {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .opblock-body pre code {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .parameter__name.required {
          color: #ff7b72 !important;
        }
        .swagger-ui .parameter__name.required:after {
          color: #ff7b72 !important;
        }
        .swagger-ui .tab li {
          background-color: #161b22 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .tab li.active {
          background-color: #0d1117 !important;
          border-color: #30363d !important;
        }
        .swagger-ui .tab li button {
          color: #c9d1d9 !important;
        }
        .swagger-ui .response-content-type select {
          background-color: #0d1117 !important;
          color: #c9d1d9 !important;
        }
        .swagger-ui .execute-wrapper .btn {
          background-color: #238636 !important;
        }
        .swagger-ui .btn-clear {
          background-color: #da3633 !important;
        }
        .swagger-ui .btn-clear:hover {
          background-color: #f85149 !important;
        }
        .swagger-ui .opblock-description-wrapper,
        .swagger-ui .opblock-external-docs-wrapper,
        .swagger-ui .opblock-title_normal {
          color: #c9d1d9 !important;
        }
        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background-color: #238636 !important;
        }
        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background-color: #58a6ff !important;
        }
        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background-color: #da3633 !important;
        }
        .swagger-ui .opblock.opblock-patch .opblock-summary-method {
          background-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-patch {
          background-color: #161b22 !important;
          border-color: #d29922 !important;
        }
        .swagger-ui .opblock.opblock-patch .opblock-summary {
          border-color: #d29922 !important;
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

