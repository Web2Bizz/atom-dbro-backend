CREATE TABLE IF NOT EXISTS "quest_contributers" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_contributers_quest_id_quests_id_fk'
  ) THEN
    ALTER TABLE "quest_contributers" ADD CONSTRAINT "quest_contributers_quest_id_quests_id_fk" 
    FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_contributers_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "quest_contributers" ADD CONSTRAINT "quest_contributers_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "quest_contributers_quest_id_user_id_unique" ON "quest_contributers" ("quest_id","user_id") WHERE "record_status" = 'CREATED';
--> statement-breakpoint
-- Миграция данных: перенос записей с type = 'contributers' из quest_step_volunteers в quest_contributers
INSERT INTO "quest_contributers" ("quest_id", "user_id", "record_status", "created_at", "updated_at")
SELECT DISTINCT ON ("quest_id", "user_id")
	"quest_id",
	"user_id",
	"record_status",
	"created_at",
	"updated_at"
FROM "quest_step_volunteers"
WHERE "type" = 'contributers'
	AND "record_status" != 'DELETED'
	AND NOT EXISTS (
		SELECT 1 FROM "quest_contributers" qc
		WHERE qc."quest_id" = "quest_step_volunteers"."quest_id"
			AND qc."user_id" = "quest_step_volunteers"."user_id"
			AND qc."record_status" = 'CREATED'
	)
ORDER BY "quest_id", "user_id", "created_at" ASC;
--> statement-breakpoint
-- Перенос удаленных записей (record_status = 'DELETED')
INSERT INTO "quest_contributers" ("quest_id", "user_id", "record_status", "created_at", "updated_at")
SELECT DISTINCT ON ("quest_id", "user_id")
	"quest_id",
	"user_id",
	"record_status",
	"created_at",
	"updated_at"
FROM "quest_step_volunteers"
WHERE "type" = 'contributers'
	AND "record_status" = 'DELETED'
	AND NOT EXISTS (
		SELECT 1 FROM "quest_contributers" qc
		WHERE qc."quest_id" = "quest_step_volunteers"."quest_id"
			AND qc."user_id" = "quest_step_volunteers"."user_id"
	)
ORDER BY "quest_id", "user_id", "created_at" ASC;
--> statement-breakpoint
-- Удаление записей с type = 'contributers' из quest_step_volunteers
DELETE FROM "quest_step_volunteers" WHERE "type" = 'contributers';
--> statement-breakpoint
-- Удаление записей с type = 'no_required' из quest_step_volunteers (перед добавлением CHECK ограничения)
DELETE FROM "quest_step_volunteers" WHERE "type" = 'no_required';
--> statement-breakpoint
-- Удаление этапов с типами 'contributers' и 'no_required' из JSON поля steps в таблице quests
DO $$
DECLARE
    quest_record RECORD;
    updated_steps JSONB;
    step_item JSONB;
    step_index INT;
    steps_length INT;
BEGIN
    FOR quest_record IN 
        SELECT id, steps 
        FROM quests 
        WHERE steps IS NOT NULL AND jsonb_typeof(steps) = 'array'
    LOOP
        updated_steps := quest_record.steps;
        steps_length := jsonb_array_length(updated_steps);
        
        FOR step_index IN REVERSE steps_length - 1..0 LOOP
            step_item := updated_steps->step_index;
            
            IF step_item->>'type' IN ('contributers', 'no_required') THEN
                updated_steps := updated_steps - step_index;
            END IF;
        END LOOP;
        
        UPDATE quests 
        SET steps = updated_steps, updated_at = NOW()
        WHERE id = quest_record.id;
    END LOOP;
END $$;
--> statement-breakpoint
-- Добавление CHECK ограничения для типа в quest_step_volunteers (только finance и material)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quest_step_volunteers_type_check'
  ) THEN
    ALTER TABLE "quest_step_volunteers" 
    ADD CONSTRAINT "quest_step_volunteers_type_check" 
    CHECK ("type" IN ('finance', 'material'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

