-- Миграция данных из users.organisation_id в organization_owners
-- Добавляем записи для пользователей, у которых есть organisation_id, но нет записи в organization_owners
INSERT INTO "organization_owners" ("organization_id", "user_id")
SELECT u."organisation_id", u."id"
FROM "users" u
WHERE u."organisation_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "organization_owners" oo
    WHERE oo."user_id" = u."id"
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Удаление дубликатов в organization_owners (оставляем только первую запись для каждого user_id)
-- Это необходимо перед добавлением уникального ограничения на user_id
DELETE FROM "organization_owners"
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM "organization_owners"
  GROUP BY "user_id"
);
--> statement-breakpoint

-- Добавление уникального ограничения на user_id (один пользователь - одна организация)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organization_owners_user_id_unique'
  ) THEN
    ALTER TABLE "organization_owners" 
    ADD CONSTRAINT "organization_owners_user_id_unique" 
    UNIQUE ("user_id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Удаление внешнего ключа users_organisation_id_organizations_id_fk
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_organisation_id_organizations_id_fk'
  ) THEN
    ALTER TABLE "users" 
    DROP CONSTRAINT "users_organisation_id_organizations_id_fk";
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint

-- Удаление колонки organisation_id из таблицы users
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE "users" 
    DROP COLUMN "organisation_id";
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

