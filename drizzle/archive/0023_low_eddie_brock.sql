-- Создание таблицы organization_updates
CREATE TABLE IF NOT EXISTS "organization_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"text" text NOT NULL,
	"photos" jsonb,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Добавление внешнего ключа для organization_updates
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'organization_updates_organization_id_organizations_id_fk'
	) THEN
		ALTER TABLE "organization_updates" ADD CONSTRAINT "organization_updates_organization_id_organizations_id_fk" 
		FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;