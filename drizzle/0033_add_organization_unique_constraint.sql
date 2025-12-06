-- Удаление дубликатов в organization_owners (оставляем только первую запись для каждого organization_id)
-- Это необходимо перед добавлением уникального ограничения на organization_id
DELETE FROM "organization_owners"
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM "organization_owners"
  GROUP BY "organization_id"
);
--> statement-breakpoint

-- Добавление уникального ограничения на organization_id (одна организация может быть указана только один раз)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_owners_organization_id_unique'
  ) THEN
    ALTER TABLE "organization_owners" 
    ADD CONSTRAINT "organization_owners_organization_id_unique" 
    UNIQUE ("organization_id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

