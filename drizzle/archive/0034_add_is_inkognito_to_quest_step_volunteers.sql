-- Добавление поля is_inkognito в таблицу quest_step_volunteers
ALTER TABLE "quest_step_volunteers" ADD COLUMN IF NOT EXISTS "is_inkognito" BOOLEAN DEFAULT false;
--> statement-breakpoint

-- Установка значения false для существующих записей (если есть NULL значения)
UPDATE "quest_step_volunteers" SET "is_inkognito" = false WHERE "is_inkognito" IS NULL;
--> statement-breakpoint

-- Установка NOT NULL ограничения для is_inkognito
ALTER TABLE "quest_step_volunteers" ALTER COLUMN "is_inkognito" SET NOT NULL;
--> statement-breakpoint

-- Установка значения по умолчанию для новых записей
ALTER TABLE "quest_step_volunteers" ALTER COLUMN "is_inkognito" SET DEFAULT false;

