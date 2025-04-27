CREATE TABLE "note_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"user_id" text,
	"access_level" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"folder" text DEFAULT 'All',
	"title" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'Creating' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'Next' NOT NULL,
	"time_logged" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"name" text,
	"phone" text,
	"memories" text,
	"subscription_tier" text DEFAULT 'Basic' NOT NULL,
	"amount_paid" bigint DEFAULT 0,
	"subscription_start_date" timestamp DEFAULT now() NOT NULL,
	"subscription_end_date" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "note_access" ADD CONSTRAINT "note_access_note_id_notes_uid_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_access" ADD CONSTRAINT "note_access_owner_id_users_uid_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_access" ADD CONSTRAINT "note_access_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_users_uid_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_users_uid_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;