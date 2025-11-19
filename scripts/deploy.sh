#!/bin/bash

# Скрипт автоматического деплоя atom-dbro-backend
# Выполняется на сервере через SSH из GitHub Actions

set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Переменные окружения (должны быть установлены перед запуском)
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME:-"atom-dbro-backend"}
DOCKER_REGISTRY_USERNAME=${DOCKER_REGISTRY_USERNAME:-""}
DOCKER_REGISTRY_PASSWORD=${DOCKER_REGISTRY_PASSWORD:-""}
DOCKER_REGISTRY_INSECURE=${DOCKER_REGISTRY_INSECURE:-"false"}
PROJECT_DIR=${PROJECT_DIR:-"$HOME/atom-dbro-backend"}

log "🚀 Starting deployment process..."

# Проверка наличия необходимых переменных
if [ -z "$DOCKER_REGISTRY" ] || [ -z "$DOCKER_REGISTRY_USERNAME" ] || [ -z "$DOCKER_REGISTRY_PASSWORD" ]; then
    error "DOCKER_REGISTRY, DOCKER_REGISTRY_USERNAME and DOCKER_REGISTRY_PASSWORD must be set"
    exit 1
fi

# Переход в директорию проекта
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
log "📁 Working directory: $(pwd)"

# Проверка наличия docker-compose.prod.yml
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml not found in project directory"
    exit 1
fi

# Авторизация в Docker registry
log "🔐 Logging in to Docker registry: $DOCKER_REGISTRY"

# Настройка insecure registry, если необходимо
if [ "$DOCKER_REGISTRY_INSECURE" = "true" ]; then
    warning "Using insecure registry (TLS verification disabled)"
    # Проверяем, настроен ли insecure registry в Docker daemon
    if ! docker info 2>/dev/null | grep -q "Insecure Registries:.*$DOCKER_REGISTRY"; then
        warning "Registry $DOCKER_REGISTRY needs to be added to Docker daemon insecure-registries"
        warning "Please add it to /etc/docker/daemon.json and restart Docker daemon:"
        warning '  {"insecure-registries": ["'$DOCKER_REGISTRY'"]}'
        warning "Attempting login anyway (may fail if registry not configured)..."
    fi
fi

# Выполняем вход в registry
# Docker daemon автоматически использует insecure режим, если registry настроен в daemon.json
echo "$DOCKER_REGISTRY_PASSWORD" | docker login "$DOCKER_REGISTRY" -u "$DOCKER_REGISTRY_USERNAME" --password-stdin || {
    if [ "$DOCKER_REGISTRY_INSECURE" = "true" ]; then
        error "Failed to login to insecure registry. Please ensure:"
        error "1. Registry is added to /etc/docker/daemon.json as insecure-registry"
        error "2. Docker daemon has been restarted"
        error "3. Registry URL is correct: $DOCKER_REGISTRY"
        exit 1
    else
        error "Failed to login to registry. Check credentials and network connectivity."
        exit 1
    fi
}

# Pull latest image
log "📥 Pulling latest image from registry..."
IMAGE_TAG="${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:latest"
docker pull "$IMAGE_TAG" || {
    warning "Failed to pull image, will try to use cached version"
}

# Создание необходимых сетей Docker (если не существуют)
log "🌐 Ensuring Docker networks exist..."
docker network create atom-external-network 2>/dev/null || log "Network atom-external-network already exists"
docker network create atom-internal-network 2>/dev/null || log "Network atom-internal-network already exists"

# Остановка и удаление старых контейнеров
log "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down || warning "No running containers to stop"

# Запуск новых контейнеров
log "▶️ Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# Ожидание готовности контейнера
log "⏳ Waiting for application container to be ready..."
sleep 10

# Проверка, что контейнер запущен
if ! docker ps | grep -q "atom-dbro-app"; then
    error "Application container failed to start"
    log "📋 Container logs:"
    docker logs atom-dbro-app --tail 50 || true
    exit 1
fi

# Выполнение миграций базы данных
log "🗄️ Running database migrations..."
MAX_MIGRATION_ATTEMPTS=3
MIGRATION_ATTEMPT=0

while [ $MIGRATION_ATTEMPT -lt $MAX_MIGRATION_ATTEMPTS ]; do
    if docker exec atom-dbro-app npm run db:migrate; then
        log "✅ Database migrations completed successfully"
        break
    else
        MIGRATION_ATTEMPT=$((MIGRATION_ATTEMPT + 1))
        if [ $MIGRATION_ATTEMPT -lt $MAX_MIGRATION_ATTEMPTS ]; then
            warning "Migration attempt $MIGRATION_ATTEMPT failed, retrying in 5 seconds..."
            sleep 5
        else
            error "Database migrations failed after $MAX_MIGRATION_ATTEMPTS attempts"
            log "📋 Container logs:"
            docker logs atom-dbro-app --tail 50
            exit 1
        fi
    fi
done

# Health check приложения
log "🏥 Performing health check..."
MAX_HEALTH_CHECK_ATTEMPTS=30
HEALTH_CHECK_ATTEMPT=0
HEALTH_CHECK_SUCCESS=false

while [ $HEALTH_CHECK_ATTEMPT -lt $MAX_HEALTH_CHECK_ATTEMPTS ]; do
    if curl -f http://localhost:3000/api > /dev/null 2>&1; then
        HEALTH_CHECK_SUCCESS=true
        break
    fi
    HEALTH_CHECK_ATTEMPT=$((HEALTH_CHECK_ATTEMPT + 1))
    if [ $HEALTH_CHECK_ATTEMPT -lt $MAX_HEALTH_CHECK_ATTEMPTS ]; then
        log "Health check attempt $HEALTH_CHECK_ATTEMPT/$MAX_HEALTH_CHECK_ATTEMPTS failed, retrying in 2 seconds..."
        sleep 2
    fi
done

if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
    log "✅ Application is healthy and responding!"
    log "🌐 Application is available at: http://localhost:3000"
    log "📚 Swagger docs: http://localhost:3000/api"
else
    error "Health check failed after $MAX_HEALTH_CHECK_ATTEMPTS attempts"
    log "📋 Container logs:"
    docker logs atom-dbro-app --tail 100
    log "📋 Container status:"
    docker ps -a | grep atom-dbro-app || true
    exit 1
fi

# Очистка старых образов (опционально, для экономии места)
log "🧹 Cleaning up old Docker images..."
docker image prune -f || warning "Failed to clean up old images"

log "✅ Deployment completed successfully!"

