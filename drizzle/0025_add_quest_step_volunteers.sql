CREATE TABLE "quest_step_volunteers" (
	"id" serial PRIMARY KEY NOT NULL,
	"quest_id" integer NOT NULL,
	"step_index" integer NOT NULL,
	"user_id" integer NOT NULL,
	"record_status" varchar(20) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quest_step_volunteers_quest_id_step_index_user_id_unique" UNIQUE("quest_id","step_index","user_id")
);
--> statement-breakpoint
ALTER TABLE "quest_step_volunteers" ADD CONSTRAINT "quest_step_volunteers_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_step_volunteers" ADD CONSTRAINT "quest_step_volunteers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;