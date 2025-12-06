-- Удаление ограничения уникальности quest_step_volunteers_quest_id_type_user_id_unique
-- Теперь один и тот же пользователь может делать вклад сколько угодно раз в один и тот же этап квеста
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_step_volunteers_quest_id_type_user_id_unique'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    DROP CONSTRAINT "quest_step_volunteers_quest_id_type_user_id_unique";
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

