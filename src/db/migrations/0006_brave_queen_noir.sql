ALTER TABLE "payments" ALTER COLUMN "payment_link" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id");