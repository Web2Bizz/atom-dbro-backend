-- Удаление дубликатов в таблице organization_owners (оставляем только первую запись для каждой пары)
DELETE FROM "organization_owners"
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM "organization_owners"
  GROUP BY "organization_id", "user_id"
);
--> statement-breakpoint
-- Добавление уникального ограничения на пару (organization_id, user_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_owners_organization_id_user_id_unique'
  ) THEN
    ALTER TABLE "organization_owners" 
    ADD CONSTRAINT "organization_owners_organization_id_user_id_unique" 
    UNIQUE ("organization_id", "user_id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

