CREATE TABLE "user_usage_metrics" (
	"userId" text PRIMARY KEY NOT NULL,
	"subscription_tier" text DEFAULT 'Basic' NOT NULL,
	"total_embedded_tokens" integer DEFAULT 0 NOT NULL,
	"embedded_tokens_limit" integer DEFAULT 10000 NOT NULL,
	"total_chat_tokens" integer DEFAULT 0 NOT NULL,
	"today_chat_tokens" integer DEFAULT 0 NOT NULL,
	"daily_chat_tokens_limit" integer DEFAULT 10 NOT NULL,
	"total_voice_tokens" integer DEFAULT 0 NOT NULL,
	"today_voice_tokens" integer DEFAULT 0 NOT NULL,
	"daily_voice_tokens_limit" integer DEFAULT 700 NOT NULL,
	"total_internet_calls" integer DEFAULT 0 NOT NULL,
	"today_internet_calls" integer DEFAULT 0 NOT NULL,
	"daily_internet_calls_limit" integer DEFAULT 10 NOT NULL,
	"total_semantic_queries" integer DEFAULT 0 NOT NULL,
	"today_semantic_queries" integer DEFAULT 0 NOT NULL,
	"daily_semantic_queries_limit" integer DEFAULT 10 NOT NULL,
	"lastResetAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_usage_metrics" ADD CONSTRAINT "user_usage_metrics_userId_users_uid_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("uid") ON DELETE cascade ON UPDATE no action;