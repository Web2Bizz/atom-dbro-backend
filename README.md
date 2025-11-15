# atom-dbro-backend

Бэкенд для хакатона Atom DBRO

## Настройка

### База данных

Настройка через переменную окружения `DATABASE_URL`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/atom_dbro
```

### S3 хранилище

Сервис поддерживает работу с любыми S3-совместимыми хранилищами (AWS S3, Beget, Yandex Object Storage, DigitalOcean Spaces, MinIO и др.).

**Минимальная конфигурация:**
```env
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=us-east-1
```

**Для кастомных провайдеров (Beget, Yandex и т.д.):**
```env
S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=ru1
```

Подробная документация по настройке S3: [docs/S3_CONFIGURATION.md](docs/S3_CONFIGURATION.md)

## Запуск

```bash
# Установка зависимостей
npm install

# Применение миграций
npm run db:migrate

# Запуск в режиме разработки
npm run start:dev

# Запуск в продакшене
npm run start:prod
```

## API документация

После запуска приложения Swagger UI доступен по адресу:
```
http://localhost:3000/api
```

## Структура проекта

- `src/organization/` - модуль организаций с поддержкой галереи изображений
- `src/database/` - схемы базы данных
- `src/auth/` - аутентификация и авторизация
- `docs/` - документация
