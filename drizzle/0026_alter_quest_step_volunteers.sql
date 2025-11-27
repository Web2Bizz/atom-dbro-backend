DO $$
BEGIN
  -- Удаляем старый уникальный констрейнт, если он существует
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'quest_step_volunteers'
      AND constraint_name = 'quest_step_volunteers_quest_id_step_index_user_id_unique'
  ) THEN
    ALTER TABLE "quest_step_volunteers"
      DROP CONSTRAINT "quest_step_volunteers_quest_id_step_index_user_id_unique";
  END IF;

  -- Удаляем колонку step_index, если она ещё есть
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quest_step_volunteers'
      AND column_name = 'step_index'
  ) THEN
    ALTER TABLE "quest_step_volunteers"
      DROP COLUMN "step_index";
  END IF;

  -- Добавляем колонку type, если её ещё нет
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quest_step_volunteers'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE "quest_step_volunteers"
      ADD COLUMN "type" varchar(20) NOT NULL DEFAULT 'contributers';
  END IF;

  -- Добавляем колонку contribute_value, если её ещё нет
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'quest_step_volunteers'
      AND column_name = 'contribute_value'
  ) THEN
    ALTER TABLE "quest_step_volunteers"
      ADD COLUMN "contribute_value" integer NOT NULL DEFAULT 0;
  END IF;

  -- Добавляем новый уникальный констрейнт по (quest_id, type, user_id), если его ещё нет
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'quest_step_volunteers'
      AND constraint_name = 'quest_step_volunteers_quest_id_type_user_id_unique'
  ) THEN
    ALTER TABLE "quest_step_volunteers"
      ADD CONSTRAINT "quest_step_volunteers_quest_id_type_user_id_unique"
        UNIQUE ("quest_id", "type", "user_id");
  END IF;
END;
$$;

