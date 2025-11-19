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
PORT=3000

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Database URL (автоматически формируется из переменных выше)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/atom_dbro

# S3 Configuration (ОБЯЗАТЕЛЬНО)
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=us-east-1

# S3 Configuration (опционально, для кастомных провайдеров)
# S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
# S3_PUBLIC_URL_TEMPLATE=https://{bucket}.s3.{region}.amazonaws.com/{key}
# S3_FORCE_PATH_STYLE=true
```

**⚠️ ВАЖНО**: 
- В продакшене обязательно измените `JWT_SECRET` и `POSTGRES_PASSWORD` на безопасные значения!
- **S3 переменные обязательны** - приложение не запустится без них. Укажите как минимум:
  - `S3_BUCKET_NAME`
  - `S3_ACCESS_KEY_ID` (или `AWS_ACCESS_KEY_ID`)
  - `S3_SECRET_ACCESS_KEY` (или `AWS_SECRET_ACCESS_KEY`)

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

- Приложение: http://localhost:3000 (или http://<IP_СЕРВЕРА>:3000 для доступа извне)
- Swagger документация: http://localhost:3000/api

**✅ Приложение настроено для доступа извне** - порт проброшен на все интерфейсы (0.0.0.0), поэтому сервис доступен не только с localhost, но и по IP-адресу сервера из внешней сети.

#### Проверка внешнего доступа:

1. **Узнайте IP-адрес сервера:**
```bash
# Linux/Mac
hostname -I
# или
ip addr show

# Windows
ipconfig
```

2. **Проверьте доступность извне:**
   - С другого компьютера в той же сети: `http://<IP_СЕРВЕРА>:3000`
   - Или используйте curl: `curl http://<IP_СЕРВЕРА>:3000`

3. **Настройка Firewall (если приложение недоступно):**

   **Linux (ufw):**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw reload
   ```

   **Linux (firewalld):**
   ```bash
   sudo firewall-cmd --permanent --add-port=3000/tcp
   sudo firewall-cmd --reload
   ```

   **Windows Firewall:**
   - Откройте "Брандмауэр Защитника Windows"
   - Создайте правило для входящих подключений на порт 3000

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

## Автоматический деплой через CI/CD (GitHub Actions)

Проект настроен для автоматического деплоя через GitHub Actions. При каждом push в ветку `main` происходит автоматическая сборка Docker образа, отправка в приватный registry и деплой на сервер.

### Настройка GitHub Secrets

Перед использованием CI/CD необходимо настроить секреты в GitHub:

1. Перейдите в репозиторий на GitHub
2. Откройте **Settings** → **Secrets and variables** → **Actions**
3. Добавьте следующие секреты:

#### Обязательные секреты:

- **`DOCKER_REGISTRY_URL`** - URL вашего приватного Docker registry
  - Пример: `registry.example.com` или `docker.io/username`
  - ⚠️ **ВАЖНО**: 
    - НЕ включайте протокол (`http://` или `https://`)
    - НЕ добавляйте слэш в конце
    - Правильно: `registry.example.com`
    - Неправильно: `https://registry.example.com/` или `registry.example.com/`
  - ⚠️ **ОБЯЗАТЕЛЬНО**: Без этого секрета сборка образа не запустится
  
- **`DOCKER_REGISTRY_USERNAME`** - Логин для доступа к Docker registry
  - ⚠️ **ОБЯЗАТЕЛЬНО**: Необходим для авторизации в registry
  
- **`DOCKER_REGISTRY_PASSWORD`** - Пароль для доступа к Docker registry
  - ⚠️ **ОБЯЗАТЕЛЬНО**: Необходим для авторизации в registry
  
- **`DOCKER_IMAGE_NAME`** - Имя образа в registry
  - Пример: `atom-dbro-backend`
  - ⚠️ **ВАЖНО**: 
    - Используйте только строчные буквы, цифры, дефисы, подчеркивания и точки
    - Не используйте заглавные буквы или специальные символы
    - Правильно: `atom-dbro-backend`, `my-app`, `app_v1.0`
    - Неправильно: `Atom-Dbro-Backend`, `my app`, `app@v1`
  - ⚠️ **ОБЯЗАТЕЛЬНО**: Без этого секрета сборка образа не запустится
  
- **`DEPLOY_HOST`** - IP-адрес или домен сервера деплоя
  - Пример: `192.168.1.100` или `deploy.example.com`
  
- **`DEPLOY_USER`** - Пользователь для SSH подключения
  - Пример: `root`, `deploy`, `ubuntu`
  
- **`DEPLOY_SSH_KEY`** - Приватный SSH ключ для доступа к серверу
  - Содержимое файла `~/.ssh/id_rsa` (или другого приватного ключа)
  - ⚠️ **ВАЖНО**: Используйте ключ без пароля или настройте ssh-agent
  
- **`DEPLOY_PROJECT_PATH`** - Абсолютный путь к директории проекта на сервере
  - Пример: `~/atom-dbro-backend` или `/opt/atom-dbro-backend`
  - ⚠️ **ВАЖНО**: Путь должен существовать на сервере и содержать `docker-compose.yml`

#### Опциональные секреты:

- **`DEPLOY_SSH_PORT`** - Порт SSH (по умолчанию: 22)

- **`DOCKER_REGISTRY_INSECURE`** - Использовать insecure registry (для самоподписанных сертификатов)
  - Установите в `true`, если ваш registry использует самоподписанный сертификат или IP-адрес
  - По умолчанию: не установлен (используется HTTPS с проверкой сертификата)
  - ⚠️ **ВНИМАНИЕ**: Использование insecure registry снижает безопасность!

### Настройка сервера для деплоя

#### 1. Установка Docker и Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Создание директории проекта

```bash
# Создайте директорию для проекта (выберите подходящий путь)
# Вариант 1: в домашней директории пользователя
mkdir -p ~/atom-dbro-backend
cd ~/atom-dbro-backend

# Вариант 2: в системной директории
sudo mkdir -p /opt/atom-dbro-backend
sudo chown $USER:$USER /opt/atom-dbro-backend
cd /opt/atom-dbro-backend
```

**⚠️ ВАЖНО**: Запомните выбранный путь - он понадобится для секрета `DEPLOY_PROJECT_PATH` в GitHub!

#### 3. Копирование необходимых файлов на сервер

Скопируйте на сервер следующие файлы:

```bash
# docker-compose.prod.yml
# .env (с production переменными окружения)
```

Или клонируйте репозиторий (только для чтения):

```bash
git clone https://github.com/Web2Bizz/atom-dbro-backend.git ~/atom-dbro-backend
cd ~/atom-dbro-backend
```

#### 4. Создание Docker сетей

```bash
docker network create atom-external-network
docker network create atom-internal-network
```

#### 5. Настройка .env файла

Создайте файл `.env` в директории проекта с production переменными:

```env
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=atom_dbro
POSTGRES_PORT=5432

# Приложение
PORT=3000

# JWT
JWT_SECRET=your-very-secure-secret-key
JWT_EXPIRES_IN=24h

# Database URL
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/atom_dbro

# S3 Configuration
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=us-east-1

# Docker Registry (для docker-compose.prod.yml)
DOCKER_REGISTRY=registry.example.com
DOCKER_IMAGE_NAME=atom-dbro-backend
```

#### 6. Настройка SSH ключа для GitHub Actions

**Важно**: SSH ключ должен быть настроен правильно, иначе деплой не будет работать.

##### Шаг 1: Создание SSH ключа

На вашем локальном компьютере создайте новую пару SSH ключей:

```bash
# Создайте SSH ключ (без пароля для автоматизации)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Или используйте RSA (если ed25519 не поддерживается)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
```

**⚠️ ВАЖНО**: Не устанавливайте пароль на ключ (нажмите Enter при запросе passphrase), иначе GitHub Actions не сможет его использовать.

##### Шаг 2: Добавление публичного ключа на сервер

```bash
# Вариант 1: Используя ssh-copy-id (рекомендуется)
# Замените USER и HOST на ваши значения
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub USER@HOST

# Вариант 2: Вручную
# Скопируйте содержимое публичного ключа
cat ~/.ssh/github_actions_deploy.pub

# На сервере добавьте ключ в authorized_keys
# Подключитесь к серверу
ssh USER@HOST

# На сервере выполните:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ_СЮДА" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

##### Шаг 3: Проверка SSH подключения

Проверьте, что подключение работает:

```bash
# Тест подключения с использованием приватного ключа
# Замените USER, HOST и PORT на ваши значения
ssh -i ~/.ssh/github_actions_deploy -p PORT USER@HOST \
  "echo 'SSH connection successful' && hostname"
```

Если подключение успешно, переходите к следующему шагу.

##### Шаг 4: Добавление приватного ключа в GitHub Secrets

```bash
# Покажите приватный ключ (скопируйте ВСЁ содержимое, включая заголовки)
cat ~/.ssh/github_actions_deploy
```

**Важно**: Копируйте весь ключ, включая строки:
- `-----BEGIN OPENSSH PRIVATE KEY-----` (или `-----BEGIN RSA PRIVATE KEY-----`)
- Все строки ключа
- `-----END OPENSSH PRIVATE KEY-----` (или `-----END RSA PRIVATE KEY-----`)

Добавьте скопированное содержимое в GitHub:
1. Перейдите в репозиторий → **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **New repository secret**
3. Name: `DEPLOY_SSH_KEY`
4. Secret: вставьте весь приватный ключ
5. Нажмите **Add secret**

##### Шаг 5: Проверка прав доступа на сервере

Убедитесь, что пользователь имеет необходимые права:

```bash
# На сервере (замените USER и PROJECT_PATH на ваши значения)
sudo usermod -aG docker USER
# Проверьте права на директорию проекта
ls -la PROJECT_PATH
```

#### 7. Настройка прав доступа

```bash
# Убедитесь, что пользователь может выполнять docker команды
sudo usermod -aG docker $USER

# Настройте права на директорию проекта
chmod 755 ~/atom-dbro-backend
```

### Процесс автоматического деплоя

После настройки, при каждом push в ветку `main`:

1. **GitHub Actions запускает workflow** (`.github/workflows/deploy.yml`)
2. **Сборка Docker образа** с тегами:
   - `latest` - последняя версия
   - `sha-{commit_sha}` - версия конкретного коммита
3. **Авторизация в Docker registry** и push образа
4. **Подключение к серверу через SSH**
5. **Выполнение деплоя**:
   - Pull образа из registry
   - Остановка старого контейнера
   - Запуск нового контейнера через `docker-compose.prod.yml`
   - Автоматическое выполнение миграций БД
   - Health check приложения
6. **Уведомление о результате** в GitHub Actions

### Ручной деплой через скрипт

Если нужно выполнить деплой вручную, можно использовать скрипт `scripts/deploy.sh`:

```bash
# На сервере
cd ~/atom-dbro-backend

# Установите переменные окружения
export DOCKER_REGISTRY="registry.example.com"
export DOCKER_IMAGE_NAME="atom-dbro-backend"
export DOCKER_REGISTRY_USERNAME="your-username"
export DOCKER_REGISTRY_PASSWORD="your-password"

# Запустите скрипт деплоя
bash scripts/deploy.sh
```

### Troubleshooting CI/CD

#### Проблема: GitHub Actions не может подключиться к серверу

**Ошибка**: `Permission denied (publickey)`

**Решение**:

1. **Проверьте, что SSH ключ добавлен в GitHub Secrets**:
   - Убедитесь, что секрет `DEPLOY_SSH_KEY` существует
   - Проверьте, что ключ скопирован полностью (включая заголовки `-----BEGIN` и `-----END`)
   - Убедитесь, что нет лишних пробелов или переносов строк

2. **Проверьте публичный ключ на сервере**:
   ```bash
   # На сервере
   cat ~/.ssh/authorized_keys
   # Должен быть ваш публичный ключ (начинается с ssh-ed25519 или ssh-rsa)
   ```

3. **Проверьте права доступа на сервере**:
   ```bash
   # На сервере
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ls -la ~/.ssh
   ```

4. **Проверьте SSH доступ вручную**:
   ```bash
   # На локальном компьютере
   ssh -i ~/.ssh/github_actions_deploy -p PORT USER@HOST
   ```

5. **Проверьте firewall на сервере**:
   ```bash
   # На сервере
   sudo ufw status
   # Если SSH порт закрыт:
   sudo ufw allow PORT/tcp
   ```

6. **Проверьте SSH сервис**:
   ```bash
   # На сервере
   sudo systemctl status ssh
   # Или для некоторых систем:
   sudo systemctl status sshd
   ```

7. **Проверьте логи SSH на сервере**:
   ```bash
   # На сервере
   sudo tail -f /var/log/auth.log
   # Или для некоторых систем:
   sudo tail -f /var/log/secure
   ```

8. **Убедитесь, что ключ без пароля**:
   - Если ключ защищен паролем, GitHub Actions не сможет его использовать
   - Создайте новый ключ без пароля: `ssh-keygen -t ed25519 -N ""`

#### Проблема: Ошибка формата тега Docker образа

**Ошибка**: `invalid tag "***/***:latest": invalid reference format`

**Причины и решения**:

1. **DOCKER_REGISTRY_URL содержит протокол**:
   - ❌ Неправильно: `https://registry.example.com`
   - ✅ Правильно: `registry.example.com`
   - Решение: Удалите `http://` или `https://` из секрета

2. **DOCKER_REGISTRY_URL содержит слэш в конце**:
   - ❌ Неправильно: `registry.example.com/`
   - ✅ Правильно: `registry.example.com`
   - Решение: Удалите слэш в конце

3. **DOCKER_IMAGE_NAME содержит недопустимые символы**:
   - ❌ Неправильно: `Atom-Dbro-Backend`, `my app`, `app@v1`
   - ✅ Правильно: `atom-dbro-backend`, `my-app`, `app_v1.0`
   - Решение: Используйте только строчные буквы, цифры, дефисы, подчеркивания и точки

4. **Пробелы в значениях секретов**:
   - Пробелы в начале или конце значения могут вызвать ошибку
   - Решение: Убедитесь, что в секретах нет лишних пробелов

5. **Пустые значения**:
   - Если секреты не установлены, будет ошибка
   - Решение: Проверьте, что оба секрета (`DOCKER_REGISTRY_URL` и `DOCKER_IMAGE_NAME`) установлены

**Проверка**:
Workflow автоматически валидирует и очищает значения. Проверьте логи шага "Validate and sanitize environment variables" для деталей.

#### Проблема: Ошибка TLS сертификата при работе с registry

**Ошибка**: `x509: certificate signed by unknown authority` или `tls: failed to verify certificate`

**Причина**: Registry использует самоподписанный сертификат или IP-адрес вместо домена.

**Решение**:

1. **Если registry использует самоподписанный сертификат**:
   - Добавьте секрет `DOCKER_REGISTRY_INSECURE` со значением `true` в GitHub Secrets
   - Это позволит использовать insecure registry (без проверки сертификата)

2. **Если registry использует IP-адрес**:
   - Также установите `DOCKER_REGISTRY_INSECURE=true`
   - Или настройте DNS для использования доменного имени

3. **Настройка на сервере** (для деплоя):
   ```bash
   # На сервере создайте или отредактируйте /etc/docker/daemon.json
   sudo mkdir -p /etc/docker
   sudo tee /etc/docker/daemon.json <<EOF
   {
     "insecure-registries": ["${{ secrets.DOCKER_REGISTRY_URL }}"]
   }
   EOF
   sudo systemctl restart docker
   ```

4. **Проверка подключения**:
   ```bash
   # Локально (если insecure)
   docker login --insecure-registry ${{ secrets.DOCKER_REGISTRY_URL }}
   ```

**⚠️ ВНИМАНИЕ**: Использование insecure registry снижает безопасность. Используйте только в доверенных сетях или для тестирования.

#### Проблема: Ошибка авторизации в Docker registry

**Решение**:
1. Проверьте правильность `DOCKER_REGISTRY_URL`, `DOCKER_REGISTRY_USERNAME` и `DOCKER_REGISTRY_PASSWORD` в GitHub Secrets
2. Попробуйте авторизоваться вручную: `docker login registry.example.com`
3. Если используется insecure registry, добавьте флаг: `docker login --insecure-registry registry.example.com`

#### Проблема: Контейнер не запускается после деплоя

**Решение**:
1. Проверьте логи: `docker logs atom-dbro-app`
2. Убедитесь, что `.env` файл настроен правильно
3. Проверьте, что Docker сети созданы: `docker network ls`
4. Проверьте доступность образа: `docker images | grep atom-dbro-backend`

#### Проблема: Миграции не выполняются

**Решение**:
1. Проверьте подключение к БД: `docker exec atom-dbro-postgres psql -U postgres -d atom_dbro -c "SELECT 1;"`
2. Проверьте переменную `DATABASE_URL` в контейнере
3. Выполните миграции вручную: `docker exec atom-dbro-app npm run db:migrate`

### Мониторинг деплоев

Все деплои можно отслеживать в GitHub:
- Перейдите в репозиторий → **Actions**
- Выберите нужный workflow run
- Просмотрите логи каждого шага

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

