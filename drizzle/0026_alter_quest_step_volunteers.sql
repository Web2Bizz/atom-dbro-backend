ALTER TABLE "quest_step_volunteers"
  DROP CONSTRAINT IF EXISTS "quest_step_volunteers_quest_id_step_index_user_id_unique";

ALTER TABLE "quest_step_volunteers"
  DROP COLUMN IF EXISTS "step_index";

ALTER TABLE "quest_step_volunteers"
  ADD COLUMN IF NOT EXISTS "type" varchar(20) NOT NULL DEFAULT 'contributers';

ALTER TABLE "quest_step_volunteers"
  ADD COLUMN IF NOT EXISTS "contribute_value" integer NOT NULL DEFAULT 0;

ALTER TABLE "quest_step_volunteers"
  ADD CONSTRAINT "quest_step_volunteers_quest_id_type_user_id_unique"
    UNIQUE ("quest_id", "type", "user_id");

