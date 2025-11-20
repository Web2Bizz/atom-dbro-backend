CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "organization_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "quest_categories" (
	"quest_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"text" text NOT NULL,
	"photos" jsonb,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "quest_help_types" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "quest_help_types" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "city_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "help_types" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "organization_type_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "organization_type_id" integer;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "contacts" jsonb;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "regions" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_urls" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(20) DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_id" integer[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organisation_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "record_status" varchar(20) DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_categories" ADD CONSTRAINT "quest_categories_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_categories" ADD CONSTRAINT "quest_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_updates" ADD CONSTRAINT "quest_updates_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_organization_type_id_organization_types_id_fk" FOREIGN KEY ("organization_type_id") REFERENCES "public"."organization_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_organization_type_id_organization_types_id_fk" FOREIGN KEY ("organization_type_id") REFERENCES "public"."organization_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organizations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "organization_types";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "city_id";