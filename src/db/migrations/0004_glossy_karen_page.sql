CREATE TABLE "payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"discount_id" text,
	"customer_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'succeeded' NOT NULL,
	"error_message" text,
	"error_code" text,
	"pre_tax_amount" numeric DEFAULT '0.00' NOT NULL,
	"tax" numeric DEFAULT '0.00' NOT NULL,
	"payment_link" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_method_type" text,
	"currency" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"subscription_id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"discount_id" text,
	"user_id" text NOT NULL,
	"username" text,
	"email" text,
	"quantity" integer DEFAULT 1,
	"subscription_status" text DEFAULT 'active' NOT NULL,
	"reason" text,
	"pre_tax_amount" numeric NOT NULL,
	"previous_billing_date" timestamp with time zone NOT NULL,
	"next_billing_date" timestamp with time zone,
	"cancel_at_next_billing_date" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"payment_frequency_interval" text DEFAULT 'Month' NOT NULL,
	"subscription_period_interval" text DEFAULT 'Year' NOT NULL,
	"subscription_period_count" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "amount_paid" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "amount_paid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("subscription_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;