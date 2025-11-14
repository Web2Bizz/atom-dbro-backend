ALTER TABLE "organizations" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "mission" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "goals" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "needs" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contacts" jsonb;