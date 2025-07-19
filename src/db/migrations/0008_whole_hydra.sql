ALTER TABLE "payments" ALTER COLUMN "pre_tax_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "tax" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "payment_method" DROP NOT NULL;