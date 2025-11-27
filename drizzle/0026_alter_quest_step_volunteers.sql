-- Удаление старого констрейнта
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_step_volunteers_quest_id_step_index_user_id_unique'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    DROP CONSTRAINT "quest_step_volunteers_quest_id_step_index_user_id_unique";
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint

-- Удаление колонки step_index
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' AND column_name = 'step_index'
  ) THEN
    ALTER TABLE "quest_step_volunteers" DROP COLUMN "step_index";
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;
--> statement-breakpoint

-- Добавление колонки type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' AND column_name = 'type'
  ) THEN
    -- Сначала добавляем колонку как nullable
    ALTER TABLE "quest_step_volunteers" ADD COLUMN "type" varchar(20);
    -- Заполняем существующие строки значением по умолчанию
    UPDATE "quest_step_volunteers" SET "type" = 'contributers' WHERE "type" IS NULL;
    -- Теперь делаем NOT NULL
    ALTER TABLE "quest_step_volunteers" ALTER COLUMN "type" SET NOT NULL;
    ALTER TABLE "quest_step_volunteers" ALTER COLUMN "type" SET DEFAULT 'contributers';
  END IF;
END $$;
--> statement-breakpoint

-- Добавление колонки contribute_value
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_step_volunteers' AND column_name = 'contribute_value'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    ADD COLUMN "contribute_value" integer NOT NULL DEFAULT 0;
  END IF;
END $$;
--> statement-breakpoint

-- Добавление уникального констрейнта
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_step_volunteers_quest_id_type_user_id_unique'
  ) THEN
    -- Проверяем, нет ли дубликатов перед созданием констрейнта
    IF NOT EXISTS (
      SELECT quest_id, type, user_id, COUNT(*) as cnt
      FROM quest_step_volunteers
      GROUP BY quest_id, type, user_id
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE "quest_step_volunteers"
      ADD CONSTRAINT "quest_step_volunteers_quest_id_type_user_id_unique"
        UNIQUE ("quest_id", "type", "user_id");
    ELSE
      RAISE NOTICE 'Не удалось добавить уникальный констрейнт: найдены дубликаты в quest_step_volunteers';
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN unique_violation THEN
    RAISE NOTICE 'Не удалось добавить уникальный констрейнт из-за дубликатов';
END $$;
