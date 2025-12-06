FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей для лучшего кэширования
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./
COPY drizzle.config.ts ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Копируем исходный код
COPY src ./src
COPY drizzle ./drizzle

# Собираем приложение
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# Устанавливаем build зависимости для native модулей (bcrypt и т.д.)
RUN apk add --no-cache python3 make g++

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем только production зависимости
# drizzle-kit нужен для миграций в production (используется в deploy workflow)
RUN npm ci --omit=dev && \
    apk del python3 make g++

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist

# Копируем файлы, необходимые для drizzle-kit migrate
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src/database/schema.ts ./src/database/schema.ts
COPY --from=builder /app/drizzle ./drizzle

# Создаем непривилегированного пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Используем node напрямую для запуска скомпилированного приложения
CMD ["node", "dist/main"]

