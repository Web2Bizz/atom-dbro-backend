ALTER TABLE "quest_step_volunteers"
  DROP CONSTRAINT IF EXISTS "quest_step_volunteers_quest_id_user_id_unique";

ALTER TABLE "quest_step_volunteers"
  ADD CONSTRAINT "quest_step_volunteers_quest_id_type_user_id_unique"
    UNIQUE ("quest_id", "type", "user_id");


