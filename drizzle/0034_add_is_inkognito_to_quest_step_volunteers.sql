-- Добавление поля is_inkognito в таблицу quest_step_volunteers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' AND column_name = 'is_inkognito'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    ADD COLUMN "is_inkognito" BOOLEAN DEFAULT false;
  END IF;
END $$;
--> statement-breakpoint

-- Установка значения false для существующих записей
DO $$ BEGIN
  UPDATE "quest_step_volunteers" 
  SET "is_inkognito" = false 
  WHERE "is_inkognito" IS NULL;
END $$;
--> statement-breakpoint

-- Установка NOT NULL ограничения для is_inkognito
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' 
    AND column_name = 'is_inkognito' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    ALTER COLUMN "is_inkognito" SET NOT NULL;
  END IF;
END $$;
--> statement-breakpoint

-- Установка значения по умолчанию для новых записей
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' 
    AND column_name = 'is_inkognito'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    ALTER COLUMN "is_inkognito" SET DEFAULT false;
  END IF;
END $$;

