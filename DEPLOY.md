# Инструкция по деплою приложения

## Предварительные требования

- Docker и Docker Compose установлены
- Git (для клонирования репозитория, если нужно)

## Шаги для деплоя

### 1. Подготовка окружения

#### Создание внешней сети Docker

В `docker-compose.yml` используется внешняя сеть `atom-external-network`. Создайте её перед запуском:

```bash
docker network create atom-external-network
```

Если сеть уже существует, эта команда выдаст предупреждение, но это нормально.

### 2. Настройка переменных окружения (опционально)

Создайте файл `.env` в корне проекта для настройки переменных окружения (или используйте значения по умолчанию):

```env
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=atom_dbro
POSTGRES_PORT=5432

# Приложение
APP_PORT=3000
PORT=3000

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Database URL (автоматически формируется из переменных выше)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/atom_dbro
```

**⚠️ ВАЖНО**: В продакшене обязательно измените `JWT_SECRET` и `POSTGRES_PASSWORD` на безопасные значения!

### 3. Сборка и запуск контейнеров

#### Первый запуск (сборка образов):

```bash
docker-compose up -d --build
```

#### Последующие запуски (без пересборки):

```bash
docker-compose up -d
```

Эта команда:
- Соберёт образ приложения из Dockerfile
- Запустит PostgreSQL контейнер
- Запустит приложение в контейнере
- Подождёт, пока PostgreSQL станет здоровым, перед запуском приложения

### 4. Выполнение миграций базы данных

После первого запуска контейнеров нужно выполнить миграции базы данных:

```bash
# Войти в контейнер приложения
docker exec -it atom-dbro-app sh

# Выполнить миграции
npm run db:migrate

# Выйти из контейнера
exit
```

Или одной командой:

```bash
docker exec -it atom-dbro-app npm run db:migrate
```

### 5. Проверка работы приложения

#### Проверить статус контейнеров:

```bash
docker-compose ps
```

#### Просмотреть логи:

```bash
# Все сервисы
docker-compose logs -f

# Только приложение
docker-compose logs -f app

# Только база данных
docker-compose logs -f postgres
```

#### Проверить доступность API:

- Приложение: http://localhost:3000
- Swagger документация: http://localhost:3000/api

### 6. Остановка и удаление

#### Остановка контейнеров (без удаления):

```bash
docker-compose stop
```

#### Остановка и удаление контейнеров:

```bash
docker-compose down
```

#### Остановка, удаление контейнеров и volumes (⚠️ удалит данные БД):

```bash
docker-compose down -v
```

## Полезные команды

### Пересборка приложения после изменений:

```bash
docker-compose up -d --build app
```

### Выполнение команд внутри контейнера:

```bash
# Войти в контейнер приложения
docker exec -it atom-dbro-app sh

# Выполнить скрипт импорта городов (если нужно)
docker exec -it atom-dbro-app npm run import:cities
```

### Просмотр логов в реальном времени:

```bash
docker-compose logs -f app
```

### Проверка подключения к базе данных:

```bash
# Войти в контейнер PostgreSQL
docker exec -it atom-dbro-postgres psql -U postgres -d atom_dbro
```

## Решение проблем

### Проблема: Сеть не найдена

**Ошибка**: `network atom-external-network not found`

**Решение**: Создайте сеть командой:
```bash
docker network create atom-external-network
```

### Проблема: Порт уже занят

**Ошибка**: `port is already allocated`

**Решение**: Измените порт в `.env` файле или `docker-compose.yml`:
```env
APP_PORT=3001
POSTGRES_PORT=5433
```

### Проблема: Приложение не подключается к БД

**Решение**: 
1. Убедитесь, что PostgreSQL контейнер запущен: `docker-compose ps`
2. Проверьте переменную `DATABASE_URL` в контейнере: `docker exec atom-dbro-app env | grep DATABASE_URL`
3. Проверьте логи: `docker-compose logs postgres`

### Проблема: Изменения в коде не применяются

**Решение**: 
- В development режиме код монтируется через volumes, но нужно перезапустить контейнер:
```bash
docker-compose restart app
```
- Для production изменений нужно пересобрать образ:
```bash
docker-compose up -d --build app
```

## Production деплой

Для production окружения рекомендуется:

1. **Использовать .env файл** с безопасными паролями и секретами
2. **Настроить reverse proxy** (nginx, traefik) перед приложением
3. **Настроить SSL/TLS** сертификаты
4. **Использовать managed базу данных** вместо контейнера PostgreSQL
5. **Настроить мониторинг** и логирование
6. **Настроить backup** базы данных
7. **Использовать Docker secrets** для чувствительных данных

## Структура деплоя

```
┌─────────────────────────────────────┐
│   atom-external-network             │
│   (внешняя сеть)                    │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   atom-dbro-app             │  │
│   │   (порт 3000)               │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │
┌─────────────────────────────────────┐
│   atom-internal-network             │
│   (внутренняя сеть)                 │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   atom-dbro-app             │  │
│   └─────────────────────────────┘  │
│              │                      │
│              ▼                      │
│   ┌─────────────────────────────┐  │
│   │   atom-dbro-postgres        │  │
│   │   (порт 5432)               │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

